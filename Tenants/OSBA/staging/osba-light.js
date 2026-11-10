/* ==========================================================================
   OS Business Amplifier (OSBA) Mailfooter Light Suite - Production Staging Engine
   Built on the Proven Multi-Tenant Enterprise Quality Architecture
   ========================================================================== */

(function () {
  'use strict';

  // Base URL helper
  const BASE_URL = (function() {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      if (window.location.protocol === 'file:' || !origin || origin === 'null') {
        return '';
      }
      return origin + pathname.replace(/\/[^\/]*$/, '/') ;
    }
    return '';
  })();

  function makeAbsolute(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
    return (BASE_URL || '') + path.replace(/^\.\//, '');
  }

  // Application State
  const STORAGE_KEY = 'osba_mailfooter_staff_v1';
  let staffList = [];
  let currentTab = 'overview';
  let currentOverviewSubtab = 'all';
  let activeEditingEmployee = null;
  let simulatedDarkMode = false;
  let saveDebounceTimer = null;

  const DEFAULT_DIRECTORY_SEED = [
    {
      id: 'osba-001',
      firstName: 'Wandile',
      lastName: 'Mbanjwa',
      role: 'Director',
      title: 'Managing Director',
      department: 'Executive',
      email: 'wandile@osbusinessamp.com',
      phone: '+27 64 064 5038',
      mobile: '+27 64 064 5038',
      company: 'OS Business Amplifier',
      location: 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014',
      primaryColor: '#212d34',
      secondaryColor: '#d92338',
      web: 'https://osbusinessamp.com',
      logo: 'assets/osba-logo.jpg',
      linkedin: 'https://www.linkedin.com/company/os-business-amplifier',
      twitter: 'https://x.com/osb_amplifier',
      facebook: 'https://www.facebook.com/people/The-OS-Business-Amplifier/100063608500604',
      instagram: 'https://www.instagram.com/osbusiness_amplifier',
      youtube: '',
      template: 'osba-signature',
      campaign_enabled: 1
    }
  ];

  // DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    loadDataStore();
    initTabNavigation();
    initOverviewTable();
    initBulkAddTab();
    initInstallationTab();
    initAddStaffModal();
    initEditStaffModal();
    updateHeaderMetrics();

    const yearEl = document.getElementById('appCurrentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  async function loadDataStore() {
    setCloudStatus('syncing', 'Syncing with Server DB...');
    try {
      const resp = await fetch('api/users.php?client=osbusinessamp.com&action=list&_t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && Array.isArray(data.users)) {
          if (data.users.length > 0) {
            staffList = data.users;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList)); } catch (e) {}
            setCloudStatus('synced', 'Server Database Synced (Live)');
            updateHeaderMetrics();
            renderOverviewTable();
            syncStudioState();
            return;
          } else {
            staffList = [...DEFAULT_DIRECTORY_SEED];
            await pushUserToServer(staffList[0]);
            setCloudStatus('synced', 'Server Database Initialized');
            updateHeaderMetrics();
            renderOverviewTable();
            syncStudioState();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from server API, using local fallback:', e);
      setCloudStatus('offline', 'Offline (Local Cache)');
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          staffList = parsed;
          updateHeaderMetrics();
          renderOverviewTable();
          syncStudioState();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }

    staffList = [...DEFAULT_DIRECTORY_SEED];
    updateHeaderMetrics();
    renderOverviewTable();
    syncStudioState();
  }

  function syncStudioState() {
    if (!activeEditingEmployee && staffList.length > 0) {
      activeEditingEmployee = staffList[0];
    } else if (activeEditingEmployee) {
      activeEditingEmployee = staffList.find(s => s.email === activeEditingEmployee.email) || staffList[0];
    }
    if (activeEditingEmployee) {
      populateInstallationForm();
      renderLiveCanvas();
    }
  }

  function setCloudStatus(state, label) {
    const el = document.getElementById('cloudSyncStatus');
    if (!el) return;
    let dotColor = '#10b981';
    let textColor = '#10b981';
    if (state === 'syncing') {
      dotColor = '#eab308';
      textColor = '#ca8a04';
    } else if (state === 'error' || state === 'offline') {
      dotColor = '#ef4444';
      textColor = '#dc2626';
    }
    el.style.color = textColor;
    el.innerHTML = `<span class="stat-pulse-dot" style="background:${dotColor};"></span> ${escapeHtml(label)}`;
  }

  async function saveDataStore(userToSave, immediate = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    const target = userToSave || activeEditingEmployee;
    if (!target || !target.email) return true;

    if (immediate) {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      return await pushUserToServer(target);
    }

    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    setCloudStatus('syncing', 'Auto-saving to Server DB...');
    saveDebounceTimer = setTimeout(() => {
      pushUserToServer(target);
    }, 350);
    return true;
  }

  async function pushUserToServer(user) {
    setCloudStatus('syncing', 'Saving to Server DB...');
    try {
      const res = await fetch('api/users.php?client=osbusinessamp.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify(user)
      });
      const data = await res.json();
      if (data && data.success) {
        setCloudStatus('synced', 'Server Database Synced (Live)');
        console.log('✓ Successfully saved to server SQLite DB:', user.email);
        return true;
      } else {
        setCloudStatus('error', 'Sync Failed');
        console.error('Server returned error on save:', data?.error);
        return false;
      }
    } catch (err) {
      setCloudStatus('error', 'Connection Error');
      console.error('Failed to sync with server API:', err);
      return false;
    }
  }

  async function deleteUserFromServer(email) {
    if (!email) return;
    try {
      await fetch('api/users.php?client=osbusinessamp.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', email: email })
      });
    } catch (err) {
      console.error('Failed to delete from server API:', err);
    }
  }

  function updateHeaderMetrics() {
    const total = staffList.length;
    const managers = staffList.filter(s => {
      const r = (s.role || '').toLowerCase();
      const t = (s.title || '').toLowerCase();
      return r === 'director' || r === 'manager' || t.includes('director') || t.includes('manager') || t.includes('head') || t.includes('lead') || t.includes('vp');
    }).length;
    const staff = Math.max(0, total - managers);

    const grid = document.getElementById('analyticsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Total Personnel</span>
            <span class="stat-icon-wrapper icon-blue">👥</span>
          </div>
          <div class="stat-value" id="statTotalCount">${total}</div>
          <div class="stat-caption">Synchronized corporate directory</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Directors &amp; Managers</span>
            <span class="stat-icon-wrapper icon-purple">👔</span>
          </div>
          <div class="stat-value" id="statMgrCount">${managers}</div>
          <div class="stat-caption">Leadership personnel</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Staff Members</span>
            <span class="stat-icon-wrapper icon-emerald">⚡</span>
          </div>
          <div class="stat-value" id="statStaffCount">${staff}</div>
          <div class="stat-caption">Active operational team</div>
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // Signature Generation Engine (Outlook / Word Compatible)
  // -------------------------------------------------------------
  function renderOsbaSignature(user, isDarkSimulator = false) {
    const isDark = isDarkSimulator;
    const cardBg = isDark ? '#1a2227' : '#f3f3f3';
    const textColor = isDark ? '#f1f5f9' : '#212d34';

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Wandile Mbanjwa';
    const title = user.title || 'Managing Director';
    const department = user.company || 'OS Business Amplifier';
    const phone = user.phone || user.mobile || '+27 64 064 5038';
    const cleanPhone = phone.replace(/\s+/g, '');
    const email = user.email || 'wandile@osbusinessamp.com';
    const web = user.web || 'https://osbusinessamp.com';
    const webDisplay = web.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const location = user.location || 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014';
    const isCampaignEnabled = (user.campaign_enabled !== undefined && user.campaign_enabled !== null)
      ? (user.campaign_enabled !== false && user.campaign_enabled !== 0 && user.campaign_enabled !== '0')
      : true;

    // Assets resolved absolute for rich text copying
    const logoImg = makeAbsolute('assets/osba-logo.jpg');
    const dividerImg = makeAbsolute('assets/osba-divider.png');
    const phoneIcon = makeAbsolute('assets/osba-phone.png');
    const emailIcon = makeAbsolute('assets/osba-email.png');
    const webIcon = makeAbsolute('assets/osba-web.png');
    const locationIcon = makeAbsolute('assets/osba-location.png');
    const bannerImg = makeAbsolute('assets/osba-banner.jpg');
    const linkedinIcon = makeAbsolute('assets/osba-linkedin.png');
    const instagramIcon = makeAbsolute('assets/osba-instagram.png');
    const twitterIcon = makeAbsolute('assets/osba-twitter.png');
    const facebookIcon = makeAbsolute('assets/osba-facebook.png');
    const youtubeIcon = makeAbsolute('assets/osba-youtube.png');

    const linkedinLink = user.linkedin || 'https://www.linkedin.com/company/os-business-amplifier';
    const instagramLink = user.instagram || 'https://www.instagram.com/osbusiness_amplifier';
    const twitterLink = user.twitter || 'https://x.com/osb_amplifier';
    const facebookLink = user.facebook || 'https://www.facebook.com/people/The-OS-Business-Amplifier/100063608500604';
    const youtubeLink = user.youtube || '';

    // Split location onto two lines if long
    let locationHtml = escapeHtml(location);
    if (location.includes(',')) {
      const parts = location.split(',');
      if (parts.length >= 2) {
        const first = parts.slice(0, -1).join(',').trim();
        const last = parts[parts.length - 1].trim();
        locationHtml = `${escapeHtml(first)}<br>${escapeHtml(last)}`;
      }
    }

    const socialCells = [];
    if (linkedinLink) socialCells.push(`<td valign="top" width="31" height="23" style="width: 31px; height: 23px; padding: 0 3px; line-height: 0; font-size: 0; border: 0;"><a href="${escapeHtml(linkedinLink)}" target="_blank" style="text-decoration: none; display: block; line-height: 0;"><img src="${linkedinIcon}" width="31" height="23" alt="LinkedIn" style="display: block; width: 31px; height: 23px; border: 0;" /></a></td>`);
    if (instagramLink) socialCells.push(`<td valign="top" width="30" height="23" style="width: 30px; height: 23px; padding: 0 3px; line-height: 0; font-size: 0; border: 0;"><a href="${escapeHtml(instagramLink)}" target="_blank" style="text-decoration: none; display: block; line-height: 0;"><img src="${instagramIcon}" width="30" height="23" alt="Instagram" style="display: block; width: 30px; height: 23px; border: 0;" /></a></td>`);
    if (twitterLink) socialCells.push(`<td valign="top" width="31" height="23" style="width: 31px; height: 23px; padding: 0 3px; line-height: 0; font-size: 0; border: 0;"><a href="${escapeHtml(twitterLink)}" target="_blank" style="text-decoration: none; display: block; line-height: 0;"><img src="${twitterIcon}" width="31" height="23" alt="X" style="display: block; width: 31px; height: 23px; border: 0;" /></a></td>`);
    if (facebookLink) socialCells.push(`<td valign="top" width="30" height="23" style="width: 30px; height: 23px; padding: 0 3px; line-height: 0; font-size: 0; border: 0;"><a href="${escapeHtml(facebookLink)}" target="_blank" style="text-decoration: none; display: block; line-height: 0;"><img src="${facebookIcon}" width="30" height="23" alt="Facebook" style="display: block; width: 30px; height: 23px; border: 0;" /></a></td>`);
    if (youtubeLink) socialCells.push(`<td valign="top" width="31" height="23" style="width: 31px; height: 23px; padding: 0 3px; line-height: 0; font-size: 0; border: 0;"><a href="${escapeHtml(youtubeLink)}" target="_blank" style="text-decoration: none; display: block; line-height: 0;"><img src="${youtubeIcon}" width="31" height="23" alt="YouTube" style="display: block; width: 31px; height: 23px; border: 0;" /></a></td>`);

    const campaignHtml = isCampaignEnabled ? `
  <!-- BOTTOM PART: Banner (600 x 110) -->
  <tr>
    <td width="600" height="110" colspan="5" style="padding: 0; font-size: 0; line-height: 1px;">
      <a href="${escapeHtml(web)}" target="_blank" style="text-decoration: none;">
        <img src="${bannerImg}" width="600" height="110" alt="Amplify your brand. Accelerate your business." style="display: block; width: 600px; height: 110px; border: 0;" />
      </a>
    </td>
  </tr>

  <!-- "Follow us on" Header -->
  <tr>
    <td width="600" height="39" align="center" valign="top" colspan="5" style="padding: 0; height: 39px; text-align: center;">
      <p style="margin: 0; padding: 0; font-size: 0; line-height: 14px; mso-line-height-rule: exactly;">&nbsp;</p>
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 12px; line-height: 15px; mso-line-height-rule: exactly; font-weight: bold; text-align: center; color: ${textColor};">
        Follow us on
      </p>
    </td>
  </tr>

  <!-- Social Icons -->
  <tr>
    <td width="600" height="23" align="center" valign="top" colspan="5" style="padding: 0; height: 23px; font-size: 0; line-height: 0; text-align: center;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <tr>
          ${socialCells.join('')}
        </tr>
      </table>
    </td>
  </tr>

  <!-- Bottom Spacing -->
  <tr>
    <td width="600" height="18" colspan="5" style="padding: 0; height: 18px; font-size: 0; line-height: 18px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>
    ` : `
  <tr>
    <td width="600" height="10" colspan="5" style="padding: 0; height: 10px; font-size: 0; line-height: 10px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>
    `;

    return `
<!-- BEGIN OSBA EMAIL SIGNATURE -->
<!--[if gte mso 9]>
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
      <table role="presentation" width="600" align="left" cellpadding="0" cellspacing="0" border="0" style="width: 600px;">
      <tr>
        <td width="600" valign="top">
      <![endif]-->
      <table cellpadding="0" cellspacing="0" border="0" role="presentation" width="600" bgcolor="${cardBg}" style="width: 600px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: ${cardBg};">

  <!-- TOP PART (140 px high): logo | name | divider | contact details -->
  <tr>
    <!-- Logo panel (254 x 140) -->
    <td width="254" height="140" rowspan="9" valign="top" style="width: 254px; height: 140px; padding: 0; font-size: 0; line-height: 1px;">
      <a href="${escapeHtml(web)}" target="_blank" style="text-decoration: none;">
        <img src="${logoImg}" width="254" height="140" alt="OS Business Amplifier" style="display: block; width: 254px; height: 140px; border: 0;" />
      </a>
    </td>

    <!-- Name block (146 px wide) -->
    <td width="146" height="140" rowspan="9" valign="top" style="width: 146px; height: 140px; padding: 0;">
      <p style="margin: 0; padding: 0; font-size: 0; line-height: 53px; mso-line-height-rule: exactly;">&nbsp;</p>
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 13px; line-height: 16px; mso-line-height-rule: exactly; font-weight: bold; text-transform: uppercase; color: ${textColor};">
        ${escapeHtml(name)}
      </p>
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 9.7px; line-height: 20px; mso-line-height-rule: exactly; text-transform: uppercase; color: ${textColor};">
        ${escapeHtml(title)}
      </p>
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 4.9px; line-height: 9px; mso-line-height-rule: exactly; letter-spacing: 1.75px; text-transform: uppercase; color: ${textColor}; white-space: nowrap;">
        ${escapeHtml(department)}
      </p>
    </td>

    <!-- Divider line (14 x 140) -->
    <td width="14" height="140" rowspan="9" valign="top" style="width: 14px; height: 140px; padding: 0; font-size: 0; line-height: 1px;">
      <img src="${dividerImg}" width="14" height="140" alt="" style="display: block; width: 14px; height: 140px; border: 0;" />
    </td>

    <!-- Contact details start (icon 19 px + text 167 px) -->
    <td colspan="2" height="29" style="height: 29px; padding: 0; font-size: 0; line-height: 29px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>

  <!-- Row 2: Phone -->
  <tr>
    <td width="19" height="14" valign="top" style="width: 19px; height: 14px; padding: 0; font-size: 0; line-height: 1px;">
      <img src="${phoneIcon}" width="19" height="14" alt="Phone" style="display: block; width: 19px; height: 14px; border: 0;" />
    </td>
    <td width="167" height="14" valign="top" style="width: 167px; height: 14px; padding: 0;">
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 8.9px; line-height: 14px; mso-line-height-rule: exactly; color: ${textColor}; white-space: nowrap;">
        <a href="tel:${cleanPhone}" style="color: ${textColor}; text-decoration: none;">${escapeHtml(phone)}</a>
      </p>
    </td>
  </tr>

  <!-- Row 3: 10 px space -->
  <tr>
    <td colspan="2" height="10" style="height: 10px; padding: 0; font-size: 0; line-height: 10px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>

  <!-- Row 4: Email -->
  <tr>
    <td width="19" height="14" valign="top" style="width: 19px; height: 14px; padding: 0; font-size: 0; line-height: 1px;">
      <img src="${emailIcon}" width="19" height="14" alt="Email" style="display: block; width: 19px; height: 14px; border: 0;" />
    </td>
    <td width="167" height="14" valign="top" style="width: 167px; height: 14px; padding: 0;">
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 8.9px; line-height: 14px; mso-line-height-rule: exactly; color: ${textColor}; white-space: nowrap;">
        <a href="mailto:${escapeHtml(email)}" style="color: ${textColor}; text-decoration: none;">${escapeHtml(email)}</a>
      </p>
    </td>
  </tr>

  <!-- Row 5: 9 px space -->
  <tr>
    <td colspan="2" height="9" style="height: 9px; padding: 0; font-size: 0; line-height: 9px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>

  <!-- Row 6: Website -->
  <tr>
    <td width="19" height="14" valign="top" style="width: 19px; height: 14px; padding: 0; font-size: 0; line-height: 1px;">
      <img src="${webIcon}" width="19" height="14" alt="Website" style="display: block; width: 19px; height: 14px; border: 0;" />
    </td>
    <td width="167" height="14" valign="top" style="width: 167px; height: 14px; padding: 0;">
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 8.9px; line-height: 14px; mso-line-height-rule: exactly; color: ${textColor}; white-space: nowrap;">
        <a href="${escapeHtml(web)}" target="_blank" style="color: ${textColor}; text-decoration: none;">${escapeHtml(webDisplay)}</a>
      </p>
    </td>
  </tr>

  <!-- Row 7: 6 px space -->
  <tr>
    <td colspan="2" height="6" style="height: 6px; padding: 0; font-size: 0; line-height: 6px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>

  <!-- Row 8: Office Address -->
  <tr>
    <td width="19" height="24" valign="top" style="width: 19px; height: 24px; padding: 0; font-size: 0; line-height: 1px;">
      <img src="${locationIcon}" width="19" height="14" alt="Address" style="display: block; width: 19px; height: 14px; border: 0;" />
    </td>
    <td width="167" height="24" valign="top" style="width: 167px; height: 24px; padding: 0;">
      <p style="margin: 0; padding: 0; font-size: 0; line-height: 1px; mso-line-height-rule: exactly;">&nbsp;</p>
      <p style="margin: 0; padding: 0; font-family: 'Avenir Next', 'Avenir Next LT Pro', Avenir, 'Segoe UI', Arial, Helvetica, sans-serif; font-size: 8.9px; line-height: 10.5px; mso-line-height-rule: exactly; color: ${textColor}; white-space: nowrap;">
        ${locationHtml}
      </p>
    </td>
  </tr>

  <!-- Row 9: 20 px space under address -->
  <tr>
    <td colspan="2" height="20" style="height: 20px; padding: 0; font-size: 0; line-height: 20px; mso-line-height-rule: exactly;">&nbsp;</td>
  </tr>

  ${campaignHtml}

</table>
      <!--[if (gte mso 9)|(IE)]>
        </td>
      </tr>
      </table>
      <![endif]-->
    </td>
  </tr>
</table>
<!-- END OSBA EMAIL SIGNATURE -->
`;
  }

  // -------------------------------------------------------------
  // Navigation & Tabs
  // -------------------------------------------------------------
  function initTabNavigation() {
    const tabs = ['overview', 'bulk', 'installation'];
    tabs.forEach(tabId => {
      const btn = document.getElementById(`tabNav${capitalize(tabId)}`);
      if (btn) {
        btn.addEventListener('click', () => switchTab(tabId));
      }
    });

    const btnImportToolbar = document.getElementById('btnImportCsvToolbar');
    if (btnImportToolbar) {
      btnImportToolbar.addEventListener('click', () => switchTab('bulk'));
    }

    const btnRefresh = document.getElementById('refreshDataBtn');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        showToast('Syncing latest records from server database...');
        await loadDataStore();
        showToast('✓ Directory refreshed from server database.');
      });
    }

    const btnExport = document.getElementById('btnFooterExportData');
    if (btnExport) {
      btnExport.addEventListener('click', exportDirectoryToCsv);
    }
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.add('tab-pane-hidden'));

    const activeBtn = document.getElementById(`tabNav${capitalize(tabId)}`);
    if (activeBtn) activeBtn.classList.add('active');

    const activePane = document.getElementById(`tabPane-${tabId}`);
    if (activePane) activePane.classList.remove('tab-pane-hidden');

    if (tabId === 'overview') {
      renderOverviewTable();
    } else if (tabId === 'installation') {
      if (!activeEditingEmployee && staffList.length > 0) {
        activeEditingEmployee = staffList[0];
      }
      populateInstallationForm();
    }
  }

  // -------------------------------------------------------------
  // Tab 1: Staff Directory Table & Filtering
  // -------------------------------------------------------------
  function initOverviewTable() {
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderOverviewTable());
    }

    const deptFilter = document.getElementById('tableDeptFilter');
    if (deptFilter) {
      deptFilter.addEventListener('change', () => renderOverviewTable());
    }

    document.querySelectorAll('.subtabs-bar .subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.subtabs-bar .subtab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentOverviewSubtab = e.currentTarget.getAttribute('data-subtab');
        renderOverviewTable();
      });
    });

    const purgeBtn = document.getElementById('btnPurgeDemoToolbar');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', () => {
        if (confirm('Reset directory to initial default (Wandile Mbanjwa)?')) {
          staffList = [...DEFAULT_DIRECTORY_SEED];
          saveDataStore();
          renderOverviewTable();
          updateHeaderMetrics();
          showToast('Directory reset to default.');
        }
      });
    }

    renderOverviewTable();
  }

  function renderOverviewTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    populateDeptDropdown();

    const searchTerm = (document.getElementById('tableSearchInput')?.value || '').toLowerCase().trim();
    const selectedDept = document.getElementById('tableDeptFilter')?.value || 'ALL';

    let filtered = staffList.filter(user => {
      // Subtab filter
      const role = (user.role || '').toLowerCase();
      const title = (user.title || '').toLowerCase();
      const isMgr = role === 'director' || role === 'manager' || title.includes('director') || title.includes('manager') || title.includes('head') || title.includes('lead') || title.includes('vp');

      if (currentOverviewSubtab === 'managers' && !isMgr) return false;
      if (currentOverviewSubtab === 'staff' && isMgr) return false;

      // Dept filter
      if (selectedDept !== 'ALL') {
        const d = (user.department || 'General').trim();
        if (d.toLowerCase() !== selectedDept.toLowerCase()) return false;
      }

      // Search filter
      if (searchTerm) {
        const fullSearch = `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''} ${user.title || ''} ${user.department || ''} ${user.company || ''}`.toLowerCase();
        if (!fullSearch.includes(searchTerm)) return false;
      }

      return true;
    });

    const showingCount = document.getElementById('tableShowingCount');
    if (showingCount) {
      showingCount.textContent = `Showing ${filtered.length} of ${staffList.length} personnel`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No personnel match your search or filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(user => {
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
      const role = user.role || 'Staff';
      const roleBadgeClass = getRoleBadgeClass(role);
      const email = user.email || '';
      const phone = user.phone || user.mobile || '';
      const dept = user.department || 'General';
      const title = user.title || 'Staff Member';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${escapeHtml(name)}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(title)}</div>
          </td>
          <td>
            <span class="mc-role-badge ${roleBadgeClass}">${escapeHtml(role)}</span>
          </td>
          <td>
            <span style="font-size: 13px; font-weight: 500; color: var(--text-secondary);">${escapeHtml(dept)}</span>
          </td>
          <td>
            <a href="mailto:${escapeHtml(email)}" style="color: var(--text-main); text-decoration: none; font-size: 13px; font-weight: 500;">
              ${escapeHtml(email)}
            </a>
          </td>
          <td>
            <span style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(phone)}</span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 6px; justify-content: flex-end;">
              <button class="mc-btn mc-btn-emerald mc-btn-sm btn-quick-copy" data-email="${escapeHtml(email)}" title="Copy Outlook-ready Rich Text Signature">
                📋 Copy Rich Text
              </button>
              <button class="mc-btn mc-btn-dark mc-btn-sm btn-quick-studio" data-email="${escapeHtml(email)}" title="Open in Live Preview Studio">
                🎨 Studio
              </button>
              <button class="mc-btn mc-btn-dark mc-btn-sm btn-quick-edit" data-email="${escapeHtml(email)}" title="Edit staff record">
                ✎ Edit
              </button>
              <button class="mc-btn mc-btn-sm btn-quick-del" data-email="${escapeHtml(email)}" title="Remove staff member" style="color: #dc2626; border-color: #fee2e2; background: #fff5f5;">
                ✕
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Row Action Handlers
    tbody.querySelectorAll('.btn-quick-copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        const emp = staffList.find(s => s.email === em);
        if (emp) {
          await copyRichTextToClipboard(emp);
          showToast(`Copied signature for ${emp.firstName || emp.name} to clipboard!`);
        }
      });
    });

    tbody.querySelectorAll('.btn-quick-studio').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        const emp = staffList.find(s => s.email === em);
        if (emp) {
          activeEditingEmployee = emp;
          switchTab('installation');
        }
      });
    });

    tbody.querySelectorAll('.btn-quick-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        const emp = staffList.find(s => s.email === em);
        if (emp) openEditModal(emp);
      });
    });

    tbody.querySelectorAll('.btn-quick-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        if (confirm(`Remove ${em} from directory?`)) {
          staffList = staffList.filter(s => s.email !== em);
          deleteUserFromServer(em);
          saveDataStore();
          renderOverviewTable();
          updateHeaderMetrics();
          showToast('Staff member removed.');
        }
      });
    });
  }

  function populateDeptDropdown() {
    const select = document.getElementById('tableDeptFilter');
    if (!select) return;

    const currentVal = select.value;
    const depts = new Set();
    staffList.forEach(u => {
      if (u.department && u.department.trim()) {
        depts.add(u.department.trim());
      }
    });

    const sorted = Array.from(depts).sort();
    select.innerHTML = '<option value="ALL">All Departments</option>' + sorted.map(d => {
      return `<option value="${escapeHtml(d)}" ${d === currentVal ? 'selected' : ''}>${escapeHtml(d)}</option>`;
    }).join('');
  }

  function getRoleBadgeClass(role) {
    const r = (role || '').toLowerCase();
    if (r === 'director') return 'role-director';
    if (r === 'manager') return 'role-manager';
    return 'role-staff';
  }

  // -------------------------------------------------------------
  // Clipboard Rich Text Copy Trigger
  // -------------------------------------------------------------
  async function copyRichTextToClipboard(user) {
    const html = renderOsbaSignature(user, false);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([extractPlainText(html)], { type: 'text/plain' });
        const item = new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        });
        await navigator.clipboard.write([item]);
        return true;
      }
    } catch (e) {
      console.warn('Clipboard API write failed, using fallback copy container:', e);
    }

    // Fallback using contenteditable container
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.innerHTML = html;
    document.body.appendChild(el);

    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    try {
      document.execCommand('copy');
      sel.removeAllRanges();
      el.remove();
      return true;
    } catch (err) {
      el.remove();
      throw err;
    }
  }

  function extractPlainText(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.innerText || div.textContent || '';
  }

  // -------------------------------------------------------------
  // Tab 2: Bulk CSV Ingestion
  // -------------------------------------------------------------
  function initBulkAddTab() {
    const btnSample = document.getElementById('loadSampleCsvBtn');
    const textArea = document.getElementById('csvTextArea');
    const ingestBtn = document.getElementById('ingestDataBtn');
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');
    const btnBlankTpl = document.getElementById('downloadBlankCsvBtn');
    const btnSampleTpl = document.getElementById('downloadSampleCsvBtn');

    if (btnSample && textArea) {
      btnSample.addEventListener('click', () => {
        textArea.value = getSampleCsvString();
        showToast('Loaded OSBA CSV sample template.');
      });
    }

    if (btnBlankTpl) {
      btnBlankTpl.addEventListener('click', () => {
        downloadCsvFile('First Name,Surname,Role,Job Title,Department,Email Address,Phone Number,Company,Location\n', 'osba-staff-template-blank.csv');
      });
    }

    if (btnSampleTpl) {
      btnSampleTpl.addEventListener('click', () => {
        downloadCsvFile(getSampleCsvString(), 'osba-staff-template-sample.csv');
      });
    }

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleCsvFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleCsvFile(e.target.files[0]);
        }
      });
    }

    if (ingestBtn) {
      ingestBtn.addEventListener('click', processCsvIngestion);
    }
  }

  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const txt = e.target.result;
      const ta = document.getElementById('csvTextArea');
      if (ta) ta.value = txt;
      const nameEl = document.getElementById('dropzoneFileName');
      if (nameEl) nameEl.textContent = `Loaded file: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      showToast(`Spreadsheet loaded (${file.name}). Ready to ingest.`);
    };
    reader.readAsText(file);
  }

  function processCsvIngestion() {
    const ta = document.getElementById('csvTextArea');
    const raw = (ta?.value || '').trim();
    const reportBox = document.getElementById('ingestReportBox');
    const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';

    if (!raw) {
      showToast('Please paste CSV text or select a file first.', 'error');
      return;
    }

    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) {
      showToast('No valid lines found in CSV.', 'error');
      return;
    }

    // Header extraction
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine).map(h => h.trim().toLowerCase());

    const colMap = {
      firstName: headers.findIndex(h => h.includes('first') || h === 'name'),
      lastName: headers.findIndex(h => h.includes('last') || h.includes('surname')),
      role: headers.findIndex(h => h === 'role' || h.includes('tier') || h.includes('seniority')),
      title: headers.findIndex(h => h.includes('title') || h.includes('position') || h.includes('designation')),
      dept: headers.findIndex(h => h.includes('dept') || h.includes('department')),
      email: headers.findIndex(h => h.includes('email') || h.includes('mail')),
      phone: headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('cell') || h.includes('tel')),
      company: headers.findIndex(h => h.includes('company') || h.includes('organization') || h.includes('organisation')),
      location: headers.findIndex(h => h.includes('loc') || h.includes('address') || h.includes('city') || h.includes('office'))
    };

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < 2) continue;

      const fName = colMap.firstName >= 0 ? (row[colMap.firstName] || '').trim() : '';
      const lName = colMap.lastName >= 0 ? (row[colMap.lastName] || '').trim() : '';
      const email = colMap.email >= 0 ? (row[colMap.email] || '').trim() : '';
      if (!email && !fName) continue;

      const title = colMap.title >= 0 ? (row[colMap.title] || '').trim() : 'Staff Member';
      const rawRole = colMap.role >= 0 ? (row[colMap.role] || '').trim() : '';
      const role = detectRoleTier(rawRole, title);

      const dept = colMap.dept >= 0 ? (row[colMap.dept] || '').trim() : 'Executive';
      const phone = colMap.phone >= 0 ? (row[colMap.phone] || '').trim() : '+27 64 064 5038';
      const company = colMap.company >= 0 ? (row[colMap.company] || '').trim() : 'OS Business Amplifier';
      const location = colMap.location >= 0 ? (row[colMap.location] || '').trim() : 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014';

      parsed.push({
        id: `osba-${Date.now()}-${i}`,
        firstName: fName || 'Team',
        lastName: lName || 'Member',
        role: role,
        title: title,
        department: dept,
        email: email || `user${i}@osbusinessamp.com`,
        phone: phone,
        mobile: phone,
        company: company,
        location: location,
        primaryColor: '#212d34',
        secondaryColor: '#d92338',
        web: 'https://osbusinessamp.com',
        logo: 'assets/osba-logo.jpg',
        template: 'osba-signature',
        campaign_enabled: 1
      });
    }

    if (parsed.length === 0) {
      showToast('Could not extract any valid personnel records. Check header columns.', 'error');
      return;
    }

    if (mode === 'replace') {
      staffList = parsed;
    } else {
      parsed.forEach(nu => {
        const idx = staffList.findIndex(s => s.email.toLowerCase() === nu.email.toLowerCase());
        if (idx >= 0) staffList[idx] = { ...staffList[idx], ...nu };
        else staffList.push(nu);
      });
    }

    saveDataStore();
    parsed.forEach(u => {
      fetch('api/users.php?client=osbusinessamp.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      }).catch(() => {});
    });
    renderOverviewTable();
    updateHeaderMetrics();

    if (reportBox) {
      reportBox.innerHTML = `
        <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 13px; font-weight: 600;">
          ✓ Successfully ingested ${parsed.length} personnel records into OSBA directory (${mode === 'replace' ? 'Full Replacement' : 'Merged'}).
        </div>
      `;
    }

    showToast(`✓ Ingested ${parsed.length} records into directory.`);
  }

  function detectRoleTier(rawRole, title) {
    const combined = `${rawRole || ''} ${title || ''}`.toLowerCase();
    if (combined.includes('director') || combined.includes('chief') || combined.includes('partner') || combined.includes('owner') || combined.includes('ceo') || combined.includes('md') || combined.includes('vp')) {
      return 'Director';
    }
    if (combined.includes('manager') || combined.includes('head') || combined.includes('lead') || combined.includes('supervisor')) {
      return 'Manager';
    }
    return 'Staff';
  }

  function parseCsvLine(line) {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((c === ',' || c === '\t') && !inQuotes) {
        res.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    res.push(cur);
    return res;
  }

  function getSampleCsvString() {
    return `First Name,Surname,Role,Job Title,Department,Email Address,Phone Number,Company,Location
