document.addEventListener('DOMContentLoaded', () => {
  // --- Centralized SaaS Routing Flag ---
  const ENABLE_CENTRAL_SAAS = false; // Set to true once the central domain (e.g., mailfooter.co.za) is live

  // --- Parse URL Parameters ---
  let clientDomain = '';
  let queryEmail = '';

  const urlParams = new URLSearchParams(window.location.search);
  const paramClient = urlParams.get('client');
  const paramEmail = urlParams.get('email');
  const paramName = urlParams.get('name');
  const paramCreate = urlParams.get('create') === '1' || urlParams.get('create') === 'true';
  const paramInstant = urlParams.get('instant') === 'true';
  
  if (paramClient) {
    clientDomain = paramClient.trim();
  }
  
  if (paramEmail) {
    queryEmail = paramEmail.trim();
    if (queryEmail.includes('@')) {
      const parts = queryEmail.split('@');
      if (parts[1] && !clientDomain) {
        clientDomain = parts[1].trim();
      }
    }
  }

  // --- Company Config/Defaults (Admin Portal Constants) ---
  const isLocalFile = window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null' || !window.location.origin.startsWith('http');
  const TRACKING_DOMAIN = isLocalFile
    ? 'https://os-holdings.co.za/mailfooter'
    : window.location.origin + window.location.pathname.replace(/\/(index|app|admin|super-admin|register|light)(\.html)?$/, '').replace(/\/$/, '');
  let dbTemplates = [];
  const COMPANY_DEFAULTS = {
    companyName: 'OS Holdings',
    website: 'https://os-holdings.co.za/',
    tagline: 'Innovate | Excel | Grow',
    companyBio: 'OS Holdings is a diversified software solution company committed to creating lasting value.',
    logo: 'Resources/2x/logo.png',
    sideImage: 'Resources/2x/brand-graphic-colour-top-right.png',
    primaryColor: '#0d4b8e',
    secondaryColor: '#f18a22',
    campaignImg: 'Resources/2x/cta-banner-left.png',
    campaignPartner: 'Resources/2x/cta-banner-right-top.png',
    campaignBtn: 'Resources/2x/cta-banner-right-bottom.png',
    campaignLink: 'https://os-holdings.co.za/sage-300-people-signup/',
    socialLinkedin: 'https://www.linkedin.com/company/osholdings',
    socialTwitter: 'https://x.com/holdings_os',
    socialFacebook: 'https://www.facebook.com/osholdings',
    socialInstagram: 'https://www.instagram.com/osholdings/',
    socialYoutube: ''
  };

  // --- Deployment Config ---
  // Dynamically compute base URL relative to current domain & path (ensures dynamic tracking across client domains)
  const PUBLIC_PRODUCTION_BASE = 'https://os-holdings.co.za/mailfooter/';
  const BASE_URL = (function() {
    if (typeof window !== 'undefined' && window.location) {
      const proto = window.location.protocol;
      const origin = window.location.origin;
      const host = window.location.hostname;
      if (proto === 'file:' || host === 'localhost' || host === '127.0.0.1' || !origin || origin === 'null' || !origin.startsWith('http')) {
        return PUBLIC_PRODUCTION_BASE;
      }
      return origin + window.location.pathname.replace(/\/(index|app|admin|super-admin|register)(\.html)?$/, '').replace(/\/$/, '') + '/';
    }
    return PUBLIC_PRODUCTION_BASE;
  })();

  // Helper to convert relative image paths to absolute public URLs for email clients
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

  // --- DOM Elements ---
  const form = document.getElementById('signatureForm');
  const templateSelect = document.getElementById('templateSelect');
  const fullName = document.getElementById('fullName');
  const jobTitle = document.getElementById('jobTitle');
  const department = document.getElementById('department');
  const phone = document.getElementById('phone');
  const email = document.getElementById('email');

  // Preloader & Onboarding Portal DOM Elements
  const preloader = document.getElementById('preloader');
  const loaderLogo = document.getElementById('preloaderLogoContainer');
  const headerLogo = document.getElementById('headerLogo');
  const progressContainer = document.getElementById('preloaderProgressContainer');
  const welcomePanel = document.getElementById('preloaderWelcome');
  const welcomeClientName = document.getElementById('welcomeClientName');
  const onboardingPanel = document.getElementById('preloaderOnboarding');
  
  const btnStartFresh = document.getElementById('btnStartFresh');
  const btnRetrieve = document.getElementById('btnRetrieve');
  const retrieveEmail = document.getElementById('retrieveEmail');
  const retrieveError = document.getElementById('retrieveError');
  const btnBackToPortal = document.getElementById('btnBackToPortal');
  const btnSkipPreloader = document.getElementById('btnSkipPreloader');
  
  // Photo Uploader DOM elements
  const headshotFile = document.getElementById('headshotFile');
  const headshotUrl = document.getElementById('headshotUrl');
  const photoDragArea = document.getElementById('photoDragArea');
  const photoPreviewContainer = document.getElementById('photoPreviewContainer');
  const photoPreview = document.getElementById('photoPreview');
  const photoUploadIcon = document.getElementById('photoUploadIcon');
  const photoUploadText = document.getElementById('photoUploadText');

  const linkedinUrl = document.getElementById('linkedinUrl');
  const twitterUrl = document.getElementById('twitterUrl');
  const facebookUrl = document.getElementById('facebookUrl');
  const instagramUrl = document.getElementById('instagramUrl');
  const youtubeUrl = document.getElementById('youtubeUrl');
  const includeCampaign = document.getElementById('includeCampaign');
  const website = document.getElementById('website');
  
  const signatureCanvasViewport = document.getElementById('signatureCanvasViewport');
  const previewWindow = signatureCanvasViewport || document.getElementById('previewWindow');
  const copySignatureBtn = document.getElementById('copySignatureBtn');
  const copyHtmlBtn = document.getElementById('copyHtmlBtn');
  const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
  const toast = document.getElementById('toastNotification');
  
  const toggleBtns = document.querySelectorAll('.toggle-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // --- Profile Photo / Headshot Upload Logic with Client-Side Canvas Compressor ---
  let headshotBase64 = '';

  function compressImageFile(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxWidth || h > maxHeight) {
            if (w > h) {
              h = Math.round((h * maxWidth) / w);
              w = maxWidth;
            } else {
              w = Math.round((w * maxHeight) / h);
              h = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(event.target.result);
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  if (headshotFile) {
    headshotFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          // Compress on client to max 400x400 ~30KB
          headshotBase64 = await compressImageFile(file, 400, 400, 0.85);
          
          // Show photo preview
          if (photoPreview) photoPreview.src = headshotBase64;
          if (photoPreviewContainer) photoPreviewContainer.style.display = 'flex';
          if (photoUploadIcon) photoUploadIcon.style.display = 'none';
          if (photoUploadText) photoUploadText.innerHTML = 'Photo optimized & loaded! <span>Change photo</span>';
          
          // Clear URL input
          if (headshotUrl) headshotUrl.value = '';
          
          schedulePreviewUpdate();
          showToast('Profile photo optimized and loaded successfully!');
        } catch (err) {
          console.warn('Image compression fallback:', err);
        }
      }
    });
  }

  if (headshotUrl) {
    headshotUrl.addEventListener('input', () => {
      if (headshotUrl.value.trim() !== '') {
        // Clear file upload state
        headshotBase64 = '';
        if (headshotFile) headshotFile.value = '';
        if (photoPreviewContainer) photoPreviewContainer.style.display = 'none';
        if (photoUploadIcon) photoUploadIcon.style.display = 'block';
        if (photoUploadText) photoUploadText.innerHTML = 'Drag & drop your photo or <span>browse files</span>';
      }
      schedulePreviewUpdate();
    });
  }

  // Drag & drop handlers for headshot area
  if (photoDragArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      photoDragArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        photoDragArea.style.borderColor = 'var(--primary)';
        photoDragArea.style.backgroundColor = 'rgba(78, 224, 0, 0.05)';
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      photoDragArea.addEventListener(eventName, (e) => {
        e.preventDefault();
        photoDragArea.style.borderColor = 'var(--border-color)';
        photoDragArea.style.backgroundColor = 'var(--bg-tertiary)';
      }, false);
    });

    photoDragArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        if (headshotFile) {
          headshotFile.files = files;
          const event = new Event('change');
          headshotFile.dispatchEvent(event);
        }
      }
    }, false);
  }

  // --- Helper to Capitalize First Letter of Each Word (Title Case) ---
  function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\b\w+/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // --- Input Field Auto-Formatting ---
  if (email) {
    email.addEventListener('input', () => {
      email.value = email.value.toLowerCase().replace(/\s/g, '');
    });
  }
  if (retrieveEmail) {
    retrieveEmail.addEventListener('input', () => {
      retrieveEmail.value = retrieveEmail.value.toLowerCase().replace(/\s/g, '');
    });
  }
  if (fullName) {
    fullName.addEventListener('blur', () => {
      fullName.value = toTitleCase(fullName.value.trim());
      updatePreview();
    });
  }
  if (jobTitle) {
    jobTitle.addEventListener('blur', () => {
      jobTitle.value = toTitleCase(jobTitle.value.trim());
      updatePreview();
    });
  }
  if (department) {
    department.addEventListener('blur', () => {
      department.value = toTitleCase(department.value.trim());
      updatePreview();
    });
  }

  // --- 60fps Debounced Preview Scheduler ---
  let previewRafId = null;
  function schedulePreviewUpdate() {
    if (previewRafId) cancelAnimationFrame(previewRafId);
    previewRafId = requestAnimationFrame(updatePreview);
  }

  // --- Form Event Listeners ---
  if (form) {
    form.addEventListener('input', schedulePreviewUpdate);
    form.addEventListener('change', schedulePreviewUpdate);
  }
  if (templateSelect) templateSelect.addEventListener('change', schedulePreviewUpdate);
  if (includeCampaign) {
    includeCampaign.addEventListener('change', () => {
      schedulePreviewUpdate();
      const campGroup = document.getElementById('campaignSelectContainer');
      if (campGroup) {
        campGroup.style.opacity = includeCampaign.checked ? '1' : '0.4';
        campGroup.style.pointerEvents = includeCampaign.checked ? 'auto' : 'none';
      }
    });
  }
  const campaignSelectEl = document.getElementById('campaignSelect');
  if (campaignSelectEl) {
    campaignSelectEl.addEventListener('change', schedulePreviewUpdate);
  }

  // --- Tab Switcher (Guide Card) ---
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // --- Platform Card Action Switcher ---
  const platformCards = document.querySelectorAll('.platform-card');
  platformCards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = card.getAttribute('data-target');
      
      // Find corresponding tab button and click it
      const tabBtn = Array.from(tabBtns).find(b => b.getAttribute('data-target') === targetId);
      if (tabBtn) {
        tabBtn.click();
        // Scroll smoothly to the tabs if on mobile
        tabBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  // --- Desktop/Mobile Toggles ---
  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const view = btn.getAttribute('data-view');
      if (view === 'mobile') {
        previewWindow.className = 'preview-window mobile';
      } else {
        previewWindow.className = 'preview-window desktop';
      }
      adjustIframeSize();
    });
  });

  // --- Signature HTML Generation Templates ---

  function getSignatureHtml() {
    const isCampaignEnabled = includeCampaign ? includeCampaign.checked : false;
    const defaultDomain = clientDomain || 'osholdings.co.za';
    const emailVal = email.value || `username@${defaultDomain}`;
    const userId = emailVal ? encodeURIComponent(emailVal) : 'unknown';
    const campaignId = isCampaignEnabled ? 'sage300_ad' : 'none';
    const rawTemplate = templateSelect ? templateSelect.value : '';
    const selectedTemplate = (rawTemplate && rawTemplate !== '') ? rawTemplate : 'os-flat-banner';

    // Resolved Campaign Image URLs
    const resolvedCampaignImg = isCampaignEnabled
      ? (isLocalFile
          ? `${BASE_URL}Resources/2x/cta-banner.png`
          : `${TRACKING_DOMAIN}/track/banner.php?user_id=${userId}&type=main&template=${selectedTemplate}`)
      : '';
    const resolvedCampaignPartner = isCampaignEnabled
      ? (isLocalFile
          ? `${BASE_URL}Resources/1x/cta-banner-right-top.png`
          : `${TRACKING_DOMAIN}/track/banner.php?user_id=${userId}&type=partner&template=${selectedTemplate}`)
      : '';
    const resolvedCampaignBtn = isCampaignEnabled
      ? (isLocalFile
          ? `${BASE_URL}Resources/1x/cta-banner-right-bottom.png`
          : `${TRACKING_DOMAIN}/track/banner.php?user_id=${userId}&type=button&template=${selectedTemplate}`)
      : '';
    const resolvedCampaignLink = isCampaignEnabled
      ? (isLocalFile
          ? (COMPANY_DEFAULTS.campaignLink || 'https://os-holdings.co.za/')
          : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=campaign_banner&template=${selectedTemplate}`)
      : '';
    const resolvedLogo = isLocalFile
      ? `${BASE_URL}Resources/2x/logo.png`
      : `${TRACKING_DOMAIN}/track/logo?user_id=${userId}&campaign_id=${campaignId}&template=${selectedTemplate}`;

    // Reliable fallback resolution for social networks
    const rawLinkedin = (linkedinUrl && linkedinUrl.value.trim()) || COMPANY_DEFAULTS.socialLinkedin || 'https://www.linkedin.com/company/osholdings';
    const rawTwitter = (twitterUrl && twitterUrl.value.trim()) || COMPANY_DEFAULTS.socialTwitter || 'https://x.com/holdings_os';
    const rawInstagram = (instagramUrl && instagramUrl.value.trim()) || COMPANY_DEFAULTS.socialInstagram || 'https://www.instagram.com/osholdings/';
    const rawFacebook = (facebookUrl && facebookUrl.value.trim()) || COMPANY_DEFAULTS.socialFacebook || 'https://www.facebook.com/osholdings';
    const rawYoutube = (youtubeUrl && youtubeUrl.value.trim()) || COMPANY_DEFAULTS.socialYoutube || '';

    const data = {
      name: fullName.value || 'Your Name',
      title: jobTitle.value || 'Your Title',
      dept: department.value ? ` | ${department.value}` : '',
      tagline: COMPANY_DEFAULTS.tagline,
      phone: phone.value || '+27 (0) 11 463 1000',
      email: emailVal,
      web: website.value || COMPANY_DEFAULTS.website, // Plain website text for UI display
      
      // Spam-proof visible logo open tracking
      logo: resolvedLogo,
      
      headshot: headshotBase64 || (headshotUrl ? headshotUrl.value : '') || '',
      primary: COMPANY_DEFAULTS.primaryColor,
      secondary: COMPANY_DEFAULTS.secondaryColor,
      
      // Spam-proof parameter-free click redirects
      linkedin: rawLinkedin ? (isLocalFile ? rawLinkedin : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=linkedin&template=${selectedTemplate}`) : '',
      twitter: rawTwitter ? (isLocalFile ? rawTwitter : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=twitter&template=${selectedTemplate}`) : '',
      instagram: rawInstagram ? (isLocalFile ? rawInstagram : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=instagram&template=${selectedTemplate}`) : '',
      facebook: rawFacebook ? (isLocalFile ? rawFacebook : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=facebook&template=${selectedTemplate}`) : '',
      youtube: rawYoutube ? (isLocalFile ? rawYoutube : `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=youtube&template=${selectedTemplate}`) : '',
      webTracked: `${TRACKING_DOMAIN}/track/click?user_id=${userId}&link_id=website&template=${selectedTemplate}`,
      
      // Dynamic campaign banner graphics & target links
      campaignLink: resolvedCampaignLink,
      campaignImg: resolvedCampaignImg,
      campaignPartner: resolvedCampaignPartner,
      campaignBtn: resolvedCampaignBtn,
      campaign_enabled: isCampaignEnabled,
      isCampaignEnabled: isCampaignEnabled,
      
      companyBio: COMPANY_DEFAULTS.companyBio,
      sideImage: COMPANY_DEFAULTS.sideImage,
      location: COMPANY_DEFAULTS.business_address || '',
      
      // Open pixel spacer (empty to prevent hidden 1x1 image spam flags)
      openPixel: ''
    };

    // Merge all COMPANY_DEFAULTS properties into data so that custom templates can access them
    for (const [key, val] of Object.entries(COMPANY_DEFAULTS)) {
      if (data[key] === undefined) {
        data[key] = val;
      }
    }

    if (!isCampaignEnabled) {
      data.campaignImg = '';
      data.campaignPartner = '';
      data.campaignBtn = '';
      data.campaignLink = '';
      data.campaign_enabled = false;
    }

    // Check if it is a custom template in the database
    const customTemplate = dbTemplates.find(t => t.id === selectedTemplate);
    if (customTemplate) {
      return makePathsAbsolute(renderCustomTemplate(customTemplate.html_content, data));
    }

    if (selectedTemplate === 'os-premium') {
      return renderOsPremium(data);
    } else if (selectedTemplate === 'grid-blueprint') {
      return renderGridBlueprint(data);
    } else if (selectedTemplate === 'corporate-banner') {
      return renderCorporateBanner(data);
    } else if (selectedTemplate === 'modern-split') {
      return renderModernSplit(data);
    } else if (selectedTemplate === 'compact-stacked') {
      return renderCompactStacked(data);
    } else {
      // Default to the flagship OS Holdings Flat Banner
      return renderOsFlatBanner(data);
    }
  }

  // --- Update Live Preview Window ---
  function updatePreview() {
    const signatureHtml = getSignatureHtml();
    
    // Dynamically update From: header in simulated mail preview
    const previewSender = document.getElementById('mailPreviewSender');
    if (previewSender) {
      const senderName = (fullName && fullName.value.trim()) || 'Andrew';
      const senderEmail = (email && email.value.trim()) || `username@${clientDomain || 'osholdings.co.za'}`;
      previewSender.textContent = `${senderName} <${senderEmail}>`;
    }

    // Direct native virtual canvas rendering (crisp, pixel-perfect, 60fps)
    const canvasViewport = document.getElementById('signatureCanvasViewport') || previewWindow;
    if (canvasViewport) {
      canvasViewport.innerHTML = signatureHtml;
    }
  }

  // --- Scale / size helper ---
  function adjustIframeSize() {
    // Virtual canvas viewport auto-adjusts smoothly with native layout
  }

  // --- Copy Loader Helper ---
  function showCopyLoader(message, successMessage, callback) {
    const copyLoader = document.getElementById('copyLoader');
    const copyLoaderText = document.getElementById('copyLoaderText');
    
    // Execute callback IMMEDIATELY to preserve user gesture context (crucial for Safari/macOS trust)
    let callbackErr = null;
    let callbackPromise = null;
    try {
      callbackPromise = callback();
    } catch (err) {
      callbackErr = err;
    }

    if (copyLoader && copyLoaderText) {
      copyLoaderText.textContent = message;
      copyLoader.style.display = 'flex';
      copyLoader.offsetHeight; // Force reflow
      copyLoader.classList.add('active');
      
      const handleAfterCopy = () => {
        if (callbackErr) {
          copyLoaderText.textContent = "Error copying signature";
        } else {
          copyLoaderText.textContent = successMessage;
        }
        setTimeout(() => {
          copyLoader.classList.remove('active');
          setTimeout(() => {
            copyLoader.style.display = 'none';
          }, 300);
        }, 800); // Keep success message visible for a bit
      };

      if (callbackPromise instanceof Promise) {
        callbackPromise.then(handleAfterCopy).catch((err) => {
          callbackErr = err;
          handleAfterCopy();
        });
      } else {
        setTimeout(handleAfterCopy, 600);
      }
    } else {
      if (callbackErr) console.error("Error during copy:", callbackErr);
    }
  }

  // --- Onboarding User Registration Tracking ---
  async function registerUserOnServer() {
    const isCampaignEnabled = includeCampaign ? includeCampaign.checked : false;
    const emailVal = email.value || 'username@osholdings.co.za';
    
    const payload = {
      name: fullName.value || 'Your Name',
      title: jobTitle.value || 'Your Title',
      department: department.value || '',
      phone: phone.value || '',
      email: emailVal,
      website: COMPANY_DEFAULTS.website,
      template: templateSelect.value,
      campaign_enabled: isCampaignEnabled,
      campaign_id: isCampaignEnabled ? 'sage300_ad' : 'none',
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(`${TRACKING_DOMAIN}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Silent onboarding registration error (backend offline):', err);
    }
  }

  // --- Copy Signature as Rich Text (Universal iOS / Android / Mac / Windows / Outlook / Apple Mail Engine) ---
  function copySignatureToClipboard() {
    return new Promise((resolve, reject) => {
      const signatureHtml = makePathsAbsolute(getSignatureHtml());
      const plainText = `${fullName.value}\n${jobTitle.value}\n${phone.value} | ${email.value}\n${COMPANY_DEFAULTS.website}`;
      
      // 1. Try modern ClipboardItem API first (executed in immediate user gesture tick)
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
          showToast('✓ Rich Signature copied! You can now paste directly into Outlook, Gmail, or Apple Mail.');
          registerUserOnServer();
          resolve();
        }).catch(err => {
          console.warn('navigator.clipboard.write failed, falling back to in-viewport selection:', err);
          fallbackSelectionCopy(signatureHtml, plainText).then(resolve).catch(reject);
        });
      } else {
        fallbackSelectionCopy(signatureHtml, plainText).then(resolve).catch(reject);
      }
    });
  }

  function fallbackSelectionCopy(signatureHtml, plainText) {
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
      container.innerHTML = signatureHtml;
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
        showToast('✓ Rich Signature copied! You can now paste directly into Outlook, Gmail, or Apple Mail.');
        registerUserOnServer();
        resolve();
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(signatureHtml).then(() => {
          showToast('Raw HTML copied to clipboard.', true);
          registerUserOnServer();
          resolve();
        }).catch(reject);
      } else {
        showToast('Copy failed. Please manually copy the preview.', true);
        reject(new Error('Clipboard unsupported'));
      }
    });
  }

  // --- Copy Raw HTML Code ---
  function copyHtmlToClipboard() {
    return new Promise((resolve, reject) => {
      const signatureHtml = makePathsAbsolute(getSignatureHtml());
      try {
        navigator.clipboard.writeText(signatureHtml).then(() => {
          showToast('Raw HTML code copied to clipboard!');
          registerUserOnServer();
          resolve();
        }).catch(err => {
          console.error('navigator.clipboard.writeText failed:', err);
          // Fallback using textarea
          const textarea = document.createElement('textarea');
          textarea.value = signatureHtml;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('Raw HTML code copied to clipboard!');
          registerUserOnServer();
          resolve();
        });
      } catch (err) {
        console.error('Could not copy text: ', err);
        // Fallback using textarea
        try {
          const textarea = document.createElement('textarea');
          textarea.value = signatureHtml;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('Raw HTML code copied to clipboard!');
          registerUserOnServer();
          resolve();
        } catch (fallbackErr) {
          reject(fallbackErr);
        }
      }
    });
  }

  // --- Show Toast Notification ---
  function showToast(message, isWarning = false) {
    toast.textContent = message;
    toast.style.backgroundColor = isWarning ? '#ef4444' : '#4ee000';
    toast.style.color = '#000000'; // Dark text for green toast
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }

  // --- Event Listeners for Export Buttons ---
  if (copySignatureBtn) copySignatureBtn.addEventListener('click', copySignatureToClipboard);
  if (copyHtmlBtn) copyHtmlBtn.addEventListener('click', copyHtmlToClipboard);

  function triggerDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  if (downloadHtmlBtn) {
    downloadHtmlBtn.addEventListener('click', () => {
      const html = makePathsAbsolute(getSignatureHtml());
      const cleanName = (fullName.value || 'signature').trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_');
      triggerDownload(html, `${cleanName}_email_signature.html`, 'text/html');
      showToast('Signature HTML downloaded successfully!');
    });
  }

  // --- Simulator Light / Dark Mode Controls ---
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

  // --- Fetch Templates dynamically from Database ---
  async function fetchDbTemplates() {
    if (isLocalFile) {
      updatePreview();
      return;
    }
    try {
      const url = clientDomain
        ? `${TRACKING_DOMAIN}/api/templates.php?client=${encodeURIComponent(clientDomain)}`
        : `${TRACKING_DOMAIN}/api/templates.php`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.templates && data.templates.length > 0) {
          dbTemplates = data.templates;
          
          // Populate templateSelect dropdown
          if (templateSelect) {
            let optionsHtml = '';
            if (clientDomain && clientDomain !== 'osholdings.co.za' && clientDomain !== 'os-holdings.co.za') {
              // For custom clients, show their dynamic database templates
              dbTemplates.forEach(t => {
                optionsHtml += `<option value="${t.id}">${t.name}</option>`;
              });
            } else {
              // Keep default corporate templates
              optionsHtml = `
                <option value="os-flat-banner" selected>OS Holdings Q1 Email Signature (Flat Banner)</option>
                <option value="os-premium">OS Holdings Modern Branded Card</option>
                <option value="corporate-banner">Corporate Banner Layout</option>
                <option value="modern-split">Modern Split Layout</option>
                <option value="compact-stacked">Clean & Compact Stacked</option>
              `;
            }
            const currentVal = templateSelect.value;
            templateSelect.innerHTML = optionsHtml;
            if (currentVal && templateSelect.querySelector(`option[value="${currentVal}"]`)) {
              templateSelect.value = currentVal;
            } else {
              templateSelect.value = 'os-flat-banner';
            }
            updatePreview();
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Could not fetch remote database templates, maintaining standard layouts.", err);
    }
    updatePreview();
  }

  // --- Fetch Settings dynamically from Database ---
  async function fetchGlobalSettings() {
    if (isLocalFile) return;
    try {
      const url = clientDomain
        ? `${TRACKING_DOMAIN}/api/settings.php?client=${encodeURIComponent(clientDomain)}`
        : `${TRACKING_DOMAIN}/api/settings.php`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const s = data.settings;
          
          // Copy all database settings dynamically into COMPANY_DEFAULTS
          Object.assign(COMPANY_DEFAULTS, s);
          
          // Override standard COMPANY_DEFAULTS properties for legacy fields
          if (s.company_name) COMPANY_DEFAULTS.companyName = s.company_name;
          if (s.company_website) COMPANY_DEFAULTS.website = s.company_website;
          if (s.company_tagline) COMPANY_DEFAULTS.tagline = s.company_tagline;
          if (s.company_bio) COMPANY_DEFAULTS.companyBio = s.company_bio;
          if (s.company_logo) COMPANY_DEFAULTS.logo = s.company_logo;
          if (s.company_brand_graphic) COMPANY_DEFAULTS.sideImage = s.company_brand_graphic;
          if (s.color_primary) COMPANY_DEFAULTS.primaryColor = s.color_primary;
          if (s.color_secondary) COMPANY_DEFAULTS.secondaryColor = s.color_secondary;

          // Dynamically update document title to white-label the tab
          if (s.company_name) {
            document.title = `MailFooter - ${s.company_name} Email Signatures`;
          }

          // Update welcome text in preloader if present
          if (welcomeClientName) {
            welcomeClientName.textContent = `MailFooter for ${COMPANY_DEFAULTS.companyName}`;
          }



          // Update hidden inputs if present
          const formTagline = document.getElementById('tagline');
          if (formTagline && s.company_tagline) {
            formTagline.value = s.company_tagline;
          }
          const formBio = document.getElementById('companyBio');
          if (formBio && s.company_bio) {
            formBio.value = s.company_bio;
          }

          // Update disabled social and website inputs
          if (website && s.company_website) website.value = s.company_website;
          if (linkedinUrl) {
            linkedinUrl.value = s.social_linkedin || COMPANY_DEFAULTS.socialLinkedin || 'https://www.linkedin.com/company/osholdings';
            if (s.social_linkedin) COMPANY_DEFAULTS.socialLinkedin = s.social_linkedin;
          }
          if (twitterUrl) {
            twitterUrl.value = s.social_twitter || COMPANY_DEFAULTS.socialTwitter || 'https://x.com/holdings_os';
            if (s.social_twitter) COMPANY_DEFAULTS.socialTwitter = s.social_twitter;
          }
          if (facebookUrl) {
            facebookUrl.value = s.social_facebook || COMPANY_DEFAULTS.socialFacebook || 'https://www.facebook.com/osholdings';
            if (s.social_facebook) COMPANY_DEFAULTS.socialFacebook = s.social_facebook;
          }
          if (instagramUrl) {
            instagramUrl.value = s.social_instagram || COMPANY_DEFAULTS.socialInstagram || 'https://www.instagram.com/osholdings/';
            if (s.social_instagram) COMPANY_DEFAULTS.socialInstagram = s.social_instagram;
          }
          if (youtubeUrl) {
            youtubeUrl.value = s.social_youtube || COMPANY_DEFAULTS.socialYoutube || '';
            if (s.social_youtube) COMPANY_DEFAULTS.socialYoutube = s.social_youtube;
          }
          
          // Trigger preview update
          updatePreview();
        }
      }
    } catch (err) {
      console.warn("Failed to load global brand settings dynamically. Using hardcoded defaults.", err);
    }
  }


  // --- Preloader & Onboarding Portal Flow ---

  // Helper to validate email
  function validateEmail(emailVal) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailVal);
  }

  // Preloader state transition sequence
  if (paramInstant) {
    if (preloader) preloader.style.display = 'none';
    if (headerLogo) headerLogo.style.opacity = '1';
    if (btnBackToPortal) {
      btnBackToPortal.style.display = 'inline-flex';
      btnBackToPortal.classList.add('visible');
    }
  } else if (preloader && loaderLogo && headerLogo) {
    // Phase 2: Wait for progress bar (1.6s) to finish
    setTimeout(() => {
      // Fade out progress bar
      if (progressContainer) {
        progressContainer.style.transition = 'opacity 0.4s ease';
        progressContainer.style.opacity = '0';
      }
      
      // Update welcome text with loaded company name
      if (welcomeClientName) {
        welcomeClientName.textContent = `MailFooter for ${COMPANY_DEFAULTS.companyName || 'OS Holdings'}`;
      }
      
      // Fade/slide in Welcome Splash
      if (welcomePanel) {
        welcomePanel.classList.add('visible');
      }

      // Phase 3: Wait 2.2s for splash display, then show Onboarding choices
      setTimeout(() => {
        // Fade out Welcome Splash
        if (welcomePanel) {
          welcomePanel.classList.remove('visible');
          welcomePanel.style.opacity = '0';
        }
        
        // Scale logo down from 1.5 to 1.0 and shift it slightly up
        loaderLogo.style.transform = 'translateY(-20px) scale(1.0)';
        
        // Hide progress bar container completely to avoid spacing issues
        if (progressContainer) progressContainer.style.display = 'none';

        // Fade/slide in Onboarding Choice Panel
        setTimeout(() => {
          if (onboardingPanel) {
            onboardingPanel.classList.add('visible');
          }
        }, 100);

      }, 2200);

    }, 1700);
  }

  // Action: Exit Onboarding and run the logo FLIP animation
  function exitOnboarding() {
    if (!preloader || !loaderLogo || !headerLogo) return;

    // Fade out onboarding panel
    if (onboardingPanel) {
      onboardingPanel.classList.remove('visible');
      onboardingPanel.style.opacity = '0';
      onboardingPanel.style.transform = 'translateY(-20px)';
    }

    // Wait a brief moment for choice cards to fade before logo floats
    setTimeout(() => {
      // --- FLIP Animation Technique ---
      // 1. Clear current scale and translation to measure pure untransformed base layout
      loaderLogo.style.transform = 'none';
      loaderLogo.style.transition = 'none';
      
      // Force reflow so browser registers the layout reset
      loaderLogo.offsetHeight;
      
      // 2. Measure actual positions and dimensions
      const headerRect = headerLogo.getBoundingClientRect();
      const loaderRect = loaderLogo.getBoundingClientRect();
      
      const headerCenterX = headerRect.left + headerRect.width / 2;
      const headerCenterY = headerRect.top + headerRect.height / 2;
      
      const loaderCenterX = loaderRect.left + loaderRect.width / 2;
      const loaderCenterY = loaderRect.top + loaderRect.height / 2;
      
      const deltaX = headerCenterX - loaderCenterX;
      const deltaY = headerCenterY - loaderCenterY;
      
      // scaleRatio is destination width / source width
      const scaleRatio = headerRect.width / loaderRect.width;
      
      // 3. Re-apply shifted state instantly without transition
      loaderLogo.style.transform = 'translateY(-20px) scale(1.0)';
      loaderLogo.offsetHeight; // Force reflow
      
      // 4. Play the transition animation to the calculated destination coordinates
      loaderLogo.style.transition = 'transform 1.1s cubic-bezier(0.76, 0, 0.24, 1), opacity 0.8s ease 0.4s';
      loaderLogo.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleRatio})`;
      
      // Fade out preloader background overlay
      preloader.style.transition = 'opacity 0.9s cubic-bezier(0.76, 0, 0.24, 1) 0.2s';
      preloader.style.opacity = '0';
      preloader.style.pointerEvents = 'none';
      
      // Show header logo and clean up preloader
      setTimeout(() => {
        headerLogo.style.opacity = '1';
        preloader.style.display = 'none';
        
        // Show back to portal button
        if (btnBackToPortal) {
          btnBackToPortal.style.display = 'inline-flex';
          btnBackToPortal.offsetHeight;
          btnBackToPortal.classList.add('visible');
        }
        
        // Trigger placeholders cascading typing animation on empty fields
        animatePlaceholder(fullName, 'Name + Surname', 70, 100);
        animatePlaceholder(jobTitle, 'Job Title / Position', 70, 900);
        animatePlaceholder(department, 'Department (Optional)', 70, 1700);
        animatePlaceholder(phone, 'Phone / Mobile Number', 60, 2500);
        const placeholderDomain = clientDomain || 'osholdings.co.za';
        animatePlaceholder(email, `work-email@${placeholderDomain}`, 60, 3300);
      }, 1100);
    }, 300);
  }

  // Action: Go Back to Onboarding Portal
  function enterOnboarding() {
    if (!preloader || !loaderLogo || !headerLogo) return;

    // Show preloader overlay (currently transparent)
    preloader.style.display = 'flex';
    preloader.style.pointerEvents = 'auto';
    preloader.offsetHeight; // Force reflow
    
    // Hide header logo immediately so they don't overlap/duplicate during shift
    headerLogo.style.opacity = '0';
    
    // Hide back button
    if (btnBackToPortal) {
      btnBackToPortal.classList.remove('visible');
      setTimeout(() => {
        btnBackToPortal.style.display = 'none';
      }, 400);
    }

    // Reset onboarding panel starting state before transition
    if (onboardingPanel) {
      onboardingPanel.style.display = 'block';
      onboardingPanel.style.opacity = '0';
      onboardingPanel.style.transform = 'translateY(20px)';
    }

    // Calculate delta to position preloader logo exactly on top of header logo before transition
    // 1. Temporarily clear logo transformations to measure base bounds
    loaderLogo.style.transition = 'none';
    loaderLogo.style.transform = 'translateY(-20px) scale(1.0)';
    loaderLogo.offsetHeight; // Force reflow

    // 2. Measure actual positions and dimensions
    const headerRect = headerLogo.getBoundingClientRect();
    const loaderRect = loaderLogo.getBoundingClientRect();
    
    const headerCenterX = headerRect.left + headerRect.width / 2;
    const headerCenterY = headerRect.top + headerRect.height / 2;
    
    const loaderCenterX = loaderRect.left + loaderRect.width / 2;
    const loaderCenterY = loaderRect.top + loaderRect.height / 2;
    
    const deltaX = headerCenterX - loaderCenterX;
    const deltaY = headerCenterY - loaderCenterY;
    const scaleRatio = headerRect.width / loaderRect.width;

    // 3. Move the loader logo to the header position instantly
    loaderLogo.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleRatio})`;
    loaderLogo.offsetHeight; // Force reflow

    // 4. Smoothly fade the preloader background back in
    preloader.style.transition = 'opacity 0.8s cubic-bezier(0.76, 0, 0.24, 1)';
    preloader.style.opacity = '1';

    // 5. Animate the logo back to the center of the preloader screen
    setTimeout(() => {
      loaderLogo.style.transition = 'transform 1.1s cubic-bezier(0.76, 0, 0.24, 1)';
      loaderLogo.style.transform = 'translateY(-20px) scale(1.0)';

      // 6. Fade the onboarding choice card panel back in
      setTimeout(() => {
        if (onboardingPanel) {
          onboardingPanel.classList.add('visible');
          onboardingPanel.style.opacity = '1';
          onboardingPanel.style.transform = 'translateY(0)';
        }
      }, 300);
    }, 50);

    // 7. Clear retrieve inputs and errors
    if (retrieveEmail) retrieveEmail.value = '';
    if (retrieveError) {
      retrieveError.classList.add('hidden');
      retrieveError.textContent = '';
    }
    if (btnRetrieve) {
      btnRetrieve.disabled = false;
      btnRetrieve.textContent = 'Retrieve';
    }
  }

  // Bind Start Fresh button click
  if (btnStartFresh) {
    btnStartFresh.addEventListener('click', () => {
      exitOnboarding();
    });
  }

  // Bind Direct Skip Preloader button click
  if (btnSkipPreloader) {
    btnSkipPreloader.addEventListener('click', () => {
      exitOnboarding();
    });
  }

  // Escape key global listener to immediately dismiss preloader if desired
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && preloader && preloader.style.display !== 'none') {
      exitOnboarding();
    }
  });

  // Fail-safe Watchdog Timer (3.5s): Guarantees onboarding choice is revealed even if timers or transitions stall
  setTimeout(() => {
    if (preloader && preloader.style.display !== 'none' && onboardingPanel && !onboardingPanel.classList.contains('visible')) {
      if (welcomePanel) {
        welcomePanel.classList.remove('visible');
        welcomePanel.style.opacity = '0';
      }
      if (progressContainer) progressContainer.style.display = 'none';
      if (loaderLogo) loaderLogo.style.transform = 'translateY(-20px) scale(1.0)';
      if (onboardingPanel) onboardingPanel.classList.add('visible');
    }
  }, 3500);

  // Bind Back button click
  if (btnBackToPortal) {
    btnBackToPortal.addEventListener('click', () => {
      enterOnboarding();
    });
  }

  // Helper to retrieve user profile details
  async function retrieveUserProfile(emailVal) {
    if (retrieveError) retrieveError.classList.add('hidden');
    
    if (btnRetrieve) {
      btnRetrieve.disabled = true;
      btnRetrieve.textContent = 'Retrieving...';
    }
    
    try {
      const response = await fetch(`${TRACKING_DOMAIN}/api/users.php?email=${encodeURIComponent(emailVal)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const u = data.user;
          
          // Populate user portal input fields
          if (fullName && u.name) fullName.value = u.name;
          if (jobTitle && u.title) jobTitle.value = u.title;
          if (department) department.value = u.department || '';
          if (phone) phone.value = u.phone || '';
          if (email && u.email) email.value = u.email;
          if (templateSelect && u.template) templateSelect.value = u.template;
          
          if (includeCampaign && u.campaign_enabled !== undefined) {
            includeCampaign.checked = parseInt(u.campaign_enabled) === 1;
          }
          
          // Re-render preview iframe immediately
          updatePreview();
          
          // Exit portal and reveal dashboard
          exitOnboarding();
          return true;
        } else {
          if (retrieveError) {
            retrieveError.textContent = 'No saved signature found for this email address.';
            retrieveError.classList.remove('hidden');
          }
        }
      } else {
        if (retrieveError) {
          retrieveError.textContent = 'Database error. Please try again later.';
          retrieveError.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.warn("Error retrieving user details:", err);
      if (retrieveError) {
        retrieveError.textContent = 'Network offline. Please try again.';
        retrieveError.classList.remove('hidden');
      }
    } finally {
      if (btnRetrieve) {
        btnRetrieve.disabled = false;
        btnRetrieve.textContent = 'Retrieve';
      }
    }
    return false;
  }

  // Bind Retrieve button click
  if (btnRetrieve && retrieveEmail) {
    btnRetrieve.addEventListener('click', async () => {
      const emailVal = retrieveEmail.value.trim();
      
      if (!emailVal || !validateEmail(emailVal)) {
        if (retrieveError) {
          retrieveError.textContent = 'Please enter a valid work email address.';
          retrieveError.classList.remove('hidden');
        }
        return;
      }
      await retrieveUserProfile(emailVal);
    });
  }

  // --- Typewriter Effect for Placeholders ---
  function animatePlaceholder(element, text, speed = 80, delayBeforeStart = 500) {
    if (!element) return;
    if (element.value.trim() !== '') return; // Skip if already contains data
    
    let index = 0;
    element.placeholder = '';
    
    setTimeout(() => {
      // Re-verify empty state before typing starts
      if (element.value.trim() !== '') return;
      
      const timer = setInterval(() => {
        if (element.value.trim() !== '') {
          clearInterval(timer);
          return;
        }
        if (index < text.length) {
          element.placeholder += text.charAt(index);
          index++;
        } else {
          clearInterval(timer);
        }
      }, speed);
    }, delayBeforeStart);
  }

  // --- Auto-Save User Profile changes to Server ---
  function setupAutoSave() {
    const inputs = [fullName, jobTitle, department, phone, email];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('blur', () => {
          if (email && email.value && validateEmail(email.value.trim())) {
            registerUserOnServer();
          }
        });
      }
    });

    if (templateSelect) {
      templateSelect.addEventListener('change', () => {
        if (email && email.value && validateEmail(email.value.trim())) {
          registerUserOnServer();
        }
      });
    }

    if (includeCampaign) {
      includeCampaign.addEventListener('change', () => {
        schedulePreviewUpdate();
        if (email && email.value && validateEmail(email.value.trim())) {
          registerUserOnServer();
        }
      });
    }
  }

  // --- Dynamic Year Attribution ---
  const yearEl = document.getElementById('appCurrentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- Header Client Logo Interactive Replacement ---
  const clientLogoDropzone = document.getElementById('clientLogoDropzone');
  const clientLogoFileInput = document.getElementById('clientLogoFileInput');
  const headerClientLogoImg = document.getElementById('headerClientLogoImg');

  if (clientLogoDropzone && clientLogoFileInput) {
    clientLogoDropzone.addEventListener('click', () => {
      clientLogoFileInput.click();
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      clientLogoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        clientLogoDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      clientLogoDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        clientLogoDropzone.classList.remove('dragover');
      });
    });

    clientLogoDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt && dt.files;
      if (files && files[0]) {
        handleNewLogoFile(files[0]);
      }
    });

    clientLogoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleNewLogoFile(e.target.files[0]);
      }
    });

    function handleNewLogoFile(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file (PNG, JPG, SVG)', true);
        return;
      }
      clientLogoDropzone.classList.add('is-changing');
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        if (headerClientLogoImg) headerClientLogoImg.src = dataUrl;
        COMPANY_DEFAULTS.logo = dataUrl;
        schedulePreviewUpdate();
        setTimeout(() => {
          clientLogoDropzone.classList.remove('is-changing');
          showToast('Client logo updated successfully!');
        }, 500);
      };
      reader.onerror = () => {
        clientLogoDropzone.classList.remove('is-changing');
      };
      reader.readAsDataURL(file);
    }
  }

  // --- Initialize Preview ---
  updatePreview();
  fetchGlobalSettings();
  fetchDbTemplates();
  setupAutoSave();

  // --- Auto-Retrieve User profile from URL query param or Handle Create New ---
  if (paramCreate) {
    if (paramName && fullName) fullName.value = paramName;
    if (paramEmail && email) email.value = paramEmail;
    updatePreview();
    exitOnboarding();
  } else if (queryEmail) {
    if (retrieveEmail) retrieveEmail.value = queryEmail;
    retrieveUserProfile(queryEmail);
  }
});
