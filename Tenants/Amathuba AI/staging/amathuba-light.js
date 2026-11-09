/* ==========================================================================
   Amathuba AI Mailfooter Light Suite - Production Staging Engine
   Built on the Proven OS Holdings (OSH) Quality Architecture
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
  const STORAGE_KEY = 'amathuba_mailfooter_staff_v1';
  let staffList = [];
  let currentTab = 'overview';
  let currentOverviewSubtab = 'all';
  let activeEditingEmployee = null;
  let simulatedDarkMode = false;
  let saveDebounceTimer = null;

  const DEFAULT_DIRECTORY_SEED = [
    {
      id: 'amathuba-001',
      firstName: 'Nomsa',
      lastName: 'Nteleko',
      role: 'Director',
      title: 'Chief Commercial Officer',
      department: 'Executive',
      email: 'nomsa@amathuba-ai.com',
      phone: '+27 76 790 2923',
      mobile: '+27 76 790 2923',
      company: 'Amathuba AI',
      location: 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014',
      primaryColor: '#8B1E2D',
      secondaryColor: '#D92338',
      web: 'https://www.amathuba-ai.com',
      logo: 'assets/logo.png',
      linkedin: 'https://za.linkedin.com/company/amathuba-ai',
      twitter: 'https://x.com/AmathubaA',
      facebook: 'https://www.facebook.com/AmathubaAI/',
      instagram: 'https://www.instagram.com/amathubaai/',
      youtube: '',
      template: 'amathuba-signature',
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
    try {
      const resp = await fetch('api/users.php?client=amathuba-ai.com&action=list');
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.success && Array.isArray(data.users) && data.users.length > 0) {
          staffList = data.users;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList)); } catch (e) {}
          updateHeaderMetrics();
          renderOverviewTable();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read from server API, trying localStorage:', e);
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          staffList = parsed;
          updateHeaderMetrics();
          renderOverviewTable();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }

    staffList = [...DEFAULT_DIRECTORY_SEED];
    updateHeaderMetrics();
    renderOverviewTable();
    saveDataStore(staffList[0]);
  }

  function saveDataStore(userToSave) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    const target = userToSave || activeEditingEmployee;
    if (target && target.email) {
      if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(() => {
        fetch('api/users.php?client=amathuba-ai.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(target)
        })
        .then(r => r.json())
        .then(res => {
          if (res && res.success) {
            console.log('Saved to server SQLite DB:', target.email);
          }
        })
        .catch(err => console.error('Failed to sync with server API:', err));
      }, 250);
    }
  }

  async function deleteUserFromServer(email) {
    if (!email) return;
    try {
      await fetch('api/users.php?client=amathuba-ai.com', {
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
          <div class="stat-caption">Leadership tier signatures</div>
        </div>
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">Staff Members</span>
            <span class="stat-icon-wrapper icon-emerald">⚡</span>
          </div>
          <div class="stat-value" id="statStaffCount">${staff}</div>
          <div class="stat-caption">Commercial &amp; operations team</div>
        </div>
      `;
    }
  }

  // -------------------------------------------------------------
  // Signature Rendering Engine (OSH Architecture Parity)
  // -------------------------------------------------------------
  function renderAmathubaSignature(user, isDarkSimulator = false) {
    const isDark = isDarkSimulator;
    const cardBg = isDark ? '#0f172a' : '#ffffff';
    const cardGradient = isDark ? 'none' : 'linear-gradient(#ffffff, #ffffff)';
    const nameColor = isDark ? '#f8fafc' : '#1e293b';
    const titleColor = isDark ? '#ef4444' : '#8B1E2D';
    const subtitleColor = isDark ? '#94a3b8' : '#64748b';
    const textColor = isDark ? '#cbd5e1' : '#1e293b';
    const subtextColor = isDark ? '#94a3b8' : '#475569';
    const dividerColor = isDark ? '#334155' : '#d2d2d2';

    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Nomsa Nteleko';
    const title = user.title || 'Chief Commercial Officer';
    const department = user.department || 'Amathuba Artificial Intelligence';
    const phone = user.phone || user.mobile || '+27 76 790 2923';
    const email = user.email || 'nomsa@amathuba-ai.com';
    const web = user.web || 'https://www.amathuba-ai.com';
    const webDisplay = web.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const location = user.location || 'Atrium on 5th, 9th Floor, 5th St Sandton, 2014';
    const isCampaignEnabled = (user.campaign_enabled !== undefined && user.campaign_enabled !== null)
      ? (user.campaign_enabled !== false && user.campaign_enabled !== 0 && user.campaign_enabled !== '0')
      : true;

    // Assets
    const brandTopLeft = makeAbsolute('assets/brand-graphic-colour-top-left-2x.png');
    const logoImg = makeAbsolute('assets/logo-2x.png');
    const ctaHeader = makeAbsolute('assets/cta-banner-header.png');
    const btnDemo = makeAbsolute('assets/btn-request-a-demo.png');
    const btnAskNandi = makeAbsolute('assets/btn-ask-nandi.png');
    const btnKhulisa = makeAbsolute('assets/btn-khulisa.png');
    const btnIntelidocs = makeAbsolute('assets/btn-intelidocs.png');
    const btnSmartContracts = makeAbsolute('assets/btn-smart-contracts.png');
    const btnCommercial = makeAbsolute('assets/btn-commercial-intelligence.png');

    const iconPhone = makeAbsolute('assets/icon-phone-2x.png');
    const iconEmail = makeAbsolute('assets/icon-email-2x.png');
    const iconWeb = makeAbsolute('assets/icon-web-2x.png');
    const iconLocation = makeAbsolute('assets/icon-location-2x.png');

    const socialLinkedin = makeAbsolute('assets/social-linkedin.png');
    const socialInstagram = makeAbsolute('assets/social-instagram.png');
    const socialTwitter = makeAbsolute('assets/social-twitter.png');
    const socialFacebook = makeAbsolute('assets/social-facebook.png');
    const socialYoutube = makeAbsolute('assets/social-youtube.png');

    const partnerOsh = makeAbsolute('assets/our-partners-osh-logo.png');
    const partnerSage = makeAbsolute('assets/our-partners-sage-logo.png');
    const partnerAskelie = makeAbsolute('assets/our-partners-askelie-logo.png');
    const motifBottomRight = makeAbsolute('assets/brand-graphic-grey-bottom-right.png');

    // Middle Slice (6 Independent Clickable Action Buttons)
    const campaignSlice = isCampaignEnabled ? `
      <!-- SLICE 02: AI PRODUCTS CAMPAIGN BANNER (6-BUTTON CLICKABLE SLICED SUITE) -->
      <tr>
        <td valign="top" style="padding: 0; line-height: 0; font-size: 0; background-color: #0c141f; border: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="600" style="width: 600px; max-width: 600px; border-collapse: collapse; border: 0; line-height: 0; font-size: 0;">
            <!-- Row 1: Top Headline Banner -->
            <tr>
              <td colspan="6" valign="top" width="600" height="58" style="width: 600px; height: 58px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${ctaHeader}" alt="Amathuba AI - Join The Revolution" width="600" height="58" style="border: 0; display: block; width: 600px; height: 58px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
            </tr>
            <!-- Row 2: 6 Independent Clickable Action Buttons -->
            <tr>
              <!-- 1. Request a Demo -->
              <td valign="top" width="187" height="54" style="width: 187px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Request a Demo" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnDemo}" alt="Request a Demo" width="187" height="54" style="border: 0; display: block; width: 187px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
              <!-- 2. Ask Nandi -->
              <td valign="top" width="82" height="54" style="width: 82px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Ask Nandi" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnAskNandi}" alt="Ask Nandi" width="82" height="54" style="border: 0; display: block; width: 82px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
              <!-- 3. Khulisa -->
              <td valign="top" width="83" height="54" style="width: 83px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Khulisa" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnKhulisa}" alt="Khulisa" width="83" height="54" style="border: 0; display: block; width: 83px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
              <!-- 4. Intelidocs -->
              <td valign="top" width="83" height="54" style="width: 83px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Intelidocs" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnIntelidocs}" alt="Intelidocs" width="83" height="54" style="border: 0; display: block; width: 83px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
              <!-- 5. Smart Contracts -->
              <td valign="top" width="83" height="54" style="width: 83px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Smart Contracts" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnSmartContracts}" alt="Smart Contracts" width="83" height="54" style="border: 0; display: block; width: 83px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
              <!-- 6. Commercial Intelligence -->
              <td valign="top" width="82" height="54" style="width: 82px; height: 54px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                <a href="https://www.amathuba-ai.com" target="_blank" title="Commercial Intelligence" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                  <img src="${btnCommercial}" alt="Commercial Intelligence" width="82" height="54" style="border: 0; display: block; width: 82px; height: 54px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    ` : '';

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
      <table role="presentation" width="600" align="left" cellpadding="0" cellspacing="0" border="0" style="width: 600px;">
      <tr>
        <td width="600" valign="top">
      <![endif]-->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="amathuba-card" style="width: 600px; max-width: 600px; background-color: ${cardBg}; font-family: Arial, 'Segoe UI', Candara, sans-serif; border: 0; border-collapse: collapse; border-radius: 4px; overflow: hidden; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        
        <!-- SLICE 01: IDENTITY & CONTACT (Strict 572px inner width: 145 + 1 + 230 + 196) -->
        <tr>
          <td valign="middle" style="padding: 14px 14px 12px 14px; background-color: ${cardBg}; border: 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="572" style="width: 572px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <!-- Brand Graphic & Logo (145px) -->
                <td valign="middle" width="145" style="width: 145px; text-align: left; line-height: 0; font-size: 0; border: 0; padding: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="128" style="width: 128px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td valign="middle" width="58" style="width: 58px; line-height: 0; font-size: 0; padding: 0; padding-right: 6px; border: 0;">
                        <img src="${brandTopLeft}" alt="Brand Graphic" width="58" height="65" style="border: 0; display: block; width: 58px; height: 65px;" />
                      </td>
                      <td valign="middle" width="64" style="width: 64px; line-height: 0; font-size: 0; padding: 0; border: 0;">
                        <a href="https://www.amathuba-ai.com" target="_blank" style="text-decoration: none; display: block; line-height: 0; border: 0;">
                          <img src="${logoImg}" alt="Amathuba AI Logo" width="64" height="63" style="border: 0; display: block; width: 64px; height: 63px;" />
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- Vertical Line Divider (1px) -->
                <td valign="middle" width="1" style="width: 1px; min-width: 1px; background-color: ${dividerColor}; font-size: 0px; line-height: 0px; padding: 0; border: 0;">&nbsp;</td>

                <!-- Name & Title (230px) -->
                <td valign="middle" width="230" style="width: 230px; padding-left: 14px; padding-right: 8px; text-align: left; border: 0;">
                  <p style="margin: 0; padding: 0; font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 16px; font-weight: 800; color: ${nameColor}; text-transform: uppercase; letter-spacing: 0.3px; line-height: 18px; mso-line-height-rule: exactly;">
                    ${name}
                  </p>
                  <p style="margin: 0; padding: 0; margin-top: 3px; font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 11px; font-weight: 700; color: ${titleColor}; text-transform: uppercase; letter-spacing: 0.5px; line-height: 14px; mso-line-height-rule: exactly;">
                    ${title}
                  </p>
                  <p style="margin: 0; padding: 0; margin-top: 4px; font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 8.5px; font-weight: 700; color: ${subtitleColor}; text-transform: uppercase; letter-spacing: 0.8px; line-height: 11px; mso-line-height-rule: exactly;">
                    ${department}
                  </p>
                </td>

                <!-- Contact Details (196px) -->
                <td valign="middle" width="196" style="width: 196px; text-align: left; border: 0; padding: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: Arial, 'Segoe UI', Candara, sans-serif; font-size: 10px; color: ${textColor}; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    ${phone ? `
                    <tr>
                      <td valign="middle" width="20" style="width: 20px; padding-bottom: 4px; line-height: 0; font-size: 0; border: 0;">
                        <img src="${iconPhone}" alt="P" width="15" height="15" style="border: 0; display: block; width: 15px; height: 15px;" />
                      </td>
                      <td valign="middle" style="padding-bottom: 4px; font-weight: 500; font-size: 10px; line-height: 14px; mso-line-height-rule: exactly; color: ${textColor}; border: 0;">
                        ${phone}
                      </td>
                    </tr>` : ''}

                    ${email ? `
                    <tr>
                      <td valign="middle" width="20" style="width: 20px; padding-bottom: 4px; line-height: 0; font-size: 0; border: 0;">
                        <img src="${iconEmail}" alt="E" width="15" height="15" style="border: 0; display: block; width: 15px; height: 15px;" />
                      </td>
                      <td valign="middle" style="padding-bottom: 4px; font-weight: 500; font-size: 10px; line-height: 14px; mso-line-height-rule: exactly; border: 0;">
                        <a href="mailto:${email}" style="color: ${textColor}; text-decoration: none;">${email}</a>
                      </td>
                    </tr>` : ''}

                    ${web ? `
                    <tr>
                      <td valign="middle" width="20" style="width: 20px; padding-bottom: 4px; line-height: 0; font-size: 0; border: 0;">
                        <img src="${iconWeb}" alt="W" width="15" height="15" style="border: 0; display: block; width: 15px; height: 15px;" />
                      </td>
                      <td valign="middle" style="padding-bottom: 4px; font-weight: 500; font-size: 10px; line-height: 14px; mso-line-height-rule: exactly; border: 0;">
                        <a href="${web}" target="_blank" style="color: ${textColor}; text-decoration: none;">${webDisplay}</a>
                      </td>
                    </tr>` : ''}

                    ${location ? `
                    <tr>
                      <td valign="middle" width="20" style="width: 20px; line-height: 0; font-size: 0; border: 0;">
                        <img src="${iconLocation}" alt="L" width="15" height="15" style="border: 0; display: block; width: 15px; height: 15px;" />
                      </td>
                      <td valign="middle" style="font-weight: 500; font-size: 9px; line-height: 13px; mso-line-height-rule: exactly; color: ${subtextColor}; border: 0;">
                        ${location}
                      </td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${campaignSlice}

        <!-- SLICE 03: FOOTER (No inline-table; explicit aligned table grids) -->
        <tr>
          <td valign="middle" height="48" style="height: 48px; padding: 6px 14px; background-color: ${cardBg}; border: 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="572" style="width: 572px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tr>
                <!-- Left: 5 Fixed Social Icons (125px) -->
                <td valign="middle" width="125" align="left" style="width: 125px; line-height: 0; font-size: 0; border: 0; padding: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" width="120" style="width: 120px; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td valign="middle" width="24" height="17" style="width: 24px; height: 17px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                        <a href="${user.linkedin || 'https://za.linkedin.com/company/amathuba-ai'}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${socialLinkedin}" alt="LinkedIn" width="24" height="17" style="border: 0; display: block; width: 24px; height: 17px;" />
                        </a>
                      </td>
                      <td valign="middle" width="24" height="17" style="width: 24px; height: 17px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                        <a href="${user.instagram || 'https://www.instagram.com/amathubaai/'}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${socialInstagram}" alt="Instagram" width="24" height="17" style="border: 0; display: block; width: 24px; height: 17px;" />
                        </a>
                      </td>
                      <td valign="middle" width="24" height="17" style="width: 24px; height: 17px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                        <a href="${user.twitter || 'https://x.com/AmathubaA'}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${socialTwitter}" alt="X" width="24" height="17" style="border: 0; display: block; width: 24px; height: 17px;" />
                        </a>
                      </td>
                      <td valign="middle" width="24" height="17" style="width: 24px; height: 17px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                        <a href="${user.facebook || 'https://www.facebook.com/AmathubaAI/'}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${socialFacebook}" alt="Facebook" width="24" height="17" style="border: 0; display: block; width: 24px; height: 17px;" />
                        </a>
                      </td>
                      <td valign="middle" width="24" height="17" style="width: 24px; height: 17px; padding: 0; line-height: 0; font-size: 0; border: 0;">
                        <a href="${user.youtube || 'https://www.amathuba-ai.com'}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${socialYoutube}" alt="YouTube" width="24" height="17" style="border: 0; display: block; width: 24px; height: 17px;" />
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- Center: Partners Badges (377px) -->
                <td valign="middle" width="377" align="center" style="width: 377px; text-align: center; border: 0; padding: 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                    <tr>
                      <td valign="middle" style="padding-right: 10px; font-size: 11px; font-weight: 800; color: ${textColor}; font-family: Arial, 'Segoe UI', Candara, sans-serif; border: 0; white-space: nowrap;">
                        Our Partners:
                      </td>
                      <td valign="middle" style="padding-right: 12px; line-height: 0; font-size: 0; border: 0;">
                        <a href="https://os-holdings.co.za" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                          <img src="${partnerOsh}" alt="OS Holdings" width="75" height="19" style="border: 0; display: block; width: 75px; height: 19px;" />
                        </a>
                      </td>
                      <td valign="middle" style="padding-right: 12px; line-height: 0; font-size: 0; border: 0;">
                        <img src="${partnerSage}" alt="Sage Partner" width="70" height="22" style="border: 0; display: block; width: 70px; height: 22px;" />
                      </td>
                      <td valign="middle" style="line-height: 0; font-size: 0; border: 0;">
                        <img src="${partnerAskelie}" alt="Askelie" width="24" height="23" style="border: 0; display: block; width: 24px; height: 23px;" />
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- Right: Subtle Motif Graphic (70px) -->
                <td valign="middle" width="70" align="right" style="width: 70px; text-align: right; line-height: 0; font-size: 0; border: 0; padding: 0;">
                  <img src="${motifBottomRight}" alt="Motif" width="48" height="48" style="border: 0; display: block; width: 48px; height: 48px;" align="right" />
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
  // -------------------------------------------------------------
  // Overview Directory Table Engine
  // -------------------------------------------------------------
  function initOverviewTable() {
    const searchInput = document.getElementById('tableSearchInput');
    const deptFilter = document.getElementById('tableDeptFilter');
    if (searchInput) searchInput.addEventListener('input', renderOverviewTable);
    if (deptFilter) deptFilter.addEventListener('change', renderOverviewTable);

    document.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentOverviewSubtab = e.currentTarget.getAttribute('data-subtab');
        renderOverviewTable();
      });
    });

    const purgeBtn = document.getElementById('btnPurgeDemoToolbar');
    if (purgeBtn) {
      purgeBtn.addEventListener('click', () => {
        if (confirm('Reset directory to initial default (Nomsa Nteleko)?')) {
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

    const query = (document.getElementById('tableSearchInput')?.value || '').toLowerCase().trim();
    const deptVal = document.getElementById('tableDeptFilter')?.value || 'ALL';

    const depts = new Set();
    staffList.forEach(s => {
      if (s.department) depts.add(s.department.trim());
    });
    const filterSelect = document.getElementById('tableDeptFilter');
    if (filterSelect) {
      const current = filterSelect.value;
      filterSelect.innerHTML = '<option value="ALL">All Departments</option>';
      Array.from(depts).sort().forEach(d => {
        filterSelect.innerHTML += `<option value="${d}" ${d === current ? 'selected' : ''}>${d}</option>`;
      });
    }

    let filtered = staffList.filter(user => {
      if (currentOverviewSubtab === 'managers') {
        const r = (user.role || '').toLowerCase();
        const t = (user.title || '').toLowerCase();
        if (r !== 'director' && r !== 'manager' && !t.includes('director') && !t.includes('manager') && !t.includes('head')) return false;
      } else if (currentOverviewSubtab === 'staff') {
        const r = (user.role || '').toLowerCase();
        const t = (user.title || '').toLowerCase();
        if (r === 'director' || r === 'manager' || t.includes('director') || t.includes('manager') || t.includes('head')) return false;
      }

      if (deptVal !== 'ALL' && (user.department || '').trim() !== deptVal) return false;

      if (query) {
        const hay = `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''} ${user.title || ''} ${user.department || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    const countLabel = document.getElementById('tableShowingCount');
    if (countLabel) countLabel.textContent = `Showing ${filtered.length} of ${staffList.length} personnel`;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
            No personnel found matching the specified filters.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Personnel';
      const role = user.role || 'Staff';
      const roleClass = role === 'Director' ? 'tag-director' : (role === 'Manager' ? 'tag-manager' : 'tag-staff');

      rowsHtml += `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${fullName}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 1px;">${user.title || 'Team Member'}</div>
          </td>
          <td>
            <span class="role-tag ${roleClass}">${role}</span>
          </td>
          <td>
            <span style="font-size: 13px; color: var(--text-secondary);">${user.department || 'General'}</span>
          </td>
          <td>
            <span style="font-size: 13px; font-weight: 500;">${user.email}</span>
          </td>
          <td>
            <span style="font-size: 13px; color: var(--text-secondary);">${user.phone || '+27 76 790 2923'}</span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="mc-btn mc-btn-sm mc-btn-emerald btn-copy-rich action-btn-emerald" data-email="${user.email}" title="Single-click rich text clipboard delivery">
              📋 Copy Rich Text
            </button>
            <button class="mc-btn mc-btn-sm mc-btn-dark btn-quick-preview action-btn-preview" data-email="${user.email}" title="Open Live Preview Studio">
              🎨 Preview
            </button>
            <button class="mc-btn mc-btn-sm mc-btn-dark btn-quick-edit action-btn-edit" data-email="${user.email}" title="Edit personnel record">
              ✎ Edit
            </button>
            <button class="mc-btn mc-btn-sm btn-quick-del action-btn-delete" data-email="${user.email}" title="Remove personnel record">
              ✕
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = rowsHtml;

    // Attach actions
    tbody.querySelectorAll('.btn-copy-rich').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        const emp = staffList.find(s => s.email === em);
        if (emp) copyRichTextToClipboard(emp);
      });
    });

    tbody.querySelectorAll('.btn-quick-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const em = e.currentTarget.getAttribute('data-email');
        const emp = staffList.find(s => s.email === em);
        if (emp) openInInstallationStudio(emp);
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

  // -------------------------------------------------------------
  // Clipboard Rich Text Copy Trigger
  // -------------------------------------------------------------
  async function copyRichTextToClipboard(user) {
    const html = renderAmathubaSignature(user, false);
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobText = new Blob([html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
        showToast(`✓ Rich-text signature copied for ${user.firstName || 'Employee'}! Paste directly into Outlook/Apple Mail.`);
        return;
      }
    } catch (e) {
      console.warn('ClipboardItem failed, using fallback:', e);
    }

    // Fallback via contenteditable div selection
    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.innerHTML = html;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(`✓ Rich-text signature copied for ${user.firstName || 'Employee'}! Paste directly into Outlook/Apple Mail.`);
  }

  // -------------------------------------------------------------
  // Bulk CSV Ingestion Engine
  // -------------------------------------------------------------
  function initBulkAddTab() {
    const ingestBtn = document.getElementById('ingestDataBtn');
    const loadSampleBtn = document.getElementById('loadSampleCsvBtn');
    const downloadSampleBtn = document.getElementById('downloadSampleCsvBtn');
    const downloadBlankBtn = document.getElementById('downloadBlankCsvBtn');
    const textArea = document.getElementById('csvTextArea');

    const sampleCsv = `First Name, Surname, Role, Job Title, Department, Email Address, Phone Number, Mobile Number, Company, Location
Nomsa, Nteleko, Director, Chief Commercial Officer, Executive, nomsa@amathuba-ai.com, +27 76 790 2923, +27 76 790 2923, Amathuba AI, Atrium on 5th Sandton
Thabo, Khumalo, Manager, Lead AI Solutions Architect, Engineering, thabo.k@amathuba-ai.com, +27 76 790 2924, +27 76 790 2924, Amathuba AI, Sandton
Lindiwe, Sithole, Staff, Senior Commercial Intelligence Specialist, Commercial, lindiwe@amathuba-ai.com, +27 76 790 2925, +27 76 790 2925, Amathuba AI, Sandton`;

    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        if (textArea) textArea.value = sampleCsv;
        showToast('Sample CSV loaded into textarea.');
      });
    }

    if (downloadSampleBtn) {
      downloadSampleBtn.addEventListener('click', () => {
        downloadFile('Amathuba-AI-Staff-Sample.csv', sampleCsv);
      });
    }

    if (downloadBlankBtn) {
      downloadBlankBtn.addEventListener('click', () => {
        const blank = 'First Name, Surname, Role, Job Title, Department, Email Address, Phone Number, Mobile Number, Company, Location\n';
        downloadFile('Amathuba-AI-Staff-Template.csv', blank);
      });
    }

    if (ingestBtn) {
      ingestBtn.addEventListener('click', processCsvIngestion);
    }

    // Drag & drop file handling
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileRead(file);
      });
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-active'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileRead(e.dataTransfer.files[0]);
        }
      });
    }
  }

  function handleFileRead(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const txt = e.target.result;
      const textArea = document.getElementById('csvTextArea');
      if (textArea) textArea.value = txt;
      document.getElementById('dropzoneFileName').textContent = `Loaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      showToast(`Loaded ${file.name}. Click 'Process & Ingest Data' to import.`);
    };
    reader.readAsText(file);
  }

  function processCsvIngestion() {
    const textArea = document.getElementById('csvTextArea');
    const reportBox = document.getElementById('ingestReportBox');
    if (!textArea || !textArea.value.trim()) {
      alert('Please paste or upload a spreadsheet first.');
      return;
    }

    const mode = document.querySelector('input[name="csvImportMode"]:checked')?.value || 'merge';
    const lines = textArea.value.trim().split(/\r?\n/);
    if (lines.length < 2) {
      alert('Spreadsheet requires at least one header line and one data row.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/["']/g, ''));
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || '';
      });

      const email = obj['email address'] || obj['email'] || '';
      if (!email || !email.includes('@')) continue;

      const fName = obj['first name'] || obj['firstname'] || obj['name'] || '';
      const lName = obj['surname'] || obj['last name'] || obj['lastname'] || '';
      const role = obj['role'] || obj['seniority tier'] || 'Staff';
      const title = obj['job title'] || obj['title'] || 'Specialist';
      const dept = obj['department'] || obj['dept'] || 'Commercial';
      const phone = obj['phone number'] || obj['phone'] || obj['mobile'] || '+27 76 790 2923';

      parsed.push({
        id: 'amathuba-' + Date.now() + '-' + i,
        firstName: fName,
        lastName: lName,
        role: role,
        title: title,
        department: dept,
        email: email,
        phone: phone,
        mobile: phone,
        company: 'Amathuba AI',
        location: obj['location'] || 'Atrium on 5th, Sandton',
        primaryColor: '#8B1E2D',
        secondaryColor: '#D92338',
        web: 'https://www.amathuba-ai.com',
        logo: 'assets/logo.png',
        template: 'amathuba-signature',
        campaign_enabled: 1
      });
    }

    if (parsed.length === 0) {
      alert('Could not find any valid records with email addresses.');
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
      fetch('api/users.php?client=amathuba-ai.com', {
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
          ✓ Successfully ingested ${parsed.length} personnel records into Amathuba AI directory (${mode === 'replace' ? 'Full Replacement' : 'Merged'}).
        </div>
      `;
    }
    showToast(`Successfully ingested ${parsed.length} records.`);
  }

  // -------------------------------------------------------------
  // Live Preview Studio (Tab 3)
  // -------------------------------------------------------------
  function initInstallationTab() {
    const sel = document.getElementById('activeEmpSelect');
    if (sel) {
      sel.addEventListener('change', () => {
        const emp = staffList.find(s => s.email === sel.value);
        if (emp) loadEmployeeIntoLiveForm(emp);
      });
    }

    const formInputs = [
      'inputFirstName', 'inputLastName', 'inputRole', 'inputDepartment',
      'inputJobTitle', 'inputEmail', 'inputPhone', 'inputCompany', 'inputLocation',
      'inputPrimaryColor', 'inputSecondaryColor', 'inputCampaignEnabled'
    ];
    formInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateSignatureFromLiveForm);
        el.addEventListener('change', updateSignatureFromLiveForm);
      }
    });

    const btnLight = document.getElementById('btnSimLightMode');
    const btnDark = document.getElementById('btnSimDarkMode');
    if (btnLight && btnDark) {
      btnLight.addEventListener('click', () => {
        simulatedDarkMode = false;
        btnLight.classList.add('active');
        btnDark.classList.remove('active');
        updateSignatureFromLiveForm();
      });
      btnDark.addEventListener('click', () => {
        simulatedDarkMode = true;
        btnDark.classList.add('active');
        btnLight.classList.remove('active');
        updateSignatureFromLiveForm();
      });
    }

    const btnSaveCloud = document.getElementById('btnSaveEmployeeCloud');
    if (btnSaveCloud) {
      btnSaveCloud.addEventListener('click', () => {
        if (!activeEditingEmployee) return;
        saveActiveEmployeeChanges();
        showToast('✓ Personnel record updated and saved.');
      });
    }

    // Action triggers in footer
    const copyRichBtn = document.getElementById('btnFooterCopyRichText');
    if (copyRichBtn) {
      copyRichBtn.addEventListener('click', () => {
        if (activeEditingEmployee) copyRichTextToClipboard(activeEditingEmployee);
      });
    }

    const copyHtmlBtn = document.getElementById('btnFooterCopyHtml');
    if (copyHtmlBtn) {
      copyHtmlBtn.addEventListener('click', () => {
        if (activeEditingEmployee) {
          const html = renderAmathubaSignature(activeEditingEmployee, false);
          navigator.clipboard.writeText(html).then(() => {
            showToast('✓ HTML code copied to clipboard!');
          });
        }
      });
    }

    const downloadBtn = document.getElementById('btnFooterDownloadHtml');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (activeEditingEmployee) {
          const html = renderAmathubaSignature(activeEditingEmployee, false);
          downloadFile(`${activeEditingEmployee.firstName || 'amathuba'}-signature.html`, html);
        }
      });
    }
  }

  function openInInstallationStudio(user) {
    switchTab('installation');
    populateEmpSelect();
    const sel = document.getElementById('activeEmpSelect');
    if (sel) sel.value = user.email;
    loadEmployeeIntoLiveForm(user);
  }

  function populateEmpSelect() {
    const sel = document.getElementById('activeEmpSelect');
    if (!sel) return;
    sel.innerHTML = staffList.map(s => {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email;
      return `<option value="${s.email}">${name} (${s.title || 'Staff'})</option>`;
    }).join('');
  }

  function loadEmployeeIntoLiveForm(user) {
    activeEditingEmployee = { ...user };
    document.getElementById('inputFirstName').value = user.firstName || '';
    document.getElementById('inputLastName').value = user.lastName || '';
    document.getElementById('inputRole').value = user.role || 'Staff';
    document.getElementById('inputDepartment').value = user.department || '';
    document.getElementById('inputJobTitle').value = user.title || '';
    document.getElementById('inputEmail').value = user.email || '';
    document.getElementById('inputPhone').value = user.phone || user.mobile || '';
    document.getElementById('inputCompany').value = user.company || 'Amathuba AI';
    document.getElementById('inputLocation').value = user.location || '';
    document.getElementById('inputPrimaryColor').value = user.primaryColor || '#8B1E2D';
    document.getElementById('inputSecondaryColor').value = user.secondaryColor || '#D92338';
    document.getElementById('inputCampaignEnabled').checked = user.campaign_enabled !== 0;

    const sender = document.getElementById('mailPreviewSender');
    if (sender) sender.textContent = `${user.firstName || ''} ${user.lastName || ''} <${user.email}>`;

    updateSignatureFromLiveForm();
  }

  function updateSignatureFromLiveForm() {
    if (!activeEditingEmployee) {
      activeEditingEmployee = staffList[0] ? { ...staffList[0] } : {};
    }
    activeEditingEmployee.firstName = document.getElementById('inputFirstName')?.value || '';
    activeEditingEmployee.lastName = document.getElementById('inputLastName')?.value || '';
    activeEditingEmployee.role = document.getElementById('inputRole')?.value || 'Staff';
    activeEditingEmployee.department = document.getElementById('inputDepartment')?.value || '';
    activeEditingEmployee.title = document.getElementById('inputJobTitle')?.value || '';
    activeEditingEmployee.email = document.getElementById('inputEmail')?.value || '';
    activeEditingEmployee.phone = document.getElementById('inputPhone')?.value || '';
    activeEditingEmployee.company = document.getElementById('inputCompany')?.value || 'Amathuba AI';
    activeEditingEmployee.location = document.getElementById('inputLocation')?.value || '';
    activeEditingEmployee.primaryColor = document.getElementById('inputPrimaryColor')?.value || '#8B1E2D';
    activeEditingEmployee.secondaryColor = document.getElementById('inputSecondaryColor')?.value || '#D92338';
    activeEditingEmployee.campaign_enabled = document.getElementById('inputCampaignEnabled')?.checked ? 1 : 0;

    const viewport = document.getElementById('signatureCanvasViewport');
    if (viewport) {
      viewport.innerHTML = renderAmathubaSignature(activeEditingEmployee, simulatedDarkMode);
      if (simulatedDarkMode) {
        viewport.style.backgroundColor = '#0f172a';
      } else {
        viewport.style.backgroundColor = '#ffffff';
      }
    }
  }

  function saveActiveEmployeeChanges() {
    if (!activeEditingEmployee) return;
    const idx = staffList.findIndex(s => s.email === activeEditingEmployee.email);
    if (idx >= 0) staffList[idx] = { ...activeEditingEmployee };
    else staffList.push({ ...activeEditingEmployee });
    saveDataStore();
    parsed.forEach(u => {
      fetch('api/users.php?client=amathuba-ai.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(u)
      }).catch(() => {});
    });
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

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => modal.classList.add('active'));
    }
    const close = () => modal && modal.classList.remove('active');
    if (btnClose) btnClose.addEventListener('click', close);
    if (btnCancel) btnCancel.addEventListener('click', close);

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => {
        const fName = document.getElementById('addStaffFirstName')?.value.trim();
        const lName = document.getElementById('addStaffLastName')?.value.trim();
        const email = document.getElementById('addStaffEmail')?.value.trim();
        const title = document.getElementById('addStaffTitle')?.value.trim();
        if (!fName || !lName || !email || !title) {
          alert('Please fill in First Name, Last Name, Job Title, and Email.');
          return;
        }

        const newUser = {
          id: 'amathuba-' + Date.now(),
          firstName: fName,
          lastName: lName,
          role: document.getElementById('addStaffRole')?.value || 'Staff',
          department: document.getElementById('addStaffDept')?.value.trim() || 'Commercial',
          title: title,
          email: email,
          phone: document.getElementById('addStaffPhone')?.value.trim() || '+27 76 790 2923',
          company: 'Amathuba AI',
          location: 'Atrium on 5th, Sandton',
          primaryColor: '#8B1E2D',
          secondaryColor: '#D92338',
          web: 'https://www.amathuba-ai.com',
          logo: 'assets/logo.png',
          template: 'amathuba-signature',
          campaign_enabled: document.getElementById('addStaffCampaignEnabled')?.checked ? 1 : 0
        };

        staffList.push(newUser);
        saveDataStore(newUser);
        renderOverviewTable();
        updateHeaderMetrics();
        close();
        showToast(`Added ${fName} ${lName} to directory.`);
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

        saveDataStore(emp);
        renderOverviewTable();
        updateHeaderMetrics();
        close();
        showToast('✓ Staff member updated.');
      });
    }

    if (btnPreview) {
      btnPreview.addEventListener('click', () => {
        const origEmail = document.getElementById('editStaffOriginalEmail')?.value;
        const emp = staffList.find(s => s.email === origEmail);
        if (emp) {
          close();
          openInInstallationStudio(emp);
        }
      });
    }
  }

  function openEditModal(emp) {
    const modal = document.getElementById('editStaffModal');
    if (!modal) return;
    document.getElementById('editStaffOriginalEmail').value = emp.email;
    document.getElementById('editStaffFirstName').value = emp.firstName || '';
    document.getElementById('editStaffLastName').value = emp.lastName || '';
    document.getElementById('editStaffRole').value = emp.role || 'Staff';
    document.getElementById('editStaffDept').value = emp.department || '';
    document.getElementById('editStaffTitle').value = emp.title || '';
    document.getElementById('editStaffEmail').value = emp.email || '';
    document.getElementById('editStaffPhone').value = emp.phone || '';
    document.getElementById('editStaffCompany').value = emp.company || 'Amathuba AI';
    document.getElementById('editStaffLocation').value = emp.location || '';
    document.getElementById('editStaffCampaignEnabled').checked = emp.campaign_enabled !== 0;

    modal.classList.add('active');
  }

  // -------------------------------------------------------------
  // Tab Navigation & Helpers
  // -------------------------------------------------------------
  function initTabNavigation() {
    document.querySelectorAll('.tab-nav-item').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-tab');
        switchTab(target);
      });
    });

    const exportBtn = document.getElementById('btnFooterExportData');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportDirectoryCsv);
    }
  }

  function switchTab(tabId) {
    currentTab = tabId;
    document.querySelectorAll('.tab-nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content-pane').forEach(p => p.classList.add('tab-pane-hidden'));

    const activeNav = document.getElementById(`tabNav${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
    const activePane = document.getElementById(`tabPane-${tabId}`);
    if (activeNav) activeNav.classList.add('active');
    if (activePane) activePane.classList.remove('tab-pane-hidden');

    if (tabId === 'installation') {
      populateEmpSelect();
      if (!activeEditingEmployee && staffList[0]) {
        loadEmployeeIntoLiveForm(staffList[0]);
      } else if (activeEditingEmployee) {
        updateSignatureFromLiveForm();
      }
    }
  }

  function exportDirectoryCsv() {
    let csv = 'First Name,Surname,Role,Job Title,Department,Email Address,Contact Phone,Company,Location\n';
    staffList.forEach(s => {
      csv += `"${s.firstName || ''}","${s.lastName || ''}","${s.role || ''}","${s.title || ''}","${s.department || ''}","${s.email}","${s.phone || ''}","${s.company || 'Amathuba AI'}","${s.location || ''}"\n`;
    });
    downloadFile('Amathuba-AI-Staff-Directory.csv', csv);
    showToast('Directory CSV exported.');
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function showToast(msg) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'mc-toast';
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade');
      setTimeout(() => container.removeChild(toast), 400);
    }, 3200);
  }

})();