Wandile,Mbanjwa,Director,Managing Director,Executive,wandile@osbusinessamp.com,+27 64 064 5038,OS Business Amplifier,"Atrium on 5th, 9th Floor, 5th St Sandton, 2014"
Sarah,Khumalo,Manager,Head of Creative Strategy,Strategy & Brand,sarah@osbusinessamp.com,+27 64 064 5039,OS Business Amplifier,"Atrium on 5th, 9th Floor, 5th St Sandton, 2014"
David,Mahlangu,Staff,Senior Brand Architect,Design & Content,david@osbusinessamp.com,+27 64 064 5040,OS Business Amplifier,"Atrium on 5th, 9th Floor, 5th St Sandton, 2014"`;
  }

  function downloadCsvFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function exportDirectoryToCsv() {
    const headers = ['First Name', 'Surname', 'Role', 'Job Title', 'Department', 'Email Address', 'Phone Number', 'Company', 'Location'];
    const rows = staffList.map(u => [
      `"${(u.firstName || '').replace(/"/g, '""')}"`,
      `"${(u.lastName || '').replace(/"/g, '""')}"`,
      `"${(u.role || '').replace(/"/g, '""')}"`,
      `"${(u.title || '').replace(/"/g, '""')}"`,
      `"${(u.department || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || u.mobile || '').replace(/"/g, '""')}"`,
      `"${(u.company || '').replace(/"/g, '""')}"`,
      `"${(u.location || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvStr = headers.join(',') + '\n' + rows.join('\n');
    downloadCsvFile(csvStr, `osba-directory-export-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Exported OSBA directory to CSV.');
  }

  // -------------------------------------------------------------
  // Tab 3: Live Preview Studio
  // -------------------------------------------------------------
  function initInstallationTab() {
    const empSelect = document.getElementById('activeEmpSelect');
    if (empSelect) {
      empSelect.addEventListener('change', (e) => {
        const found = staffList.find(s => s.email === e.target.value);
        if (found) {
          activeEditingEmployee = found;
          populateInstallationForm();
        }
      });
    }

    // Input binding
    const bindInput = (id, prop) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          if (!activeEditingEmployee) return;
          activeEditingEmployee[prop] = e.target.value;
          renderLiveCanvas();
          saveActiveEmployeeChanges();
        });
      }
    };

    bindInput('inputFirstName', 'firstName');
    bindInput('inputLastName', 'lastName');
    bindInput('inputRole', 'role');
    bindInput('inputDepartment', 'department');
    bindInput('inputJobTitle', 'title');
    bindInput('inputEmail', 'email');
    bindInput('inputPhone', 'phone');
    bindInput('inputCompany', 'company');
    bindInput('inputLocation', 'location');

    const cpToggle = document.getElementById('inputCampaignEnabled');
    if (cpToggle) {
      cpToggle.addEventListener('change', (e) => {
        if (!activeEditingEmployee) return;
        activeEditingEmployee.campaign_enabled = e.target.checked ? 1 : 0;
        renderLiveCanvas();
        saveActiveEmployeeChanges();
      });
    }

    const btnSimLight = document.getElementById('btnSimLightMode');
    const btnSimDark = document.getElementById('btnSimDarkMode');
    if (btnSimLight && btnSimDark) {
      btnSimLight.addEventListener('click', () => {
        simulatedDarkMode = false;
        btnSimLight.classList.add('active');
        btnSimDark.classList.remove('active');
        renderLiveCanvas();
      });
      btnSimDark.addEventListener('click', () => {
        simulatedDarkMode = true;
        btnSimDark.classList.add('active');
        btnSimLight.classList.remove('active');
        renderLiveCanvas();
      });
    }

    const btnSaveCloud = document.getElementById('btnSaveEmployeeCloud');
    if (btnSaveCloud) {
      btnSaveCloud.addEventListener('click', async () => {
        if (!activeEditingEmployee) return;
        btnSaveCloud.disabled = true;
        btnSaveCloud.innerHTML = '<span class="stat-pulse-dot" style="background:#eab308;"></span> Saving to Server DB...';
        const ok = await saveDataStore(activeEditingEmployee, true);
        btnSaveCloud.disabled = false;
        btnSaveCloud.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> 💾 Save Personnel Changes';
        if (ok) {
          showToast(`✓ Permanently saved changes for ${activeEditingEmployee.firstName || activeEditingEmployee.name} to server database!`);
        } else {
          showToast('Could not reach server database. Check network connection.', 'error');
        }
      });
    }

    // 1-Click Copy Buttons
    const btnCopyRich = document.getElementById('btnFooterCopyRichText');
    if (btnCopyRich) {
      btnCopyRich.addEventListener('click', async () => {
        if (!activeEditingEmployee) return;
        await copyRichTextToClipboard(activeEditingEmployee);
        showToast(`Copied rich text signature for ${activeEditingEmployee.firstName} to clipboard! Paste directly into Outlook.`);
      });
    }

    const btnCopyHtml = document.getElementById('btnFooterCopyHtml');
    if (btnCopyHtml) {
      btnCopyHtml.addEventListener('click', async () => {
        if (!activeEditingEmployee) return;
        const html = renderOsbaSignature(activeEditingEmployee, false);
        try {
          await navigator.clipboard.writeText(html);
          showToast('Copied HTML snippet to clipboard.');
        } catch (e) {
          showToast('Failed to copy HTML code.', 'error');
        }
      });
    }

    const btnDownloadHtml = document.getElementById('btnFooterDownloadHtml');
    if (btnDownloadHtml) {
      btnDownloadHtml.addEventListener('click', () => {
        if (!activeEditingEmployee) return;
        const html = renderOsbaSignature(activeEditingEmployee, false);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fName = (activeEditingEmployee.firstName || 'signature').toLowerCase();
        link.download = `osba-signature-${fName}.html`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('Downloaded signature .html file.');
      });
    }
  }

  function populateInstallationForm() {
    const empSelect = document.getElementById('activeEmpSelect');
    if (empSelect) {
      empSelect.innerHTML = staffList.map(s => {
        const full = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email;
        const isSel = activeEditingEmployee && activeEditingEmployee.email === s.email;
        return `<option value="${escapeHtml(s.email)}" ${isSel ? 'selected' : ''}>${escapeHtml(full)} (${escapeHtml(s.role || 'Staff')})</option>`;
      }).join('');
    }

    if (!activeEditingEmployee) return;
    const u = activeEditingEmployee;

    setVal('inputFirstName', u.firstName || '');
    setVal('inputLastName', u.lastName || '');
    setVal('inputRole', u.role || 'Staff');
    setVal('inputDepartment', u.department || '');
    setVal('inputJobTitle', u.title || '');
    setVal('inputEmail', u.email || '');
    setVal('inputPhone', u.phone || u.mobile || '');
    setVal('inputCompany', u.company || 'OS Business Amplifier');
    setVal('inputLocation', u.location || '');

    const cp = document.getElementById('inputCampaignEnabled');
    if (cp) {
      cp.checked = (u.campaign_enabled !== undefined && u.campaign_enabled !== null) ? !!u.campaign_enabled : true;
    }

    const senderEl = document.getElementById('mailPreviewSender');
    if (senderEl) {
      senderEl.textContent = `${u.firstName || ''} ${u.lastName || ''} <${u.email || ''}>`;
    }

    renderLiveCanvas();
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  function renderLiveCanvas() {
    const viewport = document.getElementById('signatureCanvasViewport');
    if (!viewport || !activeEditingEmployee) return;

    viewport.innerHTML = renderOsbaSignature(activeEditingEmployee, simulatedDarkMode);

    const win = document.getElementById('mailPreviewWindow');
    if (win) {
      if (simulatedDarkMode) {
        win.classList.add('dark-sim-active');
        viewport.style.backgroundColor = '#1a2227';
      } else {
        win.classList.remove('dark-sim-active');
        viewport.style.backgroundColor = '#ffffff';
      }
    }
  }

  function saveActiveEmployeeChanges() {
    if (!activeEditingEmployee) return;
    const idx = staffList.findIndex(s => s.email === activeEditingEmployee.email);
    if (idx >= 0) staffList[idx] = { ...activeEditingEmployee };
    else staffList.push({ ...activeEditingEmployee });
    saveDataStore(activeEditingEmployee);
    renderOverviewTable();
    updateHeaderMetrics();
  }

  // -------------------------------------------------------------
  // Modals (Add / Edit)
  // -------------------------------------------------------------
  function initAddStaffModal() {
    const btnOpen = document.getElementById('btnAddStaffModalBtn');
    const modal = document.getElementById('addStaffModal');
    const btnClose = document.getElementById('btnCloseAddStaffModalX');
    const btnCancel = document.getElementById('btnCancelAddStaffModal');
    const btnSubmit = document.getElementById('btnSubmitAddStaff');

    const open = () => modal && modal.classList.add('active');
    const close = () => modal && modal.classList.remove('active');

    if (btnOpen) btnOpen.addEventListener('click', open);
    if (btnClose) btnClose.addEventListener('click', close);
    if (btnCancel) btnCancel.addEventListener('click', close);

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        const fName = document.getElementById('addStaffFirstName')?.value.trim();
        const lName = document.getElementById('addStaffLastName')?.value.trim();
        const email = document.getElementById('addStaffEmail')?.value.trim();

        if (!fName || !lName || !email) {
          showToast('Please enter First Name, Last Name, and Email.', 'error');
          return;
        }

        const newUser = {
          id: `osba-${Date.now()}`,
          firstName: fName,
          lastName: lName,
          role: document.getElementById('addStaffRole')?.value || 'Staff',
          department: document.getElementById('addStaffDept')?.value.trim() || 'Executive',
          title: document.getElementById('addStaffTitle')?.value.trim() || 'Staff Member',
          email: email,
          phone: document.getElementById('addStaffPhone')?.value.trim() || '+27 64 064 5038',
          company: 'OS Business Amplifier',
          location: 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014',
          primaryColor: '#212d34',
          secondaryColor: '#d92338',
          web: 'https://osbusinessamp.com',
          logo: 'assets/osba-logo.jpg',
          template: 'osba-signature',
          campaign_enabled: document.getElementById('addStaffCampaignEnabled')?.checked ? 1 : 0
        };

        staffList.push(newUser);
        saveDataStore(newUser, true);
        renderOverviewTable();
        updateHeaderMetrics();
        close();
        showToast(`✓ Added ${fName} ${lName} and saved to server database.`);
      });
    }
  }

  function initEditStaffModal() {
    const modal = document.getElementById('editStaffModal');
    const btnClose = document.getElementById('btnCloseEditStaffModalX');
    const btnCancel = document.getElementById('btnCancelEditStaffModal');
    const btnSubmit = document.getElementById('btnSubmitEditStaff');
    const btnPreview = document.getElementById('btnOpenInLivePreviewFromEdit');

    const close = () => modal && modal.classList.remove('active');
    if (btnClose) btnClose.addEventListener('click', close);
    if (btnCancel) btnCancel.addEventListener('click', close);

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        const origEmail = document.getElementById('editStaffOriginalEmail')?.value;
        const emp = staffList.find(s => s.email === origEmail);
        if (!emp) return;

        emp.firstName = document.getElementById('editStaffFirstName')?.value.trim();
        emp.lastName = document.getElementById('editStaffLastName')?.value.trim();
        emp.role = document.getElementById('editStaffRole')?.value;
        emp.department = document.getElementById('editStaffDept')?.value.trim();
        emp.title = document.getElementById('editStaffTitle')?.value.trim();
        emp.email = document.getElementById('editStaffEmail')?.value.trim();
        emp.phone = document.getElementById('editStaffPhone')?.value.trim();
        emp.company = document.getElementById('editStaffCompany')?.value.trim();
        emp.location = document.getElementById('editStaffLocation')?.value.trim();
        emp.campaign_enabled = document.getElementById('editStaffCampaignEnabled')?.checked ? 1 : 0;

        saveDataStore(emp, true);
        renderOverviewTable();
        updateHeaderMetrics();
        close();
        showToast('✓ Staff member updated and saved to server database.');
      });
    }

    if (btnPreview) {
      btnPreview.addEventListener('click', () => {
        const origEmail = document.getElementById('editStaffOriginalEmail')?.value;
        const emp = staffList.find(s => s.email === origEmail);
        if (emp) {
          activeEditingEmployee = emp;
          close();
          switchTab('installation');
        }
      });
    }
  }

  function openEditModal(user) {
    const modal = document.getElementById('editStaffModal');
    if (!modal) return;

    setVal('editStaffOriginalEmail', user.email);
    setVal('editStaffFirstName', user.firstName || '');
    setVal('editStaffLastName', user.lastName || '');
    setVal('editStaffRole', user.role || 'Staff');
    setVal('editStaffDept', user.department || '');
    setVal('editStaffTitle', user.title || '');
    setVal('editStaffEmail', user.email || '');
    setVal('editStaffPhone', user.phone || user.mobile || '');
    setVal('editStaffCompany', user.company || 'OS Business Amplifier');
    setVal('editStaffLocation', user.location || '');

    const cp = document.getElementById('editStaffCampaignEnabled');
    if (cp) {
      cp.checked = (user.campaign_enabled !== undefined && user.campaign_enabled !== null) ? !!user.campaign_enabled : true;
    }

    modal.classList.add('active');
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `mc-toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

})();
