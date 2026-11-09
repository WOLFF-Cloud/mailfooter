/**
 * MailFooter - Lightning-Fast Dual-Card Login & Directory Engine
 * Powered by client memory indexing, tag tokenization, and live SQLite database lookups.
 */

(function () {
  'use strict';

  // Determine API base domain
  const API_DOMAIN = window.location.origin + window.location.pathname
    .replace(/\/(index|login|landing|landing-index|app|admin|super-admin|register)(\.html)?$/, '')
    .replace(/\/$/, '');

  // -------------------------------------------------------------
  // In-Memory Directory Store & String Indexer
  // -------------------------------------------------------------
  const DEFAULT_DIRECTORY_SEED = [
    { name: 'Sarah Jenkins', email: 'sarah.jenkins@os-holdings.co.za', title: 'Managing Director', department: 'Executive' },
    { name: 'Marcus Vance', email: 'marcus.vance@os-holdings.co.za', title: 'Chief Technology Officer', department: 'Engineering' },
    { name: 'Daniel Mercer', email: 'daniel.mercer@apexglobal.io', title: 'VP of Global Operations', department: 'Operations' },
    { name: 'Claire Standish', email: 'claire@nexus-financial.com', title: 'Senior Financial Analyst', department: 'Finance' }
  ];

  const DirectoryMemory = {
    records: [],
    tagIndex: new Map(), // string tag -> array of user objects
    loaded: false,

    init() {
      // 0. Seed with baseline directory so lookups are 100% reliable even offline or via file://
      this.buildIndex(DEFAULT_DIRECTORY_SEED);

      // 1. Load from local cache for instant 0ms access
      try {
        const cached = localStorage.getItem('mailfooter_directory_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.buildIndex(parsed);
          }
        }
      } catch (e) {
        console.warn('Could not read directory cache', e);
      }

      // 2. Fetch fresh directory from server in background
      fetch(`${API_DOMAIN}/api/users.php?list=1`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.success && Array.isArray(data.users)) {
            this.buildIndex(data.users);
            try {
              localStorage.setItem('mailfooter_directory_cache', JSON.stringify(data.users));
            } catch (e) {}
          }
        })
        .catch(() => {
          // If server list endpoint is not reachable, fallback to live queries
        });
    },

    buildIndex(userList) {
      this.records = userList;
      this.tagIndex.clear();

      userList.forEach(u => {
        if (!u) return;
        const tokens = new Set();

        // Index full email and username part
        if (u.email) {
          const lowerEmail = u.email.toLowerCase().trim();
          tokens.add(lowerEmail);
          const parts = lowerEmail.split('@');
          if (parts[0]) tokens.add(parts[0]);
          parts[0].split(/[._-]/).forEach(t => { if (t) tokens.add(t); });
        }

        // Index full name and words
        if (u.name) {
          const lowerName = u.name.toLowerCase().trim();
          tokens.add(lowerName);
          lowerName.split(/\s+/).forEach(w => { if (w) tokens.add(w); });
        }

        tokens.forEach(token => {
          if (!this.tagIndex.has(token)) {
            this.tagIndex.set(token, []);
          }
          this.tagIndex.get(token).push(u);
        });
      });
      this.loaded = true;
    },

    // Fast memory search
    search(query) {
      if (!query) return [];
      const clean = query.toLowerCase().trim();

      // Exact match
      if (this.tagIndex.has(clean)) {
        return this.tagIndex.get(clean);
      }

      // Fuzzy string / tag search
      const results = [];
      const seenEmails = new Set();

      for (const u of this.records) {
        const nameMatch = u.name && u.name.toLowerCase().includes(clean);
        const emailMatch = u.email && u.email.toLowerCase().includes(clean);

        if ((nameMatch || emailMatch) && !seenEmails.has(u.email)) {
          seenEmails.add(u.email);
          results.push(u);
          if (results.length >= 6) break;
        }
      }
      return results;
    }
  };

  DirectoryMemory.init();

  // -------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    // Staff Card
    const staffForm = document.getElementById('staffLoginForm');
    const staffInput = document.getElementById('staffSearchInput');
    const staffDropdown = document.getElementById('staffDirectoryDropdown');
    const staffBtn = document.getElementById('staffSubmitBtn');
    const staffFeedback = document.getElementById('staffFeedback');
    const notFoundBox = document.getElementById('notFoundBox');
    const notFoundQueryText = document.getElementById('notFoundQueryText');
    const btnCreateSig = document.getElementById('btnCreateSignature');

    // Admin Card
    const adminForm = document.getElementById('adminLoginForm');
    const adminEmail = document.getElementById('adminEmail');
    const adminPassword = document.getElementById('adminPassword');
    const adminBtn = document.getElementById('adminSubmitBtn');
    const adminFeedback = document.getElementById('adminFeedback');

    // Helper: Escape HTML
    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // -----------------------------------------------------------
    // Staff Input Live Suggestions & Tag Matching
    // -----------------------------------------------------------
    let debounceTimer = null;

    if (staffInput && staffDropdown) {
      staffInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = staffInput.value.trim();

        if (notFoundBox) notFoundBox.style.display = 'none';
        if (staffFeedback) staffFeedback.style.display = 'none';

        if (!q || q.length < 2) {
          staffDropdown.classList.remove('show');
          staffDropdown.innerHTML = '';
          return;
        }

        debounceTimer = setTimeout(() => {
          const matches = DirectoryMemory.search(q);
          if (matches && matches.length > 0) {
            staffDropdown.innerHTML = matches.map(u => `
              <div class="dropdown-item" data-email="${escapeHtml(u.email)}" data-name="${escapeHtml(u.name || '')}">
                <div class="item-name">${escapeHtml(u.name || u.email)}</div>
                <div class="item-meta">${escapeHtml(u.email)}${u.title ? ' &bull; ' + escapeHtml(u.title) : ''}</div>
              </div>
            `).join('');
            staffDropdown.classList.add('show');
          } else {
            staffDropdown.classList.remove('show');
            staffDropdown.innerHTML = '';
          }
        }, 150);
      });

      // Handle item selection from dropdown
      staffDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.dropdown-item');
        if (item) {
          const email = item.getAttribute('data-email');
          const name = item.getAttribute('data-name');
          staffInput.value = name || email;
          staffDropdown.classList.remove('show');
          executeStaffLookup(email);
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!staffInput.contains(e.target) && !staffDropdown.contains(e.target)) {
          staffDropdown.classList.remove('show');
        }
      });
    }

    // -----------------------------------------------------------
    // Staff Lookup Execution
    // -----------------------------------------------------------
    function executeStaffLookup(explicitQuery) {
      const q = (explicitQuery || staffInput.value || '').trim();
      if (!q) {
        if (staffFeedback) {
          staffFeedback.className = 'feedback-box feedback-error';
          staffFeedback.textContent = 'Please enter your name or corporate email address.';
          staffFeedback.style.display = 'block';
        }
        return;
      }

      if (staffDropdown) staffDropdown.classList.remove('show');
      if (staffFeedback) staffFeedback.style.display = 'none';
      if (notFoundBox) notFoundBox.style.display = 'none';

      const originalBtnText = staffBtn.innerHTML;
      staffBtn.disabled = true;
      staffBtn.innerHTML = `
        <svg class="spin" style="animation: spin 0.8s linear infinite; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg> Searching Directory...
      `;

      // 1. Check local memory first for instantaneous 0ms resolution
      const memMatches = DirectoryMemory.search(q);
      const isExactEmail = q.includes('@');
      let exactMem = null;

      if (memMatches.length > 0) {
        exactMem = memMatches.find(u => 
          (u.email && u.email.toLowerCase() === q.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === q.toLowerCase())
        ) || memMatches[0];
      }

      if (exactMem && exactMem.email) {
        // Instant success from memory!
        handleUserFound(exactMem);
        return;
      }

      // 2. Query Live Database via API
      fetch(`${API_DOMAIN}/api/users.php?query=${encodeURIComponent(q)}`)
        .then(res => {
          if (!res.ok && res.status !== 404) {
            throw new Error('Database server error');
          }
          return res.json();
        })
        .then(data => {
          staffBtn.disabled = false;
          staffBtn.innerHTML = originalBtnText;

          if (data && data.success && data.user) {
            handleUserFound(data.user);
          } else {
            handleUserNotFound(q);
          }
        })
        .catch(err => {
          staffBtn.disabled = false;
          staffBtn.innerHTML = originalBtnText;
          // Fallback check
          handleUserNotFound(q);
        });
    }

    function handleUserFound(user) {
      if (staffFeedback) {
        staffFeedback.className = 'feedback-box feedback-success';
        staffFeedback.innerHTML = `
          <strong>✓ Welcome back, ${escapeHtml(user.name || 'Staff Member')}!</strong><br>
          <span style="font-size: 11.5px; opacity: 0.9;">Loading your signature profile...</span>
        `;
        staffFeedback.style.display = 'block';
      }

      // Store active user in session and redirect to signature app
      sessionStorage.setItem('current_user_email', user.email);
      if (user.name) sessionStorage.setItem('current_user_name', user.name);

      setTimeout(() => {
        window.location.href = `app.html?email=${encodeURIComponent(user.email)}`;
      }, 600);
    }

    function handleUserNotFound(queryStr) {
      if (notFoundQueryText) {
        notFoundQueryText.textContent = `"${queryStr}"`;
      }
      if (notFoundBox) {
        notFoundBox.style.display = 'block';
      }

      // Setup button to create new email signature prefilled
      if (btnCreateSig) {
        btnCreateSig.onclick = (e) => {
          e.preventDefault();
          const isEmail = queryStr.includes('@');
          const nameParam = isEmail ? '' : queryStr;
          const emailParam = isEmail ? queryStr : '';
          const targetUrl = `app.html?create=1&name=${encodeURIComponent(nameParam)}&email=${encodeURIComponent(emailParam)}`;
          window.location.href = targetUrl;
        };
      }
    }

    if (staffForm) {
      staffForm.addEventListener('submit', (e) => {
        e.preventDefault();
        executeStaffLookup();
      });
    }

    // -----------------------------------------------------------
    // Administrator Card Login
    // -----------------------------------------------------------
    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminFeedback) adminFeedback.style.display = 'none';

        const email = adminEmail.value.trim();
        const password = adminPassword.value.trim();

        if (!email || !password) {
          if (adminFeedback) {
            adminFeedback.className = 'feedback-box feedback-error';
            adminFeedback.textContent = 'Please enter both your email address and password.';
            adminFeedback.style.display = 'block';
          }
          return;
        }

        const originalBtnText = adminBtn.innerHTML;
        adminBtn.disabled = true;
        adminBtn.innerHTML = `
          <svg class="spin" style="animation: spin 0.8s linear infinite; width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg> Authenticating...
        `;

        fetch(`${API_DOMAIN}/api/login.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        })
          .then(res => {
            if (!res.ok) {
              return res.json().then(err => { throw new Error(err.error || 'Invalid credentials'); });
            }
            return res.json();
          })
          .then(data => {
            adminBtn.disabled = false;
            adminBtn.innerHTML = originalBtnText;

            if (data && data.success) {
              if (adminFeedback) {
                adminFeedback.className = 'feedback-box feedback-success';
                adminFeedback.textContent = '✓ Authentication successful. Redirecting to dashboard...';
                adminFeedback.style.display = 'block';
              }

              if (data.role === 'superadmin') {
                sessionStorage.setItem('superadmin_logged_in', 'true');
                setTimeout(() => { window.location.href = 'super-admin.html'; }, 500);
              } else {
                sessionStorage.setItem('admin_domain', data.domain || '');
                sessionStorage.setItem('admin_email', data.email || email);
                if (data.name) sessionStorage.setItem('admin_name', data.name);
                if (data.company_name) sessionStorage.setItem('admin_company_name', data.company_name);
                setTimeout(() => { window.location.href = 'admin.html'; }, 500);
              }
            } else {
              throw new Error(data.error || 'Invalid administrator email or password.');
            }
          })
          .catch(err => {
            adminBtn.disabled = false;
            adminBtn.innerHTML = originalBtnText;
            if (adminFeedback) {
              adminFeedback.className = 'feedback-box feedback-error';
              adminFeedback.textContent = err.message || 'Authentication failed. Please check your credentials.';
              adminFeedback.style.display = 'block';
            }
          });
      });
    }

    // Auto-fill or focus based on query params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'admin' && adminEmail) {
      adminEmail.focus();
    } else if (urlParams.has('email') && staffInput) {
      staffInput.value = urlParams.get('email');
      executeStaffLookup(urlParams.get('email'));
    } else if (staffInput) {
      staffInput.focus();
    }
  });
})();
