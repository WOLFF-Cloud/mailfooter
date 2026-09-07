/* ==========================================================================
   Mailfooter Light Version - Enterprise Production Portal Engine
   ========================================================================== */

(function () {
  'use strict';

  // Base URL calculation for absolute assets
  const BASE_URL = window.location.origin + window.location.pathname.replace(/\/(light|index|app|admin|super-admin|register)(\.html)?$/, '').replace(/\/$/, '') + '/';

  // Application State (Clean server-backed state, no local demo fallbacks)
  let staffList = [];
  let currentTab = 'overview';
  let currentOverviewSubtab = 'all'; // 'all', 'managers', 'staff'
  let activeEditingEmployee = null;
  let saveDebounceTimer = null;

  // DOM Ready Initialization
  document.addEventListener('DOMContentLoaded', () => {
    loadDataStore();
    initTabNavigation();
    initOverviewTable();
    initBulkAddTab();
    initInstallationTab();
  });

  // Server Data Store Engine (Direct SQLite API Integration via api/users.php)
  async function loadDataStore() {
    try {
      const resp = await fetch('api/users.php?action=list');
      if (!resp.ok) throw new Error('Server returned status ' + resp.status);
      const data = await resp.json();

      if (data && data.success && Array.isArray(data.users)) {
        staffList = data.users;
      } else {
        staffList = [];
      }
    } catch (e) {
      console.warn('Could not fetch directory from server API:', e);
      showToast('Could not fetch directory from server database. Ensure PHP server is running.', 'error');
      staffList = [];
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
  }

  // Persist a single staff record to the server database
  function saveDataStore(userToSave) {
    updateHeaderMetrics();
    if (!userToSave || !userToSave.email) return;

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      fetch('api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToSave)
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.success) {
          console.log('Staff record persisted to server SQLite database:', userToSave.email);
        } else {
          showToast('Failed to save to server: ' + (res?.error || 'Unknown error'), 'error');
        }
      })
      .catch(err => {
        console.error('Failed to sync with server API:', err);
        showToast('Connection error saving staff member to database.', 'error');
      });
    }, 300);
  }

  // Delete a staff record from the server database
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

  function updateHeaderMetrics() {
    const totalEl = document.getElementById('statTotalCount');
    const mgrEl = document.getElementById('statMgrCount');
    const staffEl = document.getElementById('statStaffCount');

    if (totalEl) totalEl.textContent = staffList.length;
    if (mgrEl) {
      const mgrCount = staffList.filter(s => s.role === 'Director' || s.role === 'Manager').length;
      mgrEl.textContent = mgrCount;
    }
    if (staffEl) {
      const stCount = staffList.filter(s => s.role === 'Staff').length;
      staffEl.textContent = stCount;
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
    let processed = html;
    
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
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No personnel found in server database matching the search criteria. Use <strong>📥 BULK ADD TAB</strong> or <strong>Full App Builder</strong> to add staff.</td></tr>';
      document.getElementById('tableShowingCount').textContent = 'Showing 0 of ' + staffList.length + ' records';
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
        '<td><span class="mc-tag ' + roleTagClass + '">' + escapeHtml(user.role || 'Staff') + '</span></td>' +
        '<td><span class="mc-tag tag-dept">' + escapeHtml(user.department || 'General') + '</span></td>' +
        '<td><a href="mailto:' + escapeHtml(user.email) + '" style="color: var(--color-green-primary); font-weight: 600; text-decoration: none;">' + escapeHtml(user.email) + '</a></td>' +
        '<td>' + escapeHtml(user.phone || user.mobile || '-') + '</td>' +
        '<td>' +
          '<div class="action-buttons-cell">' +
            '<button class="mc-btn mc-btn-sm btn-copy-richtext" onclick="window.MailfooterLight.copyRichTextByEmpId(\'' + user.id + '\')" title="Copy Formatted Rich Text Signature for Outlook/Apple Mail">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Rich Text' +
            '</button>' +
            '<button class="mc-btn mc-btn-sm btn-copy-html" onclick="window.MailfooterLight.copyHtmlByEmpId(\'' + user.id + '\')" title="Copy Raw HTML Code Snippet">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg> Copy HTML' +
            '</button>' +
            '<button class="mc-btn mc-btn-sm" onclick="window.MailfooterLight.openInLiveEditor(\'' + user.id + '\')" title="Edit in Live Preview Canvas">✎ Edit</button>' +
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
        '<div class="card-icon-box">👥</div>' +
        '<div class="card-info">' +
          '<span class="card-title">Filtered Personnel</span>' +
          '<span class="card-num">' + totalCount + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="analytic-card">' +
        '<div class="card-icon-box card-icon-purple">👔</div>' +
        '<div class="card-info">' +
          '<span class="card-title">Directors & Managers</span>' +
          '<span class="card-num">' + (directorsCount + managersCount) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="analytic-card">' +
        '<div class="card-icon-box card-icon-cyan">💼</div>' +
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
      linkedin: user.linkedin ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=linkedin&template=${selectedTemplate}` : '',
      twitter: user.twitter ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=twitter&template=${selectedTemplate}` : '',
      instagram: user.instagram ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=instagram&template=${selectedTemplate}` : '',
      facebook: user.facebook ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=facebook&template=${selectedTemplate}` : '',
      youtube: user.youtube ? `https://${defaultDomain}/track/click?user_id=${userId}&link_id=youtube&template=${selectedTemplate}` : '',
      campaignLink: `https://${defaultDomain}/track/click?user_id=${userId}&link_id=campaign_banner&template=${selectedTemplate}`,
      campaignImg: `https://${defaultDomain}/track/banner?user_id=${userId}&type=main&template=${selectedTemplate}`,
      campaignPartner: `https://${defaultDomain}/track/banner?user_id=${userId}&type=partner&template=${selectedTemplate}`,
      campaignBtn: `https://${defaultDomain}/track/banner?user_id=${userId}&type=button&template=${selectedTemplate}`,
      companyBio: '',
      sideImage: 'Resources/2x/brand-graphic-colour-top-right.png',
      location: user.location || ''
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

    return `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
        <tr>
          <td align="left" valign="top">
            <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb;">
              <tr>
                <td valign="middle" height="85" style="height: 85px; border-bottom: 1px solid #e5e7eb; padding: 10px 15px; background-image: url('Resources/2x/brand-graphic-grey-top-left.png'); background-repeat: no-repeat; background-position: left top; background-color: #ffffff;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed;">
                    <tr>
                      <td valign="middle" width="130" style="width: 130px; text-align: left;">
                        <a href="${data.web}" target="_blank" style="text-decoration: none; display: block;">
                          <img src="Resources/2x/logo.png" alt="Company Logo" width="120" height="30" style="border: 0; display: block; max-width: 120px; height: 30px;" />
                        </a>
                      </td>
                      <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                      <td valign="middle" width="132" style="width: 132px; max-width: 132px; padding-left: 12px; padding-right: 5px; text-align: left; overflow: hidden;">
                        <div style="font-size: 15px; font-weight: bold; color: ${primary}; margin: 0; line-height: 17px; font-family: 'Segoe UI', Arial, sans-serif;">
                          ${escapeHtml(data.name)}
                        </div>
                        <div style="font-size: 12px; color: ${secondary}; font-weight: bold; margin-top: 3px; line-height: 14px; font-family: 'Segoe UI', Arial, sans-serif;">
                          ${escapeHtml(data.title)}
                        </div>
                      </td>
                      <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                      <td valign="middle" width="163" style="width: 163px; padding-left: 12px; font-size: 10px; color: #555555; text-align: left;">
                        <table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #555555;">
                          ${data.phone ? `<tr><td valign="middle" style="padding-bottom: 3px; line-height: 12px; color: #333333; font-weight: 500;">📞 ${escapeHtml(data.phone)}</td></tr>` : ''}
                          <tr>
                            <td valign="middle" style="padding-bottom: 3px; line-height: 12px;">
                              ✉️ <a href="mailto:${escapeHtml(data.email)}" style="color: #333333; text-decoration: none; font-weight: 500;">${escapeHtml(data.email)}</a>
                            </td>
                          </tr>
                          ${data.web ? `<tr><td valign="middle" style="line-height: 12px;">🌐 <a href="${data.web}" target="_blank" style="color: #333333; text-decoration: none; font-weight: 500;">${escapeHtml(data.web)}</a></td></tr>` : ''}
                        </table>
                      </td>
                      <td valign="middle" width="119" style="width: 119px; text-align: right; line-height: 0;">
                        <img src="Resources/2x/brand-graphic-colour-top-right.png" alt="Brand Graphic" width="119" height="70" style="border: 0; display: block; width: 119px; height: 70px;" />
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  }

  // Cross-Platform Clipboard Delivery Engine
  function copyRichTextSignature(employeeData) {
    return new Promise((resolve, reject) => {
      const signatureHtml = buildSignatureHtml(employeeData);
      const name = `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim();
      const plainText = `${name}\n${employeeData.title || ''}\n${employeeData.phone || ''} | ${employeeData.email || ''}\n${employeeData.web || ''}`;

      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.innerHTML = signatureHtml;
      document.body.appendChild(tempDiv);

      let copied = false;
      if (document.createRange && window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
          copied = document.execCommand('copy');
        } catch (err) {
          console.warn('execCommand copy failed:', err);
        }

        selection.removeAllRanges();
      }
      document.body.removeChild(tempDiv);

      if (copied) {
        showToast('✓ Rich Signature copied for ' + name + '! Paste directly into Outlook, Gmail, or Apple Mail.');
        resolve();
        return;
      }

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
          navigator.clipboard.writeText(signatureHtml).then(() => {
            showToast('Raw HTML copied to clipboard for ' + name + '.');
            resolve();
          }).catch(e => {
            showToast('Copy failed. Please manually select the preview.', 'error');
            reject(e);
          });
        });
      } else {
        showToast('Copy failed. Please use Ctrl+C on the preview.', 'error');
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
      textarea.style.left = '-9999px';
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
    }
  };

  // Bulk Add Tab & Automated Role Parser
  function initBulkAddTab() {
    const ingestBtn = document.getElementById('ingestDataBtn');
    const textarea = document.getElementById('csvTextArea');
    const sampleCsvBtn = document.getElementById('loadSampleCsvBtn');
    const dlBlankBtn = document.getElementById('downloadBlankCsvBtn');
    const dlSampleBtn = document.getElementById('downloadSampleCsvBtn');

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
          showToast('Please paste CSV or tab-separated text data into the box first.', 'error');
          return;
        }
        processAndIngestCsv(rawText);
      });
    }
  }

  function getSampleCsvString() {
    return "First Name,Surname,Role,Department,Email Address,Job Title,Phone Number\r\nJohn,Doe,Director,Executive,john.doe@company.com,Managing Director,+27 11 000 0000\r\nJane,Smith,Manager,Marketing,jane.smith@company.com,Marketing Lead,+27 11 000 0001\r\n";
  }

  async function processAndIngestCsv(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    let delimiter = ',';
    if (lines[0].includes('\t')) delimiter = '\t';
    else if (lines[0].includes(';')) delimiter = ';';

    const parseLine = (line) => {
      return line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
    };

    let headers = parseLine(lines[0]).map(h => h.toLowerCase());
    let startIdx = 1;

    const hasHeader = headers.some(h => ['firstname', 'first name', 'email', 'role', 'department', 'surname', 'last name'].includes(h));
    if (!hasHeader) {
      headers = ['first name', 'surname', 'role', 'department', 'email', 'job title', 'phone'];
      startIdx = 0;
    }

    const getIndex = (possibleNames) => {
      return headers.findIndex(h => possibleNames.includes(h.toLowerCase()));
    };

    const fnIdx = getIndex(['first name', 'firstname', 'first', 'name']);
    const snIdx = getIndex(['surname', 'last name', 'lastname', 'last']);
    const roleIdx = getIndex(['role', 'tier', 'seniority', 'position']);
    const deptIdx = getIndex(['department', 'dept', 'division']);
    const emailIdx = getIndex(['email address', 'email', 'e-mail']);
    const titleIdx = getIndex(['job title', 'title', 'designation']);
    const phoneIdx = getIndex(['phone number', 'phone', 'telephone', 'mobile']);

    const newUsers = [];
    let directorsCount = 0;
    let managersCount = 0;
    let staffCount = 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.length < 2) continue;

      const fName = fnIdx !== -1 ? cols[fnIdx] : cols[0] || 'Employee';
      const sName = snIdx !== -1 ? cols[snIdx] : (cols[1] && !cols[1].includes('@') ? cols[1] : '');
      const rawRole = roleIdx !== -1 ? cols[roleIdx] : (cols[2] || 'Staff');
      const dept = deptIdx !== -1 ? cols[deptIdx] : 'General';
      const email = emailIdx !== -1 ? cols[emailIdx] : (cols.find(c => c.includes('@')) || '');
      const title = titleIdx !== -1 ? cols[titleIdx] : 'Team Member';
      const phone = phoneIdx !== -1 ? cols[phoneIdx] : '';

      if (!email) continue;

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
        email: email,
        phone: phone,
        mobile: phone,
        company: '',
        location: '',
        primaryColor: '#0d4b8e',
        secondaryColor: '#f18a22',
        template: 'os-flat-banner'
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
          reportBox.innerHTML = '<strong>✓ Successfully Ingested ' + data.inserted + ' Personnel Records into Server Database!</strong><br/><span>Role Breakdown: <strong>' + directorsCount + ' Directors</strong>, <strong>' + managersCount + ' Managers</strong>, <strong>' + staffCount + ' Staff</strong>.</span>';
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

  // Template Exporters
  function downloadBlankCSV() {
    const csvContent = '\uFEFFFirst Name,Surname,Role,Department,Email Address,Job Title,Phone Number\n';
    triggerDownload(csvContent, 'Mailfooter_Blank_Staff_Template.csv', 'text/csv;charset=utf-8;');
    showToast('Downloaded Blank CSV Template.');
  }

  function downloadCurrentCSV() {
    let csv = '\uFEFFFirst Name,Surname,Role,Department,Email Address,Job Title,Phone Number,Company,Location\n';
    staffList.forEach(s => {
      csv += '"' + (s.firstName || '') + '","' + (s.lastName || '') + '","' + (s.role || '') + '","' + (s.department || '') + '","' + (s.email || '') + '","' + (s.title || '') + '","' + (s.phone || '') + '","' + (s.company || '') + '","' + (s.location || '') + '"\n';
    });
    triggerDownload(csv, 'Mailfooter_Staff_Directory.csv', 'text/csv;charset=utf-8;');
    showToast('Downloaded Directory CSV file.');
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

    if (form) {
      form.addEventListener('input', updateActiveEmployeeFromForm);
      form.addEventListener('change', updateActiveEmployeeFromForm);
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

})();
