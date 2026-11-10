/* ==========================================================================
   Mailfooter Light Version - Enterprise Production Portal Engine
   ========================================================================== */

(function () {
  'use strict';

  // Base URL calculation for absolute assets
  const PUBLIC_PRODUCTION_BASE = 'https://os-holdings.co.za/mailfooter/';
  const BASE_URL = (function() {
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol;
      const origin = window.location.origin;
      const host = window.location.hostname;
      if (proto === 'file:' || host === 'localhost' || host === '127.0.0.1' || !origin || origin === 'null' || !origin.startsWith('http')) {
        return PUBLIC_PRODUCTION_BASE;
      }
      return origin + window.location.pathname.replace(/\/(light|index|app|admin|super-admin|register)(\.html)?$/, '').replace(/\/$/, '') + '/';
    }
    return PUBLIC_PRODUCTION_BASE;
  })();

  // Application State (Clean server-backed state, no local demo fallbacks)
  let staffList = [];
  let currentTab = 'overview';
  let currentOverviewSubtab = 'all'; // 'all', 'managers', 'staff'
  let activeEditingEmployee = null;
  let saveDebounceTimer = null;

  // DOM Ready Initialization
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Immediately hydrate from localStorage cache if available
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          staffList = sanitizeStaffData(parsed);
        }
      } catch (err) {}
    }

    initTabNavigation();
    initOverviewTable();
    initBulkAddTab();
    initInstallationTab();
    initBackupsManager();
    initAddStaffModal();
    updateHeaderMetrics();
    initHeaderLogoChanger();

    const yearEl = document.getElementById('appCurrentYear');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // 2. Load fresh server dataset
    await loadDataStore();
  });

  const STORAGE_KEY = 'osh_mailfooter_light_staff_v6';
  const BACKUP_STORAGE_KEY = 'osh_mailfooter_backups_v1';

  function sanitizeStaffData(list) {
    if (!Array.isArray(list)) return [];
    return list.map(user => {
      let primary = user.primaryColor;
      let secondary = user.secondaryColor;
      if (!primary || primary === '#1677ff' || primary === '#1890ff') primary = '#0d4b8e';
      if (!secondary || secondary === '#13c2c2' || secondary === '#52c41a') secondary = '#f18a22';
      
      let company = user.company;
      if (!company || company === 'Wolff Technologies') company = 'OS Holdings';
      
      let email = user.email || '';
      if (email.includes('@wolff-tech.com')) {
        email = email.replace('@wolff-tech.com', '@os-holdings.co.za');
      }

      const fName = user.firstName || (user.name ? user.name.split(' ')[0] : 'Employee');
      const lName = user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : '');

      return {
        id: user.id || ('osh-' + Date.now() + '-' + Math.floor(Math.random() * 1000)),
        firstName: fName,
        lastName: lName,
        role: user.role || 'Staff',
        title: user.title || user.jobTitle || 'Team Member',
        department: user.department || user.dept || 'General',
        email: email,
        phone: user.phone || user.mobile || '+27 (0) 11 463 1000',
        mobile: user.mobile || user.phone || '+27 (0) 11 463 1000',
        company: company,
        location: user.location || 'Sandton, Johannesburg',
        primaryColor: primary,
        secondaryColor: secondary,
        web: user.web || 'https://os-holdings.co.za/',
        logo: user.logo || 'Resources/2x/logo.png',
        linkedin: user.linkedin || 'https://www.linkedin.com/company/osholdings',
        twitter: user.twitter || 'https://x.com/holdings_os',
        facebook: user.facebook || 'https://www.facebook.com/osholdings',
        instagram: user.instagram || 'https://www.instagram.com/osholdings/',
        youtube: user.youtube || 'https://www.youtube.com/osholdings',
        template: user.template || 'os-flat-banner'
      };
    });
  }

  // Server Data Store Engine (Direct SQLite API Integration via api/users.php)
  async function loadDataStore() {
    try {
      const resp = await fetch(`api/users.php?action=list&_t=${Date.now()}`);
      if (!resp.ok) throw new Error('Server returned status ' + resp.status);
      const data = await resp.json();

      if (data && data.success && Array.isArray(data.users)) {
        staffList = data.users;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
        } catch (err) {}
      } else {
        staffList = [];
      }
    } catch (e) {
      console.warn('Could not fetch directory from server API, checking local storage:', e);
      let saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) staffList = sanitizeStaffData(parsed);
        } catch (err) {}
      } else {
        staffList = [];
      }
    }

    updateHeaderMetrics();

    if (currentTab === 'overview') {
      renderOverviewTable();
    } else if (currentTab === 'installation') {
      if (!activeEditingEmployee && staffList.length > 0) {
        activeEditingEmployee = staffList[0];
      }
      populateInstallationForm();
    }

    // Trigger silent 48-hour automated cloud backup check
    fetch('api/backups.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_check' })
    }).catch(() => {});
  }

  // Persist staff records to server database and local cache
  function saveDataStore(userToSave, createSnapshot = false, reason = '') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
      if (createSnapshot) {
        createBackupSnapshot(reason || 'Manual Update');
      }
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }

    if (userToSave && userToSave.email) {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(async () => {
        try {
          const resp = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userToSave)
          });
          const res = await resp.json();
          if (res && res.success) {
            // Updated in SQLite
          }
        } catch (e) {
          console.warn('Auto-save error:', e);
        }
      }, 400);
    }
  }

  async function deleteUserFromServer(email) {
    if (!email) return;
    try {
      const resp = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', email: email })
      });
      const data = await resp.json();
      if (data && data.success) {
        showToast('Deleted staff member (' + email + ') from server database.');
        await loadDataStore();
      } else {
        showToast('Failed to delete staff member: ' + (data?.error || 'Unknown error'), 'error');
      }
    } catch (e) {
      console.error('Error deleting staff member:', e);
      showToast('Connection error deleting record.', 'error');
    }
  }

  // Server Cloud Database Backup Engine (Last 5 Snapshots • 48h Auto-Rotation)
  async function getBackups() {
    try {
      const resp = await fetch(`api/backups.php?_t=${Date.now()}`);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data = await resp.json();
      return (data && Array.isArray(data.backups)) ? data.backups : [];
    } catch (e) {
      console.warn('Could not fetch cloud backups:', e);
      return [];
    }
  }

  async function createBackupSnapshot(reason) {
    try {
      const resp = await fetch('api/backups.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', reason: reason || 'Manual Cloud Snapshot' })
      });
      const data = await resp.json();
      if (data && data.success) {
        renderBackupsList();
      }
      return data;
    } catch (e) {
      console.warn('Failed to create cloud backup snapshot:', e);
    }
  }

  // Toast Notifications
  function showToast(message, type) {
    type = type || 'success';
    const container = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<span class="toast-icon">' + (type === 'success' ? '✓' : 'ℹ') + '</span><span class="toast-text">' + escapeHtml(message) + '</span>';
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toastContainer';
    c.className = 'toast-container';
    document.body.appendChild(c);
    return c;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Path converter to make all images absolute for email client compatibility
  function makePathsAbsolute(html) {
    if (!html) return '';
    let processed = html;
    
    // Clean up any existing local file:// URLs to public production base
    processed = processed.replace(/src=["']file:\/\/[^"']+\/Resources\//gi, `src="${BASE_URL}Resources/`);
    processed = processed.replace(/src=["']file:\/\/[^"']+\/MailFooter%20Resources\//gi, `src="${BASE_URL}MailFooter Resources/`);
    processed = processed.replace(/src=["']file:\/\/[^"']+\/MailFooter Resources\//gi, `src="${BASE_URL}MailFooter Resources/`);
    processed = processed.replace(/url\(["']?file:\/\/[^"'\)]+\/Resources\//gi, `url('${BASE_URL}Resources/`);
    
    // Process Resources paths
    processed = processed.replaceAll('src="Resources/', `src="${BASE_URL}Resources/`);
    processed = processed.replaceAll("src='Resources/", `src='${BASE_URL}Resources/`);
    processed = processed.replaceAll('url("Resources/', `url("${BASE_URL}Resources/`);
    processed = processed.replaceAll("url('Resources/", `url('${BASE_URL}Resources/`);
    processed = processed.replaceAll('url(&quot;Resources/', `url(&quot;${BASE_URL}Resources/`);
    processed = processed.replaceAll('url(&#39;Resources/', `url(&#39;${BASE_URL}Resources/`);
    
    // Process MailFooter Resources paths
    processed = processed.replaceAll('src="MailFooter Resources/', `src="${BASE_URL}MailFooter Resources/`);
    processed = processed.replaceAll("src='MailFooter Resources/", `src='${BASE_URL}MailFooter Resources/`);
    processed = processed.replaceAll('url("MailFooter Resources/', `url("${BASE_URL}MailFooter Resources/`);
    processed = processed.replaceAll("url('MailFooter Resources/", `url('${BASE_URL}MailFooter Resources/`);
    processed = processed.replaceAll('url(&quot;MailFooter Resources/', `url(&quot;${BASE_URL}MailFooter Resources/`);
    processed = processed.replaceAll('url(&#39;MailFooter Resources/', `url(&#39;${BASE_URL}MailFooter Resources/`);
    
    return processed;
  }

  // Tab Navigation Engine
  function initTabNavigation() {
    const tabs = document.querySelectorAll('.tab-nav-item');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Sub-tabs
    const subtabs = document.querySelectorAll('.subtab-btn');
    subtabs.forEach(sub => {
      sub.addEventListener('click', () => {
        subtabs.forEach(s => s.classList.remove('active'));
        sub.classList.add('active');
        currentOverviewSubtab = sub.getAttribute('data-subtab');
        renderOverviewTable();
      });
    });

    // Refresh Action (Reload Live Directory from Server Database)
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        showToast('Refreshing directory from server database...');
        loadDataStore();
      });
    }

    // Export CSV Action
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', downloadCurrentCSV);
    }
  }

  function initHeaderLogoChanger() {
    const dropzone = document.getElementById('clientLogoDropzone');
    const fileInput = document.getElementById('clientLogoFileInput');
    const logoImg = document.getElementById('headerClientLogoImg');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => {
      fileInput.click();
    });

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files[0]) {
        applyNewLogo(dt.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        applyNewLogo(e.target.files[0]);
      }
    });

    function applyNewLogo(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image (PNG, JPG, SVG).', true);
        return;
      }
      dropzone.classList.add('is-changing');
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        if (logoImg) logoImg.src = dataUrl;
        // Update all employee signatures default logo
        staffList.forEach(emp => {
          emp.logo = dataUrl;
        });
        saveDataStore();
        if (activeEditingEmployee) {
          activeEditingEmployee.logo = dataUrl;
          populateInstallationForm();
        }
        setTimeout(() => {
          dropzone.classList.remove('is-changing');
          showToast('Updated corporate client logo across directory.');
        }, 500);
      };
      reader.onerror = () => {
        dropzone.classList.remove('is-changing');
      };
      reader.readAsDataURL(file);
    }
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-nav-item').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content-pane').forEach(pane => {
      pane.classList.toggle('tab-pane-hidden', pane.id !== 'tabPane-' + tabId);
    });

    if (tabId === 'overview') {
      renderOverviewTable();
    } else if (tabId === 'installation') {
      if (!activeEditingEmployee && staffList.length > 0) {
        activeEditingEmployee = staffList[0];
      }
      populateInstallationForm();
    }
  }

  // Overview Table Rendering Engine
  function initOverviewTable() {
    const searchInput = document.getElementById('tableSearchInput');
    const deptFilter = document.getElementById('tableDeptFilter');

    if (searchInput) searchInput.addEventListener('input', renderOverviewTable);
    if (deptFilter) deptFilter.addEventListener('change', renderOverviewTable);

    renderOverviewTable();
  }

  function renderOverviewTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    const searchTerm = (document.getElementById('tableSearchInput')?.value || '').toLowerCase();
    const selectedDept = document.getElementById('tableDeptFilter')?.value || 'ALL';

    updateDeptFilterOptions();

    let filtered = staffList.filter(user => {
      if (currentOverviewSubtab === 'managers' && (user.role !== 'Director' && user.role !== 'Manager')) {
        return false;
      }
      if (currentOverviewSubtab === 'staff' && user.role !== 'Staff') {
        return false;
      }
      if (selectedDept !== 'ALL' && user.department !== selectedDept) {
        return false;
      }
      if (searchTerm) {
        const full = (user.firstName + ' ' + user.lastName + ' ' + user.title + ' ' + user.email + ' ' + user.department).toLowerCase();
        if (!full.includes(searchTerm)) return false;
      }
      return true;
    });

    updateAnalyticsCards(filtered);

    if (filtered.length === 0) {
      if (staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);"><span class="stat-pulse-dot" style="display:inline-block; margin-right: 8px;"></span> Loading live corporate personnel directory from server database...</td></tr>';
        document.getElementById('tableShowingCount').textContent = 'Loading records...';
      } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No personnel found matching the search criteria. Use <strong>📥 BULK ADD TAB</strong> or <strong>Full App Builder</strong> to add staff.</td></tr>';
        document.getElementById('tableShowingCount').textContent = 'Showing 0 of ' + staffList.length + ' records';
      }
      return;
    }

    tbody.innerHTML = filtered.map(user => {
      const initials = (((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '')).toUpperCase();
      let roleTagClass = 'tag-staff';
      if (user.role === 'Director') roleTagClass = 'tag-director';
      if (user.role === 'Manager') roleTagClass = 'tag-manager';

      return '<tr>' +
        '<td>' +
          '<div class="user-cell">' +
            '<div class="avatar-badge">' + escapeHtml(initials) + '</div>' +
            '<div>' +
              '<div class="user-name-text">' + escapeHtml(user.firstName) + ' ' + escapeHtml(user.lastName) + '</div>' +
              '<div class="user-subtext">' + escapeHtml(user.title || 'Team Member') + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td><span class="mc-tag ' + roleTagClass + '">● ' + escapeHtml(user.role || 'Staff') + '</span></td>' +
        '<td><span class="mc-tag tag-dept">' + escapeHtml(user.department || 'General') + '</span></td>' +
        '<td><a href="mailto:' + escapeHtml(user.email) + '" style="color: #0284c7; font-weight: 600; text-decoration: none;">' + escapeHtml(user.email) + '</a></td>' +
        '<td style="color: var(--text-muted); font-size: 12px;">' + escapeHtml(user.phone || user.mobile || '-') + '</td>' +
        '<td style="text-align: right;">' +
          '<div class="action-buttons-cell" style="justify-content: flex-end;">' +
            '<button class="mc-btn mc-btn-sm mc-btn-emerald btn-copy-richtext" onclick="window.MailfooterLight.copyRichTextByEmpId(\'' + user.id + '\')" title="Copy 1-Click Formatted Signature for Outlook/Apple Mail">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Signature' +
            '</button>' +
            '<button class="mc-btn mc-btn-sm mc-btn-dark btn-copy-html" onclick="window.MailfooterLight.copyHtmlByEmpId(\'' + user.id + '\')" title="Copy Raw HTML Code Snippet">' +
              '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>' +
            '</button>' +
            '<button class="mc-btn mc-btn-sm mc-btn-dark" onclick="window.MailfooterLight.openInLiveEditor(\'' + user.id + '\')" title="Edit in Live Preview Canvas">✎ Edit</button>' +
            '<button class="mc-btn mc-btn-sm mc-btn-dark" onclick="window.MailfooterLight.deleteByEmail(\'' + escapeHtml(user.email) + '\')" title="Delete Personnel Record">🗑 Delete</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    }).join('');

    document.getElementById('tableShowingCount').textContent = 'Showing ' + filtered.length + ' of ' + staffList.length + ' records';
  }

  function updateDeptFilterOptions() {
    const select = document.getElementById('tableDeptFilter');
    if (!select) return;
    const currentVal = select.value;
    const depts = Array.from(new Set(staffList.map(s => s.department).filter(Boolean)));

    let html = '<option value="ALL">All Departments (' + staffList.length + ')</option>';
    depts.sort().forEach(d => {
      const count = staffList.filter(s => s.department === d).length;
      html += '<option value="' + escapeHtml(d) + '">' + escapeHtml(d) + ' (' + count + ')</option>';
    });
    select.innerHTML = html;
    select.value = depts.includes(currentVal) || currentVal === 'ALL' ? currentVal : 'ALL';
  }

  function updateAnalyticsCards(filteredList) {
    const cardGrid = document.getElementById('analyticsGrid');
    if (!cardGrid) return;

    const totalCount = filteredList.length;
    const directorsCount = filteredList.filter(s => s.role === 'Director').length;
    const managersCount = filteredList.filter(s => s.role === 'Manager').length;
    const staffCount = filteredList.filter(s => s.role === 'Staff').length;

    cardGrid.innerHTML = '' +
      '<div class="analytic-card">' +
        '<div class="card-icon-box">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>' +
        '</div>' +
        '<div class="card-info">' +
          '<span class="card-title">Filtered Personnel</span>' +
          '<span class="card-num">' + totalCount + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="analytic-card">' +
        '<div class="card-icon-box card-icon-purple">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>' +
        '</div>' +
        '<div class="card-info">' +
          '<span class="card-title">Directors & Managers</span>' +
          '<span class="card-num">' + (directorsCount + managersCount) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="analytic-card">' +
        '<div class="card-icon-box card-icon-cyan">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>' +
        '</div>' +
        '<div class="card-info">' +
          '<span class="card-title">Staff Members</span>' +
          '<span class="card-num">' + staffCount + '</span>' +
        '</div>' +
      '</div>';
  }

  // Signature Data Assembler
  function buildSignatureHtml(user) {
    const defaultDomain = window.location.hostname || 'os-holdings.co.za';
    const emailVal = user.email || `user@${defaultDomain}`;
    const userId = encodeURIComponent(emailVal);
    const selectedTemplate = user.template || 'os-flat-banner';
    const primary = user.primaryColor || '#0d4b8e';
    const secondary = user.secondaryColor || '#f18a22';

    const data = {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Employee Name',
      title: user.title || 'Team Member',
      dept: user.department ? ` | ${user.department}` : '',
      department: user.department || '',
      tagline: 'Innovate | Excel | Grow',
      phone: user.phone || user.mobile || '',
      email: emailVal,
      web: user.web || `https://${defaultDomain}/`,
      webTracked: `https://${defaultDomain}/track/click?user_id=${userId}&link_id=website&template=${selectedTemplate}`,
      logo: `https://${defaultDomain}/track/logo?user_id=${userId}&template=${selectedTemplate}`,
      primary: primary,
      secondary: secondary,
      linkedin: user.linkedin ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=linkedin&template=${selectedTemplate}` : 'https://www.linkedin.com/company/osholdings',
      twitter: user.twitter ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=twitter&template=${selectedTemplate}` : 'https://x.com/holdings_os',
      instagram: user.instagram ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=instagram&template=${selectedTemplate}` : 'https://www.instagram.com/osholdings/',
      facebook: user.facebook ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=facebook&template=${selectedTemplate}` : 'https://www.facebook.com/osholdings',
      youtube: user.youtube ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=youtube&template=${selectedTemplate}` : '',
      campaignLink: `https://${defaultDomain}/track/click?user_id=${userId}&link_id=campaign_banner&template=${selectedTemplate}`,
      campaignImg: `https://${defaultDomain}/track/banner?user_id=${userId}&type=main&template=${selectedTemplate}`,
      campaignPartner: `https://${defaultDomain}/track/banner?user_id=${userId}&type=partner&template=${selectedTemplate}`,
      campaignBtn: `https://${defaultDomain}/track/banner?user_id=${userId}&type=button&template=${selectedTemplate}`,
      companyBio: user.companyBio || 'OS Holdings is a diversified software solution company committed to creating lasting value.',
      openPixel: '',
      sideImage: 'Resources/2x/brand-graphic-colour-top-right.png',
      location: user.location || 'Sandton, Johannesburg'
    };

    if (typeof renderOsFlatBanner === 'function' && (selectedTemplate === 'os-flat-banner' || selectedTemplate === 'os-sleek')) {
      return makePathsAbsolute(renderOsFlatBanner(data));
    }
    if (typeof renderOsPremium === 'function' && selectedTemplate === 'os-premium') {
      return makePathsAbsolute(renderOsPremium(data));
    }
    if (typeof renderOsFlatBanner === 'function') {
      return makePathsAbsolute(renderOsFlatBanner(data));
    }
    if (typeof renderOsPremium === 'function') {
      return makePathsAbsolute(renderOsPremium(data));
    }

    return makePathsAbsolute(renderFallbackSignature(data));
  }

  function renderFallbackSignature(data) {
    const primary = data.primary || '#0d4b8e';
    const secondary = data.secondary || '#f18a22';

    return `<!--[if gte mso 9]>
<xml>
  <o:OfficeDocumentSettings>
    <o:AllowPNG/>
    <o:PixelsPerInch>96</o:PixelsPerInch>
  </o:OfficeDocumentSettings>
</xml>
<![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: transparent; width: 100%; border: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <tr>
    <td align="left" valign="top" style="border: 0; padding: 0;">
      <!--[if (gte mso 9)|(IE)]>
      <table role="presentation" width="578" align="left" cellpadding="0" cellspacing="0" border="0" style="width: 578px;">
      <tr>
        <td width="578" valign="top">
      <![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: Arial, 'Segoe UI', Candara, sans-serif; border: 0; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tr>
          <td valign="middle" height="85" style="height: 85px; border-bottom: 1px solid #e5e7eb; padding: 10px 15px; background-color: #ffffff; border-top: 0; border-left: 0; border-right: 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="548" style="width: 548px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <td valign="middle" width="130" style="width: 130px; text-align: left; padding: 0; border: 0;">
                  <a href="${data.web}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                    <img src="Resources/2x/logo.png" alt="Company Logo" width="120" height="30" style="border: 0; display: block; width: 120px; height: 30px;" />
                  </a>
                </td>
                <td valign="middle" width="1" style="width: 1px; min-width: 1px; background-color: #d2d2d2; font-size: 0px; line-height: 0px; padding: 0; border: 0;">&nbsp;</td>
                <td valign="middle" width="134" style="width: 134px; padding-left: 12px; padding-right: 5px; text-align: left; border: 0;">
                  <p style="margin: 0; padding: 0; font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 15px; font-weight: bold; color: ${primary}; line-height: 17px; mso-line-height-rule: exactly;">
                    ${escapeHtml(data.name)}
                  </p>
                  <p style="margin: 0; padding: 0; margin-top: 3px; font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 12px; color: ${secondary}; font-weight: bold; line-height: 14px; mso-line-height-rule: exactly;">
                    ${escapeHtml(data.title)}
                  </p>
                </td>
                <td valign="middle" width="1" style="width: 1px; min-width: 1px; background-color: #d2d2d2; font-size: 0px; line-height: 0px; padding: 0; border: 0;">&nbsp;</td>
                <td valign="middle" width="163" style="width: 163px; padding-left: 12px; text-align: left; border: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 10px; color: #555555; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    ${data.phone ? `<tr><td valign="middle" style="padding-bottom: 3px; line-height: 14px; font-size: 10px; mso-line-height-rule: exactly; color: #333333; font-weight: 500; white-space: nowrap; border: 0;">📞 ${escapeHtml(data.phone)}</td></tr>` : ''}
                    <tr>
                      <td valign="middle" style="padding-bottom: 3px; line-height: 14px; font-size: 10px; mso-line-height-rule: exactly; white-space: nowrap; border: 0;">
                        ✉️ <a href="mailto:${escapeHtml(data.email)}" style="color: #333333; text-decoration: none; font-weight: 500;">${escapeHtml(data.email)}</a>
                      </td>
                    </tr>
                    ${data.web ? `<tr><td valign="middle" style="line-height: 14px; font-size: 10px; mso-line-height-rule: exactly; white-space: nowrap; border: 0;">🌐 <a href="${data.web}" target="_blank" style="color: #333333; text-decoration: none; font-weight: 500;">${escapeHtml(data.web)}</a></td></tr>` : ''}
                  </table>
                </td>
                <td valign="middle" width="119" style="width: 119px; text-align: right; line-height: 0; font-size: 0; padding: 0; border: 0;">
                  <img src="Resources/2x/brand-graphic-colour-top-right.png" alt="Brand Graphic" width="119" height="70" style="border: 0; display: block; width: 119px; height: 70px;" align="right" />
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--[if (gte mso 9)|(IE)]>
        </td>
      </tr>
      </table>
      <![endif]-->
    </td>
  </tr>
</table>`;
  }

  // Universal Multi-Device Clipboard Delivery Engine (Outlook Desktop, Outlook Web, Gmail, Apple Mail, iOS, Android)
  function copyRichTextSignature(employeeData) {
    return new Promise((resolve, reject) => {
      const signatureHtml = buildSignatureHtml(employeeData);
      const name = `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim();
      const plainText = `${name}\n${employeeData.title || ''}\n${employeeData.phone || ''} | ${employeeData.email || ''}\n${employeeData.web || ''}`;

      // 1. Try modern asynchronous ClipboardItem API first (executed directly in user gesture tick)
      if (navigator.clipboard && window.ClipboardItem) {
        const type = 'text/html';
        const textType = 'text/plain';
        const blobHtml = new Blob([signatureHtml], { type: type });
        const blobText = new Blob([plainText], { type: textType });

        navigator.clipboard.write([
          new ClipboardItem({
            [type]: blobHtml,
            [textType]: blobText
          })
        ]).then(() => {
          showToast('✓ Rich Signature copied for ' + name + '! Paste directly into Outlook, Gmail, or Apple Mail.');
          resolve();
        }).catch(err => {
          console.warn('navigator.clipboard.write failed, falling back to in-viewport selection:', err);
          fallbackContentEditableCopy(signatureHtml, plainText, name).then(resolve).catch(reject);
        });
      } else {
        fallbackContentEditableCopy(signatureHtml, plainText, name).then(resolve).catch(reject);
      }
    });
  }

  function fallbackContentEditableCopy(html, plainText, name) {
    return new Promise((resolve, reject) => {
      // In-viewport contenteditable container (WebKit / iOS Safari / macOS Mail compatible)
      const container = document.createElement('div');
      container.setAttribute('contenteditable', 'true');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.border = 'none';
      container.style.outline = 'none';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.overflow = 'hidden';
      container.style.webkitUserSelect = 'text';
      container.style.userSelect = 'text';
      container.innerHTML = html;
      document.body.appendChild(container);

      let copied = false;
      try {
        const range = document.createRange();
        range.selectNodeContents(container);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        copied = document.execCommand('copy');
        selection.removeAllRanges();
      } catch (err) {
        console.warn('execCommand copy failed:', err);
      } finally {
        document.body.removeChild(container);
      }

      if (copied) {
        showToast('✓ Rich Signature copied for ' + name + '! Paste directly into Outlook, Gmail, or Apple Mail.');
        resolve();
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(html).then(() => {
          showToast('HTML code copied to clipboard for ' + name + '.');
          resolve();
        }).catch(e => {
          showToast('Copy failed. Please manually select the preview.', 'error');
          reject(e);
        });
      } else {
        showToast('Copy failed. Please manually select the preview.', 'error');
        reject(new Error('Clipboard unsupported'));
      }
    });
  }

  function copyHtmlSignature(employeeData) {
    return new Promise((resolve, reject) => {
      const signatureHtml = buildSignatureHtml(employeeData);
      const name = `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim();

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(signatureHtml).then(() => {
          showToast('✓ Raw HTML snippet copied for ' + name + '!');
          resolve();
        }).catch(err => {
          fallbackCopyText(signatureHtml, name).then(resolve).catch(reject);
        });
      } else {
        fallbackCopyText(signatureHtml, name).then(resolve).catch(reject);
      }
    });
  }

  function fallbackCopyText(text, name) {
    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.opacity = '0.01';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('✓ Raw HTML snippet copied for ' + name + '!');
        resolve();
      } catch (err) {
        showToast('Failed to copy HTML code.', 'error');
        reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  // Expose Row Level Handlers to Window
  window.MailfooterLight = {
    copyRichTextByEmpId: (id) => {
      const emp = staffList.find(s => s.id === id);
      if (emp) copyRichTextSignature(emp);
    },
    copyHtmlByEmpId: (id) => {
      const emp = staffList.find(s => s.id === id);
      if (emp) copyHtmlSignature(emp);
    },
    openInLiveEditor: (id) => {
      const emp = staffList.find(s => s.id === id);
      if (emp) {
        activeEditingEmployee = emp;
        switchTab('installation');
      }
    },
    deleteByEmail: (email) => {
      if (confirm('Are you sure you want to delete staff member (' + email + ') from the server database?')) {
        deleteUserFromServer(email);
      }
    },
    restoreBackupById: async (backupId) => {
      if (!backupId) return;
      if (confirm('Reinstate backup #' + backupId + ' into the live server database? A safety pre-restore snapshot will be saved automatically.')) {
        try {
          const resp = await fetch('api/backups.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'restore', id: backupId })
          });
          const data = await resp.json();
          if (data && data.success) {
            showToast('✓ Successfully reinstated ' + data.restored_count + ' personnel records into live database!');
            await loadDataStore();
            const modal = document.getElementById('backupsModal');
            if (modal) modal.classList.remove('active');
          } else {
            showToast('Failed to reinstate database: ' + (data?.error || 'Unknown error'), 'error');
          }
        } catch (err) {
          console.error('Error reinstating backup:', err);
          showToast('Connection error reinstating database backup.', 'error');
        }
      }
    }
  };

  // ==========================================================================
  // Fortified RFC 4180 CSV Engine (Import & Export)
  // ==========================================================================

  // Full 19 Standardized Directory Export Headers
  const STANDARD_CSV_HEADERS = [
    'First Name', 'Surname', 'Role', 'Job Title', 'Department', 'Email Address',
    'Phone Number', 'Mobile Number', 'Company', 'Location', 'Website',
    'Primary Color', 'Secondary Color', 'Template', 'LinkedIn', 'Twitter',
    'Facebook', 'Instagram', 'YouTube'
  ];

  // Robust RFC 4180 CSV Parser (Handles quotes, commas inside quotes, multiline fields, tab/semicolon/comma)
  function parseCsvText(text) {
    const rows = [];
    let curRow = [];
    let curField = '';
    let insideQuotes = false;

    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Auto detect delimiter
    let delimiter = ',';
    const firstLine = normalized.split('\n')[0] || '';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const nextChar = normalized[i + 1];

      if (insideQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            curField += '"';
            i++;
          } else {
            insideQuotes = false;
          }
        } else {
          curField += char;
        }
      } else {
        if (char === '"') {
          insideQuotes = true;
        } else if (char === delimiter) {
          curRow.push(curField.trim());
          curField = '';
        } else if (char === '\n') {
          curRow.push(curField.trim());
          if (curRow.some(cell => cell.length > 0)) {
            rows.push(curRow);
          }
          curRow = [];
          curField = '';
        } else {
          curField += char;
        }
      }
    }

    if (curField.length > 0 || curRow.length > 0) {
      curRow.push(curField.trim());
      if (curRow.some(cell => cell.length > 0)) {
        rows.push(curRow);
      }
    }

    return rows;
  }

  // Header Index Lookup Helper with exhaustive alias mapping
  function getHeaderIndex(headers, possibleAliases) {
    return headers.findIndex(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return possibleAliases.some(alias => clean === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    });
  }

  function initBulkAddTab() {
    const ingestBtn = document.getElementById('ingestDataBtn');
    const textarea = document.getElementById('csvTextArea');
    const sampleCsvBtn = document.getElementById('loadSampleCsvBtn');
    const dlBlankBtn = document.getElementById('downloadBlankCsvBtn');
    const dlSampleBtn = document.getElementById('downloadSampleCsvBtn');
    const fileInput = document.getElementById('csvFileInput');
    const dropzone = document.getElementById('csvDropzone');
    const dropzoneText = document.getElementById('dropzoneText');
    const fileNameEl = document.getElementById('dropzoneFileName');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files[0]) {
          handleCsvFile(dt.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleCsvFile(e.target.files[0]);
        }
      });

      function handleCsvFile(file) {
        if (fileNameEl) {
          fileNameEl.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
        }
        dropzone.classList.add('has-file');
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target.result;
          if (textarea) textarea.value = content;
          showToast(`Loaded ${file.name}. Review or click "Process & Ingest Data".`);
        };
        reader.readAsText(file);
      }
    }

    if (sampleCsvBtn) {
      sampleCsvBtn.addEventListener('click', () => {
        if (textarea) {
          textarea.value = getSampleCsvString();
          showToast('Loaded sample CSV data into text box.');
        }
      });
    }

    if (dlBlankBtn) {
      dlBlankBtn.addEventListener('click', downloadBlankCSV);
    }
    if (dlSampleBtn) {
      dlSampleBtn.addEventListener('click', downloadCurrentCSV);
    }

    if (ingestBtn) {
      ingestBtn.addEventListener('click', () => {
        const rawText = (textarea?.value || '').trim();
        if (!rawText) {
          showToast('Please paste CSV data or select a file to import.', 'error');
          return;
        }
        processAndIngestCsv(rawText);
      });
    }
  }

  function getSampleCsvString() {
    let csv = STANDARD_CSV_HEADERS.join(',') + '\r\n';
    csv += 'Sarah,Jenkins,Director,Chief Executive Officer,Executive,sarah.jenkins@os-holdings.co.za,+27 11 463 1000,+27 82 123 4567,OS Holdings,"Sandton, Johannesburg",https://os-holdings.co.za/,#0d4b8e,#f18a22,os-flat-banner\r\n';
    csv += 'Marcus,Vance,Director,Chief Technology Officer,Engineering,marcus.vance@os-holdings.co.za,+27 11 463 1000,+27 83 234 5678,OS Holdings,"Sandton, Johannesburg",https://os-holdings.co.za/,#0d4b8e,#f18a22,os-flat-banner\r\n';
    csv += 'Elena,Rostova,Manager,Head of Marketing & Brand,Marketing,elena.rostova@os-holdings.co.za,+27 11 463 1000,+27 84 345 6789,OS Holdings,"Sandton, Johannesburg",https://os-holdings.co.za/,#0d4b8e,#f18a22,os-flat-banner\r\n';
    return csv;
  }

  async function processAndIngestCsv(text) {
    const rows = parseCsvText(text);
    if (rows.length === 0) {
      showToast('No valid lines found in CSV data.', 'error');
      return;
    }

    let headers = rows[0].map(h => h.trim());
    let startIdx = 1;

    // Detect header row
    const hasHeader = headers.some(h => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return ['firstname', 'first', 'email', 'emailaddress', 'role', 'department', 'surname', 'lastname', 'title'].includes(clean);
    });

    if (!hasHeader) {
      headers = STANDARD_CSV_HEADERS;
      startIdx = 0;
    }

    // Map column indices dynamically using header aliases
    const fnIdx = getHeaderIndex(headers, ['firstname', 'first name', 'given name', 'first', 'name']);
    const snIdx = getHeaderIndex(headers, ['lastname', 'last name', 'surname', 'family name', 'last']);
    const roleIdx = getHeaderIndex(headers, ['role', 'role tier', 'seniority', 'tier', 'position']);
    const titleIdx = getHeaderIndex(headers, ['jobtitle', 'job title', 'title', 'designation', 'occupation']);
    const deptIdx = getHeaderIndex(headers, ['department', 'dept', 'division', 'team']);
    const emailIdx = getHeaderIndex(headers, ['email', 'email address', 'e-mail', 'e-mail address', 'mail']);
    const phoneIdx = getHeaderIndex(headers, ['phone', 'phone number', 'telephone', 'tel', 'office phone', 'work phone']);
    const mobileIdx = getHeaderIndex(headers, ['mobile', 'mobile number', 'cell', 'cellphone', 'personal phone']);
    const companyIdx = getHeaderIndex(headers, ['company', 'company name', 'organization', 'org', 'business']);
    const locationIdx = getHeaderIndex(headers, ['location', 'address', 'office location', 'city', 'office']);
    const webIdx = getHeaderIndex(headers, ['web', 'website', 'site', 'url', 'company website']);
    const primaryColorIdx = getHeaderIndex(headers, ['primarycolor', 'primary color', 'brand color', 'primary']);
    const secondaryColorIdx = getHeaderIndex(headers, ['secondarycolor', 'secondary color', 'accent color', 'secondary']);
    const templateIdx = getHeaderIndex(headers, ['template', 'signature template', 'layout']);
    const linkedinIdx = getHeaderIndex(headers, ['linkedin', 'linkedin url', 'linkedin profile']);
    const twitterIdx = getHeaderIndex(headers, ['twitter', 'x', 'twitter url', 'x url']);
    const facebookIdx = getHeaderIndex(headers, ['facebook', 'facebook url']);
    const instagramIdx = getHeaderIndex(headers, ['instagram', 'instagram url']);
    const youtubeIdx = getHeaderIndex(headers, ['youtube', 'youtube url']);

    const newUsers = [];
    let directorsCount = 0;
    let managersCount = 0;
    let staffCount = 0;
    let skippedCount = 0;

    for (let i = startIdx; i < rows.length; i++) {
      const cols = rows[i];
      if (!cols || cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

      const fName = fnIdx !== -1 ? cols[fnIdx] : (cols[0] || 'Employee');
      const sName = snIdx !== -1 ? cols[snIdx] : (cols[1] && !cols[1].includes('@') ? cols[1] : '');
      const rawRole = roleIdx !== -1 ? cols[roleIdx] : 'Staff';
      const title = titleIdx !== -1 ? cols[titleIdx] : 'Team Member';
      const dept = deptIdx !== -1 ? cols[deptIdx] : 'General';
      const email = emailIdx !== -1 ? cols[emailIdx] : (cols.find(c => c.includes('@')) || '');
      const phone = phoneIdx !== -1 ? cols[phoneIdx] : '';
      const mobile = mobileIdx !== -1 ? cols[mobileIdx] : phone;
      const company = companyIdx !== -1 ? cols[companyIdx] : '';
      const location = locationIdx !== -1 ? cols[locationIdx] : '';
      const web = webIdx !== -1 ? cols[webIdx] : '';
      const primaryColor = primaryColorIdx !== -1 ? cols[primaryColorIdx] : '#0d4b8e';
      const secondaryColor = secondaryColorIdx !== -1 ? cols[secondaryColorIdx] : '#f18a22';
      const template = templateIdx !== -1 ? cols[templateIdx] : 'os-flat-banner';
      const linkedin = linkedinIdx !== -1 ? cols[linkedinIdx] : '';
      const twitter = twitterIdx !== -1 ? cols[twitterIdx] : '';
      const facebook = facebookIdx !== -1 ? cols[facebookIdx] : '';
      const instagram = instagramIdx !== -1 ? cols[instagramIdx] : '';
      const youtube = youtubeIdx !== -1 ? cols[youtubeIdx] : '';

      if (!email || !email.includes('@')) {
        skippedCount++;
        continue;
      }

      let role = 'Staff';
      const roleLower = (rawRole || '').toLowerCase();
      const titleLower = (title || '').toLowerCase();

      if (roleLower.includes('director') || roleLower.includes('vp') || roleLower.includes('chief') || titleLower.includes('director') || titleLower.includes('chief') || titleLower.includes('vp')) {
        role = 'Director';
        directorsCount++;
      } else if (roleLower.includes('manager') || roleLower.includes('head') || roleLower.includes('lead') || titleLower.includes('manager') || titleLower.includes('head')) {
        role = 'Manager';
        managersCount++;
      } else {
        role = 'Staff';
        staffCount++;
      }

      newUsers.push({
        firstName: fName,
        lastName: sName,
        role: role,
        title: title,
        department: dept,
        email: email.toLowerCase().trim(),
        phone: phone,
        mobile: mobile,
        company: company,
        location: location,
        web: web,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        template: template,
        linkedin: linkedin,
        twitter: twitter,
        facebook: facebook,
        instagram: instagram,
        youtube: youtube
      });
    }

    if (newUsers.length === 0) {
      showToast('No valid personnel records with email addresses found in CSV data.', 'error');
      return;
    }

    showToast('Uploading ' + newUsers.length + ' personnel records to server database...');

    try {
      const resp = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: newUsers })
      });
      const data = await resp.json();

      if (data && data.success) {
        const reportBox = document.getElementById('ingestReportBox');
        if (reportBox) {
          let reportHtml = '<strong>✓ Successfully Ingested ' + data.inserted + ' Personnel Records into Server Database!</strong><br/>' +
            '<span>Role Breakdown: <strong>' + directorsCount + ' Directors</strong>, <strong>' + managersCount + ' Managers</strong>, <strong>' + staffCount + ' Staff</strong>.</span>';
          if (skippedCount > 0) {
            reportHtml += '<br/><span style="color: #f87171;">⚠️ Skipped ' + skippedCount + ' rows missing valid email addresses.</span>';
          }
          reportBox.innerHTML = reportHtml;
          reportBox.classList.add('show');
        }
        createBackupSnapshot('CSV Import (' + data.inserted + ' records)');
        showToast('Ingested ' + data.inserted + ' personnel records into database!');
        await loadDataStore();
        setTimeout(() => switchTab('overview'), 1200);
      } else {
        showToast('Failed to ingest records: ' + (data?.error || 'Unknown error'), 'error');
      }
    } catch (e) {
      console.error('Error during bulk ingestion:', e);
      showToast('Connection error uploading CSV to server.', 'error');
    }

    try {
      const resp = await fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: newUsers })
      });
      const data = await resp.json();

      if (data && data.success) {
        const reportBox = document.getElementById('ingestReportBox');
        if (reportBox) {
          let reportHtml = '<strong>✓ Successfully Ingested ' + data.inserted + ' Personnel Records into Server Database!</strong><br/>' +
            '<span>Role Breakdown: <strong>' + directorsCount + ' Directors</strong>, <strong>' + managersCount + ' Managers</strong>, <strong>' + staffCount + ' Staff</strong>.</span>';
          if (skippedCount > 0) {
            reportHtml += '<br/><span style="color: #f87171;">⚠️ Skipped ' + skippedCount + ' rows missing valid email addresses.</span>';
          }
          reportBox.innerHTML = reportHtml;
          reportBox.classList.add('show');
        }
        showToast('Ingested ' + data.inserted + ' personnel records into database!');
        await loadDataStore();
        setTimeout(() => switchTab('overview'), 1200);
      } else {
        showToast('Failed to ingest records: ' + (data?.error || 'Unknown error'), 'error');
      }
    } catch (e) {
      console.error('Error during bulk ingestion:', e);
      showToast('Connection error uploading CSV to server.', 'error');
    }
  }

  // Fortified 1-to-1 CSV Exporters (RFC 4180 compliant + UTF-8 BOM)
  function downloadBlankCSV() {
    const csvContent = '\uFEFF' + STANDARD_CSV_HEADERS.map(h => `"${h}"`).join(',') + '\r\n';
    triggerDownload(csvContent, 'Mailfooter_Blank_Staff_Template.csv', 'text/csv;charset=utf-8;');
    showToast('Downloaded complete blank CSV template with all 19 standard headers.');
  }

  function downloadCurrentCSV() {
    let csv = '\uFEFF' + STANDARD_CSV_HEADERS.map(h => `"${h}"`).join(',') + '\r\n';
    
    staffList.forEach(s => {
      const row = [
        s.firstName || '',
        s.lastName || '',
        s.role || 'Staff',
        s.title || '',
        s.department || '',
        s.email || '',
        s.phone || '',
        s.mobile || '',
        s.company || '',
        s.location || '',
        s.web || '',
        s.primaryColor || '#0d4b8e',
        s.secondaryColor || '#f18a22',
        s.template || 'os-flat-banner',
        s.linkedin || '',
        s.twitter || '',
        s.facebook || '',
        s.instagram || '',
        s.youtube || ''
      ];
      csv += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\r\n';
    });

    triggerDownload(csv, 'Mailfooter_Staff_Directory.csv', 'text/csv;charset=utf-8;');
    showToast('Downloaded complete directory CSV file with ' + staffList.length + ' records.');
  }

  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Installation Tab Workspace
  function initInstallationTab() {
    const form = document.getElementById('liveEditForm');
    const empSelect = document.getElementById('activeEmpSelect');
    const tplSelect = document.getElementById('tplSelect');
    const btnSaveCloud = document.getElementById('btnSaveEmployeeCloud');

    if (empSelect) {
      empSelect.addEventListener('change', (e) => {
        const found = staffList.find(s => s.id === e.target.value);
        if (found) {
          activeEditingEmployee = found;
          populateInstallationForm();
        }
      });
    }

    if (tplSelect) {
      tplSelect.addEventListener('change', (e) => {
        if (activeEditingEmployee) {
          activeEditingEmployee.template = e.target.value;
          saveDataStore(activeEditingEmployee);
          updateLiveCanvas();
        }
      });
    }

    // Simulator Light / Dark Mode Controls
    const btnSimLight = document.getElementById('btnSimLightMode');
    const btnSimDark = document.getElementById('btnSimDarkMode');
    const mailWin = document.getElementById('mailPreviewWindow');

    if (btnSimLight && btnSimDark && mailWin) {
      btnSimLight.addEventListener('click', () => {
        mailWin.classList.remove('sim-dark-mode');
        btnSimLight.classList.add('active');
        btnSimDark.classList.remove('active');
      });
      btnSimDark.addEventListener('click', () => {
        mailWin.classList.add('sim-dark-mode');
        btnSimDark.classList.add('active');
        btnSimLight.classList.remove('active');
      });
    }

    if (form) {
      form.addEventListener('input', updateActiveEmployeeFromForm);
      form.addEventListener('change', updateActiveEmployeeFromForm);
    }

    // Dedicated Save & Sync Personnel to Cloud
    if (btnSaveCloud) {
      btnSaveCloud.addEventListener('click', async () => {
        if (!activeEditingEmployee) return;
        updateActiveEmployeeFromForm();

        btnSaveCloud.disabled = true;
        const originalText = btnSaveCloud.innerHTML;
        btnSaveCloud.innerHTML = '<span class="stat-pulse-dot" style="display:inline-block;"></span> Saving to Cloud...';

        try {
          const payload = {
            name: `${activeEditingEmployee.firstName || ''} ${activeEditingEmployee.lastName || ''}`.trim(),
            email: activeEditingEmployee.email,
            title: activeEditingEmployee.title,
            department: activeEditingEmployee.department,
            phone: activeEditingEmployee.phone || activeEditingEmployee.mobile,
            template: activeEditingEmployee.template || 'os-flat-banner'
          };

          const res = await fetch(`${BASE_URL}api/users.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data && data.success) {
            createBackupSnapshot(`Saved: ${activeEditingEmployee.firstName} ${activeEditingEmployee.lastName}`);
            saveDataStore(false);
            showToast(`✓ Saved & synced ${activeEditingEmployee.firstName} to cloud database across all devices!`);
            const feedback = document.getElementById('saveStatusFeedback');
            if (feedback) {
              feedback.innerHTML = `<span style="color: #10b981; font-weight: 700;">✓ Synced to cloud at ${new Date().toLocaleTimeString()}</span>`;
            }
          } else {
            throw new Error(data.error || 'Server rejected save');
          }
        } catch (err) {
          console.warn('Cloud API save error (offline mode):', err);
          createBackupSnapshot(`Local edit: ${activeEditingEmployee.firstName} ${activeEditingEmployee.lastName}`);
          saveDataStore(false);
          showToast(`Saved to device memory. Will sync when server is reachable.`, 'info');
        } finally {
          btnSaveCloud.disabled = false;
          btnSaveCloud.innerHTML = originalText;
        }
      });
    }

    // Floating Footer Triggers
    const btnCopyRich = document.getElementById('btnFooterCopyRichText');
    const btnCopyHtml = document.getElementById('btnFooterCopyHtml');
    const btnDownloadHtml = document.getElementById('btnFooterDownloadHtml');

    if (btnCopyRich) {
      btnCopyRich.addEventListener('click', () => {
        if (activeEditingEmployee) copyRichTextSignature(activeEditingEmployee);
      });
    }
    if (btnCopyHtml) {
      btnCopyHtml.addEventListener('click', () => {
        if (activeEditingEmployee) copyHtmlSignature(activeEditingEmployee);
      });
    }
    if (btnDownloadHtml) {
      btnDownloadHtml.addEventListener('click', () => {
        if (activeEditingEmployee) {
          const html = buildSignatureHtml(activeEditingEmployee);
          triggerDownload(html, activeEditingEmployee.firstName + '_' + activeEditingEmployee.lastName + '_signature.html', 'text/html');
          showToast('Downloaded signature HTML file for ' + activeEditingEmployee.firstName + '!');
        }
      });
    }
  }

  function populateInstallationForm() {
    const select = document.getElementById('activeEmpSelect');
    if (select) {
      select.innerHTML = staffList.map(s => {
        return '<option value="' + s.id + '" ' + (activeEditingEmployee && activeEditingEmployee.id === s.id ? 'selected' : '') + '>' +
          escapeHtml(s.firstName) + ' ' + escapeHtml(s.lastName) + ' (' + s.role + ' - ' + s.department + ')' +
        '</option>';
      }).join('');
    }

    if (!activeEditingEmployee && staffList.length > 0) {
      activeEditingEmployee = staffList[0];
    }

    if (!activeEditingEmployee) return;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('inputFirstName', activeEditingEmployee.firstName);
    setVal('inputLastName', activeEditingEmployee.lastName);
    setVal('inputRole', activeEditingEmployee.role);
    setVal('inputJobTitle', activeEditingEmployee.title);
    setVal('inputDepartment', activeEditingEmployee.department);
    setVal('inputEmail', activeEditingEmployee.email);
    setVal('inputPhone', activeEditingEmployee.phone);
    setVal('inputCompany', activeEditingEmployee.company);
    setVal('inputLocation', activeEditingEmployee.location);
    setVal('inputPrimaryColor', activeEditingEmployee.primaryColor || '#0d4b8e');
    setVal('inputSecondaryColor', activeEditingEmployee.secondaryColor || '#f18a22');
    setVal('tplSelect', activeEditingEmployee.template || 'os-flat-banner');

    const lblPri = document.getElementById('labelPrimaryColor');
    if (lblPri) lblPri.textContent = activeEditingEmployee.primaryColor || '#0d4b8e';
    const lblSec = document.getElementById('labelSecondaryColor');
    if (lblSec) lblSec.textContent = activeEditingEmployee.secondaryColor || '#f18a22';

    const senderHeader = document.getElementById('mailPreviewSender');
    if (senderHeader) {
      senderHeader.textContent = `${activeEditingEmployee.firstName || ''} ${activeEditingEmployee.lastName || ''} <${activeEditingEmployee.email || ''}>`;
    }

    updateLiveCanvas();
  }

  function updateActiveEmployeeFromForm() {
    if (!activeEditingEmployee) return;

    const getVal = (id) => document.getElementById(id)?.value || '';

    activeEditingEmployee.firstName = getVal('inputFirstName');
    activeEditingEmployee.lastName = getVal('inputLastName');
    activeEditingEmployee.role = getVal('inputRole');
    activeEditingEmployee.title = getVal('inputJobTitle');
    activeEditingEmployee.department = getVal('inputDepartment');
    activeEditingEmployee.email = getVal('inputEmail');
    activeEditingEmployee.phone = getVal('inputPhone');
    activeEditingEmployee.company = getVal('inputCompany');
    activeEditingEmployee.location = getVal('inputLocation');
    activeEditingEmployee.primaryColor = getVal('inputPrimaryColor');
    activeEditingEmployee.secondaryColor = getVal('inputSecondaryColor');
    activeEditingEmployee.template = getVal('tplSelect') || 'os-flat-banner';

    const lblPri = document.getElementById('labelPrimaryColor');
    if (lblPri) lblPri.textContent = activeEditingEmployee.primaryColor;
    const lblSec = document.getElementById('labelSecondaryColor');
    if (lblSec) lblSec.textContent = activeEditingEmployee.secondaryColor;

    const senderHeader = document.getElementById('mailPreviewSender');
    if (senderHeader) {
      senderHeader.textContent = `${activeEditingEmployee.firstName || ''} ${activeEditingEmployee.lastName || ''} <${activeEditingEmployee.email || ''}>`;
    }

    saveDataStore(activeEditingEmployee);
    scheduleCanvasUpdate();
  }

  let canvasRafId = null;
  function scheduleCanvasUpdate() {
    if (canvasRafId) cancelAnimationFrame(canvasRafId);
    canvasRafId = requestAnimationFrame(updateLiveCanvas);
  }

  function updateLiveCanvas() {
    const canvas = document.getElementById('signatureCanvasViewport');
    if (!canvas || !activeEditingEmployee) return;

    const compiledHtml = buildSignatureHtml(activeEditingEmployee);
    canvas.innerHTML = compiledHtml;
  }

  // Backup Manager Engine (Server Cloud Database Snapshots)
  function initBackupsManager() {
    const btnOpen = document.getElementById('btnOpenBackupsModal');
    const modal = document.getElementById('backupsModal');
    const btnClose = document.getElementById('btnCloseBackupsModal');
    const btnCloseX = document.getElementById('btnCloseBackupsModalX');
    const btnCreate = document.getElementById('btnCreateSnapshotNow');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        renderBackupsList();
        modal.classList.add('active');
      });
    }

    [btnClose, btnCloseX].forEach(b => {
      if (b && modal) {
        b.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    });

    if (btnCreate) {
      btnCreate.addEventListener('click', async () => {
        btnCreate.disabled = true;
        const originalText = btnCreate.innerHTML;
        btnCreate.innerHTML = '⏳ Creating Snapshot...';
        try {
          const res = await createBackupSnapshot('Manual Snapshot by Administrator');
          if (res && res.success) {
            showToast('✓ Created new server cloud snapshot (' + (res.total_records || staffList.length) + ' records)!');
            await renderBackupsList();
          } else {
            showToast('Failed to create snapshot: ' + (res?.error || 'Unknown error'), 'error');
          }
        } catch (e) {
          showToast('Error creating server backup.', 'error');
        } finally {
          btnCreate.disabled = false;
          btnCreate.innerHTML = originalText;
        }
      });
    }
  }

  async function renderBackupsList() {
    const listEl = document.getElementById('backupHistoryList');
    if (!listEl) return;
    listEl.innerHTML = '<div style="font-size: 12px; color: #94a3b8; padding: 14px; text-align: center;">Loading server cloud snapshots...</div>';
    
    const backups = await getBackups();

    if (!Array.isArray(backups) || backups.length === 0) {
      listEl.innerHTML = '<div style="font-size: 12px; color: #94a3b8; padding: 14px; text-align: center;">No cloud database snapshots found yet. Click "Snapshot Current Database" below to create the first save.</div>';
      return;
    }

    listEl.innerHTML = backups.map(b => {
      const dateStr = b.created_at || 'Recent';
      return `
        <div class="backup-history-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div class="backup-item-info" style="display: flex; flex-direction: column; gap: 3px;">
            <span class="backup-item-title" style="font-weight: 700; font-size: 13px; color: #1e293b;">${escapeHtml(b.reason || 'Cloud Snapshot')}</span>
            <span class="backup-item-meta" style="font-size: 11.5px; color: #64748b;">${escapeHtml(dateStr)} • <strong style="color: #0284c7;">${b.total_records} records</strong></span>
          </div>
          <button type="button" class="mc-btn mc-btn-sm mc-btn-emerald" onclick="window.MailfooterLight.restoreBackupById(${b.id})" title="Reinstate this snapshot into live production database">
            ↺ Reinstate
          </button>
        </div>
      `;
    }).join('');
  }

  // Add Single Staff Modal Engine
  function initAddStaffModal() {
    const btnOpen = document.getElementById('btnAddStaffModalBtn');
    const modal = document.getElementById('addStaffModal');
    const btnCloseX = document.getElementById('btnCloseAddStaffModalX');
    const btnCancel = document.getElementById('btnCancelAddStaffModal');
    const btnSubmit = document.getElementById('btnSubmitAddStaff');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        document.getElementById('addStaffForm')?.reset();
        modal.classList.add('active');
      });
    }

    [btnCloseX, btnCancel].forEach(b => {
      if (b && modal) {
        b.addEventListener('click', () => {
          modal.classList.remove('active');
        });
      }
    });

    if (btnSubmit && modal) {
      btnSubmit.addEventListener('click', async () => {
        const fName = (document.getElementById('addStaffFirstName')?.value || '').trim();
        const lName = (document.getElementById('addStaffLastName')?.value || '').trim();
        const role = document.getElementById('addStaffRole')?.value || 'Staff';
        const dept = (document.getElementById('addStaffDept')?.value || '').trim() || 'General';
        const title = (document.getElementById('addStaffTitle')?.value || '').trim() || 'Team Member';
        const email = (document.getElementById('addStaffEmail')?.value || '').trim().toLowerCase();
        const phone = (document.getElementById('addStaffPhone')?.value || '').trim() || '+27 (0) 11 463 1000';

        if (!fName || !lName || !email) {
          showToast('Please fill in First Name, Surname, and Email.', 'error');
          return;
        }

        const newRecord = {
          id: 'osh-' + Date.now(),
          firstName: fName,
          lastName: lName,
          role: role,
          title: title,
          department: dept,
          email: email,
          phone: phone,
          mobile: phone,
          company: 'OS Holdings',
          location: 'Sandton, Johannesburg',
          web: 'https://os-holdings.co.za/',
          logo: 'Resources/2x/logo.png',
          primaryColor: '#0d4b8e',
          secondaryColor: '#f18a22',
          template: 'os-flat-banner'
        };

        const existingIdx = staffList.findIndex(s => (s.email || '').toLowerCase() === email);
        if (existingIdx !== -1) {
          staffList[existingIdx] = { ...staffList[existingIdx], ...newRecord, id: staffList[existingIdx].id };
        } else {
          staffList.push(newRecord);
        }

        createBackupSnapshot(`Added staff: ${fName} ${lName}`);
        saveDataStore(true, `Added staff: ${fName} ${lName}`);
        renderOverviewTable();
        updateHeaderMetrics();
        modal.classList.remove('active');
        showToast(`✓ Added ${fName} ${lName} to directory and synced to cloud!`);
      });
    }
  }

})();

