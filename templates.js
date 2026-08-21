// Shared Template Rendering Engine for User & Admin Portals
const BASE_URL = window.location.origin + window.location.pathname.replace(/\/(index|app|admin|super-admin|register|light)(\.html)?$/, '').replace(/\/$/, '') + '/';

function makePathsAbsolute(html) {
  if (!html) return '';
  let processed = html;
  
  // Resources directory replacements
  processed = processed.replaceAll('src="Resources/', `src="${BASE_URL}Resources/`);
  processed = processed.replaceAll("src='Resources/", `src='${BASE_URL}Resources/`);
  processed = processed.replaceAll('src=Resources/', `src="${BASE_URL}Resources/`);
  processed = processed.replaceAll('url("Resources/', `url("${BASE_URL}Resources/`);
  processed = processed.replaceAll("url('Resources/", `url('${BASE_URL}Resources/`);
  processed = processed.replaceAll('url(&quot;Resources/', `url(&quot;${BASE_URL}Resources/`);
  processed = processed.replaceAll('url(&#39;Resources/', `url(&#39;${BASE_URL}Resources/`);
  processed = processed.replaceAll('url(Resources/', `url(${BASE_URL}Resources/`);
  
  // MailFooter Resources directory replacements
  processed = processed.replaceAll('src="MailFooter Resources/', `src="${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll("src='MailFooter Resources/", `src='${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll('src=MailFooter Resources/', `src="${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll('url("MailFooter Resources/', `url("${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll("url('MailFooter Resources/", `url('${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll('url(&quot;MailFooter Resources/', `url(&quot;${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll('url(&#39;MailFooter Resources/', `url(&#39;${BASE_URL}MailFooter Resources/`);
  processed = processed.replaceAll('url(MailFooter Resources/', `url(${BASE_URL}MailFooter Resources/`);

  // Signature Blueprints & Templates
  processed = processed.replaceAll('src="Signature Blueprints/', `src="${BASE_URL}Signature Blueprints/`);
  processed = processed.replaceAll("src='Signature Blueprints/", `src='${BASE_URL}Signature Blueprints/`);
  processed = processed.replaceAll('src="templates/', `src="${BASE_URL}templates/`);
  processed = processed.replaceAll("src='templates/", `src='${BASE_URL}templates/`);

  return processed;
}

function renderCustomTemplate(htmlContent, data) {
  let processed = htmlContent;

  // Normalize mapping structure for variables
  const mappings = {
    'user.name': data.name || '',
    'user.title': data.title || '',
    'user.jobTitle': data.title || '',
    'user.dept': data.dept || '',
    'user.department': data.dept || '',
    'user.phone': data.phone || '',
    'user.email': data.email || '',
    'user.website': data.web || '',
    'user.web': data.web || '',
    'user.webTracked': data.webTracked || '#',
    'user.primary': data.primary || '#0d4b8e',
    'user.primary_color': data.primary || '#0d4b8e',
    'user.secondary': data.secondary || '#f18a22',
    'user.secondary_color': data.secondary || '#f18a22',
    'user.linkedin': data.linkedin || '',
    'user.twitter': data.twitter || '',
    'user.instagram': data.instagram || '',
    'user.facebook': data.facebook || '',
    'user.youtube': data.youtube || '',
    'user.location': data.location || '',
    'user.tagline': data.tagline || '',
    'user.disclaimer': data.disclaimer || '',
    'user.headshot': data.headshot || data.photo || '',
    'user.photo': data.headshot || data.photo || '',
    
    'template.logo': data.logo || '',
    'template.tagline': data.tagline || '',
    'template.disclaimer': data.disclaimer || '',
    'template.brand_logo': data.brand_logo || '',
    'template.brand_element_design': data.brand_element_design || data.company_brand_graphic || data.sideImage || '',
    'template.brand_element_pattern': data.brand_element_pattern || '',
    'template.cta_banner': data.campaignImg || '',
    'template.campaignImg': data.campaignImg || '',
    'template.cta_link': data.campaignLink || '#',
    'template.campaignLink': data.campaignLink || '#',
    'template.campaignPartner': data.campaignPartner || '',
    'template.campaignBtn': data.campaignBtn || '',

    // Dynamic Template Engine mappings
    'full_name': data.name || '',
    'designation': data.title || '',
    'department': (data.dept || '').replace(/^\s*\|\s*/, ''),
    'company': data.company || 'OS Holdings',
    'logo': data.logo || '',
    'profile_image': data.headshot || data.photo || '',
    'phone': data.phone || '',
    'mobile': data.phone || '', // fallback to phone if separate mobile field isn't set
    'email': data.email || '',
    'website': data.web || '',
    'location': data.location || '',
    'tagline': data.tagline || '',
    'bio': data.companyBio || '',
    'facebook': data.facebook || '',
    'linkedin': data.linkedin || '',
    'instagram': data.instagram || '',
    'twitter': data.twitter || '',
    'youtube': data.youtube || '',
    'banner_image': data.campaignImg || '',
    'cta_text': data.campaignBtn || 'Request A Demo',
    'cta_url': data.campaignLink || '#',
    'brand_colour': data.primary || '#0d4b8e',
    'brand_colour_hex': (data.primary || '#0d4b8e').replace('#', ''),
    'legal_disclaimer': data.disclaimer || '',

    // Amathuba AI specific settings keys
    'btn_request_demo': data.btn_request_demo || '',
    'btn_ask_nandi': data.btn_ask_nandi || '',
    'btn_khulisa': data.btn_khulisa || '',
    'btn_intelidocs': data.btn_intelidocs || '',
    'btn_smart_contracts': data.btn_smart_contracts || '',
    'btn_commercial_intelligence': data.btn_commercial_intelligence || '',
    'brand_element_design': data.brand_element_design || data.company_brand_graphic || data.sideImage || '',
    'brand_element_pattern': data.brand_element_pattern || '',
    'our_partners_osh': data.our_partners_osh || '',
    'our_partners_sage': data.our_partners_sage || '',
    'our_partners_askelie': data.our_partners_askelie || '',
    'icon_bg': data.icon_bg || '',
    'icon_linkedin': data.icon_linkedin || '',
    'icon_instagram': data.icon_instagram || '',
    'icon_twitter': data.icon_twitter || '',
    'icon_facebook': data.icon_facebook || '',
    'icon_youtube': data.icon_youtube || ''
  };

  // Evaluate conditionals: {% if user.linkedin %} ... {% endif %}
  const condRegex = /\{%\s*if\s+([a-zA-Z0-9_.]+)\s*%}([\s\S]*?)\{%\s*endif\s*%\}/g;
  let hasConditions = true;
  let iterations = 0;
  while (hasConditions && iterations < 15) {
    const prev = processed;
    processed = processed.replace(condRegex, (match, key, content) => {
      const val = mappings[key] !== undefined ? mappings[key] : data[key];
      if (val && val !== '#' && val !== '') {
        return content;
      }
      return '';
    });
    if (processed === prev) {
      hasConditions = false;
    }
    iterations++;
  }

  // Replace double brace tags: {{user.name}}
  for (const [key, val] of Object.entries(mappings)) {
    processed = processed.replaceAll(`{{${key}}}`, val);
  }

  // Replace legacy single-brace tags
  processed = processed.replaceAll('{name}', data.name || '');
  processed = processed.replaceAll('{title}', data.title || '');
  processed = processed.replaceAll('{jobTitle}', data.title || '');
  processed = processed.replaceAll('{dept}', data.dept || '');
  processed = processed.replaceAll('{department}', data.dept || '');
  processed = processed.replaceAll('{phone}', data.phone || '');
  processed = processed.replaceAll('{email}', data.email || '');
  processed = processed.replaceAll('{logo}', data.logo || '');
  
  processed = processed.replaceAll('{linkedin}', data.linkedin || '#');
  processed = processed.replaceAll('{twitter}', data.twitter || '#');
  processed = processed.replaceAll('{instagram}', data.instagram || '#');
  processed = processed.replaceAll('{facebook}', data.facebook || '#');
  processed = processed.replaceAll('{youtube}', data.youtube || '#');
  
  processed = processed.replaceAll('{web}', data.web || '');
  processed = processed.replaceAll('{website}', data.web || '');
  processed = processed.replaceAll('{webTracked}', data.webTracked || '#');
  
  processed = processed.replaceAll('{primary}', data.primary || '#0d4b8e');
  processed = processed.replaceAll('{secondary}', data.secondary || '#f18a22');
  processed = processed.replaceAll('{tagline}', data.tagline || '');
  processed = processed.replaceAll('{disclaimer}', data.disclaimer || '');
  processed = processed.replaceAll('{location}', data.location || '');
  processed = processed.replaceAll('{brand_logo}', data.brand_logo || '');
  processed = processed.replaceAll('{brand_element_design}', data.brand_element_design || '');
  processed = processed.replaceAll('{brand_element_pattern}', data.brand_element_pattern || '');
  
  const isCampaignEnabled = data.campaignImg ? true : false;
  if (isCampaignEnabled && data.campaignImg) {
    processed = processed.replaceAll('{campaignImg}', data.campaignImg);
    processed = processed.replaceAll('{campaignLink}', data.campaignLink);
    processed = processed.replaceAll('{campaignPartner}', data.campaignPartner || '');
    processed = processed.replaceAll('{campaignBtn}', data.campaignBtn || '');
    processed = processed.replace(/<!--\s*campaign-banner-start\s*-->/g, '');
    processed = processed.replace(/<!--\s*campaign-banner-end\s*-->/g, '');
  } else {
    processed = processed.replaceAll('{campaignImg}', '');
    processed = processed.replaceAll('{campaignLink}', '#');
    processed = processed.replaceAll('{campaignPartner}', '');
    processed = processed.replaceAll('{campaignBtn}', '');
    processed = processed.replace(/<!--\s*campaign-banner-start\s*-->[\s\S]*?<!--\s*campaign-banner-end\s*-->/g, '');
  }
  return processed;
}

function renderOsPremium(data) {
  const primaryHex = data.primary.replace('#', '');
  const secondaryHex = data.secondary.replace('#', '');

  const campaignPromoSlice = data.campaignImg ? `
    <!-- SLICE 02: CAMPAIGN PROMO BANNER -->
    <tr>
      <td valign="top" align="center" style="padding: 15px; background-color: #ffffff;">
        <table cellpadding="0" cellspacing="0" border="0" width="548" style="width: 548px; max-width: 548px; background-color: #0b0c0d; border-radius: 8px; border-collapse: collapse; overflow: hidden;">
          <tr>
            <td valign="top" width="386" height="101" style="width: 386px; height: 101px; line-height: 0; padding: 0; margin: 0;">
              <img src="${data.campaignImg}" alt="Campaign Info" width="386" height="101" style="border: 0; display: block; width: 386px; height: 101px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
            </td>
            <td valign="top" width="162" height="101" style="width: 162px; height: 101px; background-color: #0b0c0d; padding: 0; margin: 0; line-height: 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="162" style="width: 162px;">
                <tr>
                  <td valign="top" width="162" height="56" style="width: 162px; height: 56px; line-height: 0; padding: 0; margin: 0;">
                    <img src="${data.campaignPartner}" alt="Sage Partner Badge" width="162" height="56" style="border: 0; display: block; width: 162px; height: 56px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                  </td>
                </tr>
                <tr>
                  <td valign="top" width="162" height="45" style="width: 162px; height: 45px; line-height: 0; padding: 0; margin: 0;">
                    <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                      <img src="${data.campaignBtn}" alt="Request A Demo Now!" width="162" height="45" style="border: 0; display: block; width: 162px; height: 45px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  let socialsList = [];
  if (data.linkedin) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.linkedin}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-linkedin.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.instagram) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.instagram}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-instagram.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.twitter) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.twitter}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-twitter.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.facebook) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.facebook}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-facebook.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.youtube) {
    socialsList.push(`
      <td style="line-height: 0;">
        <a href="${data.youtube}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-youtube.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  
  if (socialsList.length > 0) {
    const lastIndex = socialsList.length - 1;
    socialsList[lastIndex] = socialsList[lastIndex].replace('style="padding-right: 5px;', 'style="');
  }

  const socialsHtml = socialsList.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block;">
      <tr>
        ${socialsList.join('')}
      </tr>
    </table>
  ` : '';

  const verticalLineHtml = socialsHtml ? `
    <td valign="middle" width="1" style="width: 1px; line-height: 0;">
      <img src="Resources/2x/separator-line.png" width="1" height="40" style="border:0; display:block; width:1px; height:40px;" />
    </td>
  ` : '';

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb;">
            <tr>
              <td valign="middle" height="85" style="height: 85px; border-bottom: 1px solid #e5e7eb; padding: 10px 15px; background-image: url('Resources/2x/brand-graphic-grey-top-left.png'); background-repeat: no-repeat; background-position: left top; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed;">
                  <tr>
                    <td valign="middle" width="130" style="width: 130px; text-align: left;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: block;">
                        <img src="${data.logo}" alt="OS Holdings Logo" width="120" height="30" style="border: 0; display: block; max-width: 120px; height: 30px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                      </a>
                    </td>
                    <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td valign="middle" width="132" style="width: 132px; max-width: 132px; padding-left: 12px; padding-right: 5px; text-align: left; overflow: hidden;">
                      <div style="font-size: 15px; font-weight: bold; color: ${data.primary}; margin: 0; letter-spacing: 0.2px; text-transform: none; line-height: 17px; font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word;">
                        ${data.name}
                      </div>
                      <div style="font-size: 12px; color: ${data.secondary}; font-weight: bold; margin-top: 3px; line-height: 14px; font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word;">
                        ${data.title}
                      </div>
                    </td>
                    <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td valign="middle" width="163" style="width: 163px; padding-left: 12px; font-size: 10px; color: #555555; text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #555555;">
                        ${data.phone ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px; padding-bottom: 3px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/phone.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="padding-bottom: 3px; line-height: 12px; color: #333333; font-weight: 500; white-space: nowrap;">
                            ${data.phone}
                          </td>
                        </tr>` : ''}
                        ${data.email ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px; padding-bottom: 3px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/new-post.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="padding-bottom: 3px; line-height: 12px; white-space: nowrap;">
                            <a href="mailto:${data.email}" style="color: #333333; text-decoration: none; font-weight: 500;">${data.email}</a>
                          </td>
                        </tr>` : ''}
                        ${data.web ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/globe.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="line-height: 12px; white-space: nowrap;">
                            <a href="${data.webTracked}" target="_blank" style="color: #333333; text-decoration: none; font-weight: 500;">${data.web}</a>
                          </td>
                        </tr>` : ''}
                      </table>
                    </td>
                    <td valign="middle" width="119" style="width: 119px; text-align: right; line-height: 0;">
                      <img src="${data.sideImage}" alt="Brand Graphic" width="119" height="70" style="border: 0; display: block; width: 119px; height: 70px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${campaignPromoSlice}
            <tr>
              <td valign="middle" height="55" style="height: 55px; padding: 5px 15px; background-image: url('Resources/2x/brand-graphic-grey-bottom-right.png'); background-repeat: no-repeat; background-position: right bottom; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed;">
                  <tr>
                    <td valign="middle" width="165" style="width: 165px; text-align: left;">
                      ${socialsHtml}
                    </td>
                    ${verticalLineHtml}
                    <td valign="middle" align="center" width="249" style="width: 249px; padding: 0 10px; line-height: 0;">
                      <img src="Resources/2x/slogan.png" alt="Innovate | Excel | Grow" width="126" height="15" style="border:0; display:block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                    </td>
                    <td valign="middle" width="1" style="width: 1px; line-height: 0;">
                      <img src="Resources/2x/separator-line-2.png" width="1" height="40" style="border:0; display:block; width:1px; height:40px;" />
                    </td>
                    <td valign="middle" align="right" width="130" style="width: 130px; line-height: 0;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: inline-block; line-height: 0;">
                        <img src="Resources/2x/connect-with-us-cta-button.png" alt="Connect With Us" width="118" height="25" style="border: 0; display: block; width: 118px; height: 25px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ${data.openPixel}
        </td>
      </tr>
  `;
  return makePathsAbsolute(layout);
}

function renderOsFlatBanner(data) {
  const primaryHex = data.primary.replace('#', '');
  const secondaryHex = data.secondary.replace('#', '');

  const campaignPromoSlice = data.campaignImg ? `
    <!-- SLICE 02: CAMPAIGN PROMO BANNER -->
    <tr>
      <td valign="top" align="center" style="padding: 0; background-color: #ffffff;">
        <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #0b0c0d; border-collapse: collapse; overflow: hidden;">
          <tr>
            <td valign="top" width="578" height="103" style="width: 578px; height: 103px; line-height: 0; padding: 0; margin: 0;">
              <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                <img src="Resources/2x/cta-banner.png" alt="Campaign Banner" width="578" height="103" style="border: 0; display: block; width: 578px; height: 103px;" />
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  let socialsList = [];
  if (data.linkedin) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.linkedin}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-linkedin.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.instagram) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.instagram}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-instagram.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.twitter) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.twitter}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-twitter.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.facebook) {
    socialsList.push(`
      <td style="padding-right: 5px; line-height: 0;">
        <a href="${data.facebook}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-facebook.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  if (data.youtube) {
    socialsList.push(`
      <td style="line-height: 0;">
        <a href="${data.youtube}" target="_blank" style="text-decoration: none; display: block;">
          <img src="Resources/2x/icon-youtube.png" width="27" height="27" style="border:0; display:block; width:27px; height:27px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
        </a>
      </td>
    `);
  }
  
  if (socialsList.length > 0) {
    const lastIndex = socialsList.length - 1;
    socialsList[lastIndex] = socialsList[lastIndex].replace('style="padding-right: 5px;', 'style="');
  }

  const socialsHtml = socialsList.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="display: inline-block;">
      <tr>
        ${socialsList.join('')}
      </tr>
    </table>
  ` : '';

  const verticalLineHtml = socialsHtml ? `
    <td valign="middle" width="1" style="width: 1px; line-height: 0;">
      <img src="Resources/2x/separator-line.png" width="1" height="40" style="border:0; display:block; width:1px; height:40px;" />
    </td>
  ` : '';

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb;">
            <tr>
              <td valign="middle" height="85" style="height: 85px; border-bottom: 1px solid #e5e7eb; padding: 10px 10px; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed;">
                  <tr>
                    <td valign="middle" width="130" style="width: 130px; text-align: left;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: block;">
                        <img src="${data.logo}" alt="OS Holdings Logo" width="120" height="30" style="border: 0; display: block; max-width: 120px; height: 30px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                      </a>
                    </td>
                    <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td valign="middle" width="152" style="width: 152px; max-width: 152px; padding-left: 12px; padding-right: 5px; text-align: left; overflow: hidden;">
                      <div style="font-size: 15px; font-weight: bold; color: ${data.primary}; margin: 0; letter-spacing: 0.2px; text-transform: none; line-height: 17px; font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word;">
                        ${data.name}
                      </div>
                      <div style="font-size: 12px; color: ${data.secondary}; font-weight: bold; margin-top: 3px; line-height: 14px; font-family: 'Segoe UI', Arial, sans-serif; word-wrap: break-word;">
                        ${data.title}
                      </div>
                    </td>
                    <td valign="middle" width="1" style="width: 1px; border-left: 1px solid #d2d2d2; font-size: 1px; line-height: 1px;">&nbsp;</td>
                    <td valign="middle" width="153" style="width: 153px; padding-left: 12px; font-size: 10px; color: #555555; text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #555555;">
                        ${data.phone ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px; padding-bottom: 3px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/phone.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="padding-bottom: 3px; line-height: 12px; color: #333333; font-weight: 500; white-space: nowrap;">
                            ${data.phone}
                          </td>
                        </tr>` : ''}
                        ${data.email ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px; padding-bottom: 3px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/new-post.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="padding-bottom: 3px; line-height: 12px; white-space: nowrap;">
                            <a href="mailto:${data.email}" style="color: #333333; text-decoration: none; font-weight: 500;">${data.email}</a>
                          </td>
                        </tr>` : ''}
                        ${data.web ? `
                        <tr>
                          <td valign="middle" style="padding-right: 6px;">
                            <table cellpadding="0" cellspacing="0" border="0" style="background-color: ${data.secondary}; border-radius: 50%; width: 14px; height: 14px; text-align: center;">
                              <tr>
                                <td valign="middle" align="center" style="height: 14px; width: 14px; border-radius: 50%; padding: 0; line-height: 0;">
                                  <img src="https://img.icons8.com/ios-filled/14/ffffff/globe.png" width="8" height="8" style="border:0; display:block; margin: 0 auto; width:8px; height:8px;" />
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td valign="middle" style="line-height: 12px; white-space: nowrap;">
                            <a href="${data.webTracked}" target="_blank" style="color: #333333; text-decoration: none; font-weight: 500;">${data.web}</a>
                          </td>
                        </tr>` : ''}
                      </table>
                    </td>
                    <td valign="middle" width="119" style="width: 119px; text-align: right; line-height: 0;">
                      <img src="${data.sideImage}" alt="Brand Graphic" width="119" height="70" style="border: 0; display: block; width: 119px; height: 70px;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${campaignPromoSlice}
            <tr>
              <td valign="middle" height="55" style="height: 55px; padding: 5px 10px; background-image: url('Resources/2x/brand-graphic-grey-bottom-right.png'); background-repeat: no-repeat; background-position: right bottom; background-color: #ffffff;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; table-layout: fixed;">
                  <tr>
                    <td valign="middle" width="165" style="width: 165px; text-align: left;">
                      ${socialsHtml}
                    </td>
                    ${verticalLineHtml}
                    <td valign="middle" align="center" width="259" style="width: 259px; padding: 0 10px; line-height: 0;">
                      <img src="Resources/2x/slogan.png" alt="Innovate | Excel | Grow" width="126" height="15" style="border:0; display:block; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                    </td>
                    <td valign="middle" width="1" style="width: 1px; line-height: 0;">
                      <img src="Resources/2x/separator-line-2.png" width="1" height="40" style="border:0; display:block; width:1px; height:40px;" />
                    </td>
                    <td valign="middle" align="right" width="130" style="width: 130px; line-height: 0;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: inline-block; line-height: 0;">
                        <img src="Resources/2x/connect-with-us-cta-button.png" alt="Connect With Us" width="118" height="25" style="border: 0; display: block; width: 118px; height: 25px; image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;" />
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          ${data.openPixel}
        </td>
      </tr>
    </table>
  `;
  return makePathsAbsolute(layout);
}

function renderGridBlueprint(data) {
  const primaryHex = data.primary.replace('#', '');
  const secondaryHex = data.secondary.replace('#', '');

  const photoHtml = data.headshot ? `
    <td valign="top" width="110" style="width: 110px; padding-right: 20px;">
      <div style="width: 110px; height: 110px; border-radius: 50%; overflow: hidden; border: 3px solid ${data.secondary}; display: block; line-height: 0;">
        <img src="${data.headshot}" alt="${data.name}" width="110" height="110" style="border: 0; display: block; object-fit: cover; width:110px; height:110px;" />
      </div>
    </td>
  ` : '';

  const campaignBannerHtml = data.campaignImg ? `
    <!-- SLICE 02: CAMPAIGN PROMO BANNER -->
    <tr>
      <td valign="top" style="padding: 15px 20px 20px 20px;">
        <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
          <img src="${data.campaignImg}" alt="Campaign Banner" width="538" style="border: 0; display: block; width: 100%; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" />
        </a>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  const activeSocials = [];
  if (data.linkedin) activeSocials.push({ name: 'LinkedIn', url: data.linkedin, icon: 'linkedin' });
  if (data.twitter) activeSocials.push({ name: 'Twitter', url: data.twitter, icon: 'x' });
  if (data.facebook) activeSocials.push({ name: 'Facebook', url: data.facebook, icon: 'facebook-new' });
  if (data.instagram) activeSocials.push({ name: 'Instagram', url: data.instagram, icon: 'instagram-new' });
  if (data.youtube) activeSocials.push({ name: 'YouTube', url: data.youtube, icon: 'youtube-play' });

  let socialBarHtml = '';
  if (activeSocials.length > 0) {
    socialBarHtml = `
      <!-- SLICE 03: SOCIAL BAR -->
      <tr>
        <td valign="middle" height="40" style="height: 40px; border-bottom: 1px solid #e5e7eb; padding: 0 20px; background-color: #fafafa;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="middle">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="font-size: 10px; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; color: ${data.primary}; font-weight: bold; letter-spacing: 1px; padding-right: 15px; line-height: 16px;">FOLLOW US</td>
                    ${activeSocials.map((s, idx) => `
                    <td valign="middle" style="${idx < activeSocials.length - 1 ? 'padding-right: 10px;' : ''}">
                      <a href="${s.url}" target="_blank" style="text-decoration: none; display: block;">
                        <img src="https://img.icons8.com/ios-glyphs/24/${primaryHex}/${s.icon}.png" alt="${s.name}" width="16" height="16" style="border:0; display:block;" />
                      </a>
                    </td>`).join('')}
                  </tr>
                </table>
              </td>
              <td valign="middle" align="right" style="font-size: 10px; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; color: #bbbbbb; font-weight: bold; letter-spacing: 0.5px;">
                MAILFOOTER BRANDED
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; border-collapse: separate;">
            <tr>
              <td valign="top" style="padding: 20px 20px 15px 20px; border-bottom: 1px solid #e5e7eb;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    ${photoHtml}
                    <td valign="top" style="text-align: left;">
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 8px;">
                            <div style="font-size: 18px; font-weight: 800; color: ${data.primary}; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 20px;">
                              ${data.name}
                            </div>
                            <div style="font-size: 12px; color: ${data.secondary}; font-weight: bold; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Segoe UI', Arial, sans-serif;">
                              ${data.title}${data.dept}
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; color: #666666; font-family: 'Segoe UI', Arial, sans-serif;">
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size: 12px; color: #666666;">
                              ${data.phone ? `
                              <tr>
                                <td style="padding-bottom: 3px; font-weight: bold; color: ${data.primary}; width: 60px; font-family: 'Segoe UI', Arial, sans-serif;">Phone:</td>
                                <td style="padding-bottom: 3px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif;">${data.phone}</td>
                              </tr>` : ''}
                              ${data.email ? `
                              <tr>
                                <td style="padding-bottom: 3px; font-weight: bold; color: ${data.primary}; width: 60px; font-family: 'Segoe UI', Arial, sans-serif;">Email:</td>
                                <td style="padding-bottom: 3px; font-family: 'Segoe UI', Arial, sans-serif;"><a href="mailto:${data.email}" style="color: #555555; text-decoration: none;">${data.email}</a></td>
                              </tr>` : ''}
                              ${data.web ? `
                              <tr>
                                <td style="padding-bottom: 3px; font-weight: bold; color: ${data.primary}; width: 60px; font-family: 'Segoe UI', Arial, sans-serif;">Web:</td>
                                <td style="padding-bottom: 3px; font-family: 'Segoe UI', Arial, sans-serif;"><a href="${data.webTracked}" target="_blank" style="color: ${data.secondary}; text-decoration: none; font-weight: 600;">${data.web}</a></td>
                              </tr>` : ''}
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td valign="top" align="right" width="80" style="width: 80px;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                        <img src="${data.logo}" alt="Logo" width="70" style="border: 0; display: block; max-width: 70px; height: auto;" />
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${socialBarHtml}
            ${campaignBannerHtml}
          </table>
          ${data.openPixel}
        </td>
      </tr>
    </table>
  `;
  return makePathsAbsolute(layout);
}

function renderCorporateBanner(data) {
  const primaryHex = data.primary.replace('#', '');
  const secondaryHex = data.secondary.replace('#', '');

  const photoHtml = data.headshot ? `
    <td valign="top" width="100" style="width: 100px; padding-right: 15px;">
      <img src="${data.headshot}" alt="${data.name}" width="100" height="100" style="border: 0; display: block; border-radius: 6px; object-fit: cover; width:100px; height:100px;" />
    </td>
  ` : '';

  const campaignHtml = data.campaignImg ? `
    <tr>
      <td height="15" style="font-size: 0px; line-height: 0px;">&nbsp;</td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 15px 15px 15px;">
        <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
          <img src="${data.campaignImg}" alt="Marketing Campaign" border="0" width="100%" style="display: block; max-width: 570px; height: auto; border-radius: 4px;" />
        </a>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  const activeSocials = [];
  if (data.linkedin) activeSocials.push({ name: 'LinkedIn', url: data.linkedin, icon: 'linkedin' });
  if (data.twitter) activeSocials.push({ name: 'Twitter', url: data.twitter, icon: 'x' });
  if (data.facebook) activeSocials.push({ name: 'Facebook', url: data.facebook, icon: 'facebook-new' });
  if (data.instagram) activeSocials.push({ name: 'Instagram', url: data.instagram, icon: 'instagram-new' });
  if (data.youtube) activeSocials.push({ name: 'YouTube', url: data.youtube, icon: 'youtube-play' });

  let socialHtml = '';
  if (activeSocials.length > 0) {
    socialHtml = `
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
        <tr>
          ${activeSocials.map((s, idx) => `
          <td style="${idx < activeSocials.length - 1 ? 'padding-right: 8px;' : ''}">
            <a href="${s.url}" target="_blank" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-glyphs/30/${primaryHex}/${s.icon}.png" alt="${s.name}" width="16" height="16" style="border:0; display:block;" />
            </a>
          </td>`).join('')}
        </tr>
      </table>
    `;
  }

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; border-collapse: separate;">
            <tr>
              <td valign="top" style="padding: 15px; text-align: left;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    ${photoHtml}
                    <td valign="top" style="text-align: left;">
                      <div style="font-size: 16px; font-weight: bold; color: ${data.primary}; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${data.name}
                      </div>
                      <div style="font-size: 13px; font-weight: bold; color: ${data.secondary}; margin-top: 2px; margin-bottom: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${data.title}${data.dept}
                      </div>
                      <div style="font-size: 12px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif;">
                        ${data.phone ? `<div style="margin-bottom: 2px; font-family: 'Segoe UI', Arial, sans-serif;"><strong>Phone:</strong> ${data.phone}</div>` : ''}
                        ${data.email ? `<div style="margin-bottom: 2px; font-family: 'Segoe UI', Arial, sans-serif;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #333333; text-decoration: none;">${data.email}</a></div>` : ''}
                        ${data.web ? `<div style="font-family: 'Segoe UI', Arial, sans-serif;"><strong>Website:</strong> <a href="${data.webTracked}" target="_blank" style="color: ${data.primary}; text-decoration: none; font-weight: 600;">${data.web}</a></div>` : ''}
                      </div>
                      ${socialHtml}
                    </td>
                    <td valign="top" align="right" width="110" style="width: 110px;">
                      <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
                        <img src="${data.logo}" alt="Logo" width="100" style="border: 0; display: block; max-width: 100px; height: auto;" />
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${campaignHtml}
          </table>
          ${data.openPixel}
        </td>
      </tr>
    </table>
  `;
  return makePathsAbsolute(layout);
}

function renderModernSplit(data) {
  const primaryHex = data.primary.replace('#', '');
  const secondaryHex = data.secondary.replace('#', '');

  const photoHtml = data.headshot ? `
    <div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 2px solid ${data.secondary}; margin-bottom: 10px; line-height: 0;">
      <img src="${data.headshot}" alt="${data.name}" width="70" height="70" style="border: 0; display: block; object-fit: cover; width:70px; height:70px;" />
    </div>
  ` : '';

  const campaignHtml = data.campaignImg ? `
    <tr>
      <td height="15" style="font-size: 0px; line-height: 0px;">&nbsp;</td>
    </tr>
    <tr>
      <td colspan="3" align="center" style="padding-top: 10px;">
        <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
          <img src="${data.campaignImg}" alt="Marketing Campaign" border="0" width="100%" style="display: block; max-width: 520px; height: auto; border-radius: 4px;" />
        </a>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  const activeSocials = [];
  if (data.linkedin) activeSocials.push({ name: 'LinkedIn', url: data.linkedin, icon: 'linkedin' });
  if (data.twitter) activeSocials.push({ name: 'Twitter', url: data.twitter, icon: 'x' });
  if (data.facebook) activeSocials.push({ name: 'Facebook', url: data.facebook, icon: 'facebook-new' });
  if (data.instagram) activeSocials.push({ name: 'Instagram', url: data.instagram, icon: 'instagram-new' });
  if (data.youtube) activeSocials.push({ name: 'YouTube', url: data.youtube, icon: 'youtube-play' });

  let socialHtml = '';
  if (activeSocials.length > 0) {
    socialHtml = `
      <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 10px;">
        <tr>
          ${activeSocials.map((s, idx) => `
          <td style="${idx < activeSocials.length - 1 ? 'padding-right: 8px;' : ''}">
            <a href="${s.url}" target="_blank" style="text-decoration: none;">
              <img src="https://img.icons8.com/ios-glyphs/30/${primaryHex}/${s.icon}.png" alt="${s.name}" width="16" height="16" style="border:0; display:block;" />
            </a>
          </td>`).join('')}
        </tr>
      </table>
    `;
  }

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif;">
            <tr>
              <!-- Left Column -->
              <td valign="top" width="120" style="width: 120px; text-align: center; padding: 10px 10px 10px 0; border-right: 2px solid ${data.primary}; font-family: 'Segoe UI', Arial, sans-serif;">
                ${photoHtml}
                <a href="${data.webTracked}" target="_blank" style="text-decoration: none; display: inline-block; line-height: 0;">
                  <img src="${data.logo}" alt="Logo" width="80" style="border: 0; display: block; max-width: 80px; height: auto;" />
                </a>
              </td>
              <!-- Right Column -->
              <td valign="top" style="padding-left: 20px; text-align: left;">
                <div style="font-size: 18px; font-weight: bold; color: ${data.primary}; margin: 0; font-family: 'Segoe UI', Arial, sans-serif;">
                  ${data.name}
                </div>
                <div style="font-size: 13px; font-weight: bold; color: ${data.secondary}; margin-top: 2px; margin-bottom: 12px; font-family: 'Segoe UI', Arial, sans-serif;">
                  ${data.title}${data.dept}
                </div>
                <div style="font-size: 12px; color: #555555; font-family: 'Segoe UI', Arial, sans-serif;">
                  ${data.phone ? `<div style="margin-bottom: 4px; font-family: 'Segoe UI', Arial, sans-serif;"><strong>Phone:</strong> ${data.phone}</div>` : ''}
                  ${data.email ? `<div style="margin-bottom: 4px; font-family: 'Segoe UI', Arial, sans-serif;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #555555; text-decoration: none;">${data.email}</a></div>` : ''}
                  ${data.web ? `<div style="font-family: 'Segoe UI', Arial, sans-serif;"><strong>Website:</strong> <a href="${data.webTracked}" target="_blank" style="color: ${data.primary}; text-decoration: none; font-weight: 600;">${data.web}</a></div>` : ''}
                </div>
                ${socialHtml}
              </td>
            </tr>
            ${campaignHtml}
          </table>
          ${data.openPixel}
        </td>
      </tr>
    </table>
  `;
  return makePathsAbsolute(layout);
}

function renderCompactStacked(data) {
  const campaignHtml = data.campaignImg ? `
    <tr>
      <td height="12" style="font-size: 0px; line-height: 0px;">&nbsp;</td>
    </tr>
    <tr>
      <td align="left">
        <a href="${data.campaignLink}" target="_blank" style="text-decoration: none; display: block; line-height: 0;">
          <img src="${data.campaignImg}" alt="Marketing Campaign" border="0" width="100%" style="display: block; max-width: 400px; height: auto; border-radius: 4px;" />
        </a>
      </td>
    </tr>
  ` : '';

  // Generate dynamic socials html list
  const activeSocials = [];
  if (data.linkedin) activeSocials.push({ name: 'LinkedIn', url: data.linkedin });
  if (data.twitter) activeSocials.push({ name: 'Twitter', url: data.twitter });
  if (data.facebook) activeSocials.push({ name: 'Facebook', url: data.facebook });
  if (data.instagram) activeSocials.push({ name: 'Instagram', url: data.instagram });
  if (data.youtube) activeSocials.push({ name: 'YouTube', url: data.youtube });

  let socialHtml = '';
  if (activeSocials.length > 0) {
    socialHtml = `
      <span style="color: #cccccc; padding: 0 4px;">|</span>
      ${activeSocials.map((s, idx) => `
        <a href="${s.url}" target="_blank" style="color: ${data.secondary}; text-decoration: none; font-weight: bold; font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif;">${s.name}</a>
        ${idx < activeSocials.length - 1 ? '<span style="color: #cccccc; padding: 0 4px;">|</span>' : ''}
      `).join('')}
    `;
  }

  const layout = `
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; width: 100%; line-height: 1.25;">
      <tr>
        <td align="left" valign="top">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family: 'Segoe UI', Candara, Calibri, Arial, sans-serif; text-align: left;">
            <tr>
              <td style="font-size: 13px; line-height: 18px; color: #333333; font-family: 'Segoe UI', Arial, sans-serif;">
                <strong style="color: ${data.primary}; font-size: 14px; font-family: 'Segoe UI', Arial, sans-serif;">${data.name}</strong>
                <span style="color: #666666; font-size: 12px; font-family: 'Segoe UI', Arial, sans-serif;"> - ${data.title}${data.dept}</span>
              </td>
            </tr>
            <tr>
              <td style="font-size: 11px; line-height: 16px; color: #666666; padding-top: 4px; font-family: 'Segoe UI', Arial, sans-serif;">
                ${data.phone ? `<span style="font-family: 'Segoe UI', Arial, sans-serif;">${data.phone}</span>` : ''}
                ${data.email ? `<span style="color: #cccccc; padding: 0 4px;">|</span><a href="mailto:${data.email}" style="color: #666666; text-decoration: none; font-family: 'Segoe UI', Arial, sans-serif;">${data.email}</a>` : ''}
                ${data.web ? `<span style="color: #cccccc; padding: 0 4px;">|</span><a href="${data.webTracked}" target="_blank" style="color: ${data.primary}; text-decoration: none; font-weight: bold; font-family: 'Segoe UI', Arial, sans-serif;">${data.web}</a>` : ''}
                ${socialHtml}
              </td>
            </tr>
            ${campaignHtml}
          </table>
          ${data.openPixel}
        </td>
      </tr>
    </table>
  `;
  return makePathsAbsolute(layout);
}
