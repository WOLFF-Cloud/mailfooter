const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// In-memory mock database state
const mockUsers = {};
const mockClicks = [];
const mockOpens = [];
const mockClients = {};
const mockAdmins = {
  'admin@wolff-tech.com': { name: 'Sarah Jenkins', domain: 'wolff-tech.com', password: 'WolffDemo2026!' },
  'sarah.jenkins@wolff-tech.com': { name: 'Sarah Jenkins', domain: 'wolff-tech.com', password: 'WolffDemo2026!' },
  'marcus.vance@wolff-tech.com': { name: 'Marcus Vance', domain: 'wolff-tech.com', password: 'WolffDemo2026!' },
  'daniel.mercer@apexglobal.io': { name: 'Daniel Mercer', domain: 'apexglobal.io', password: 'ApexDemo2026!' }
};
const mockResetTokens = {};
const mockEmailLogs = [];

const PORT = 3000;
const ROOT_DIR = __dirname;

// Helper to determine Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.ico': return 'image/x-icon';
    default: return 'application/octet-stream';
  }
}

// Extract Amathuba HTML template from api/db.php
function getAmathubaHtml() {
  try {
    const dbPhpPath = path.join(ROOT_DIR, 'api', 'db.php');
    if (fs.existsSync(dbPhpPath)) {
      const dbContent = fs.readFileSync(dbPhpPath, 'utf8');
      const match = dbContent.match(/\$amathubaHtml\s*=\s*'([\s\S]*?)';/);
      if (match) {
        return match[1].replace(/\\'/g, "'");
      }
    }
  } catch (e) {
    console.error("Error reading template from db.php:", e);
  }
  return "";
}

// Server Request Handler
const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Impersonate');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Mock tracking: open
  if (pathname.startsWith('/track/open') || pathname.startsWith('/track/logo')) {
    const email = parsedUrl.query.user_id || '';
    const campaignId = parsedUrl.query.campaign_id || 'none';
    if (email) {
      mockOpens.push({
        email: email,
        campaign_id: campaignId,
        timestamp: new Date().toISOString()
      });
    }
    // Return transparent 1x1 GIF
    res.writeHead(200, { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache' });
    res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    return;
  }

  // Mock tracking: click
  if (pathname.startsWith('/track/click')) {
    const email = parsedUrl.query.user_id || '';
    const linkId = parsedUrl.query.link_id || 'website';
    if (email) {
      mockClicks.push({
        email: email,
        link_id: linkId,
        timestamp: new Date().toISOString()
      });
    }
    // Redirect to default destination
    res.writeHead(302, { 'Location': 'https://os-holdings.co.za/' });
    res.end();
    return;
  }

  // Normalize extensionless routes
  if (pathname === '/mailfooter' || pathname === '/mailfooter/' || pathname === '/login' || pathname === '/login/') {
    pathname = '/index.html';
  } else if (pathname === '/landing' || pathname === '/landing/') {
    pathname = '/landing-index.html';
  } else if (pathname === '/admin' || pathname === '/admin/') {
    pathname = '/admin.html';
  } else if (pathname === '/super-admin' || pathname === '/super-admin/') {
    pathname = '/super-admin.html';
  } else if (pathname === '/app' || pathname === '/app/') {
    pathname = '/app.html';
  } else if (pathname === '/register' || pathname === '/register/') {
    pathname = '/register.html';
  } else if (pathname === '/reset-password' || pathname === '/reset-password/') {
    pathname = '/reset-password.html';
  } else if (pathname === '/index' || pathname === '/index/') {
    pathname = '/index.html';
  }

  // Helper to check if request is for a specific API endpoint (supports extensionless or .php)
  function isApiEndpoint(endpointName) {
    if (pathname.startsWith('/api/')) {
      const cleanPath = pathname.substring(5).replace('.php', '');
      return cleanPath === endpointName;
    }
    return false;
  }

  // 1. MOCK API: settings
  if (isApiEndpoint('settings')) {
    const client = parsedUrl.query.client || '';
    let settings = {};

    if (client === 'amathuba-ai.com') {
      settings = {
        company_name: 'Amathuba AI',
        company_website: 'https://www.amathuba-ai.com',
        company_logo: 'Resources/amathuba/logo.png',
        company_brand_graphic: 'Resources/amathuba/brand-graphic-colour-top-left.png',
        brand_element_pattern: 'Resources/amathuba/brand-graphic-grey-bottom-right.png',
        color_primary: '#C52031',
        color_secondary: '#222E35',
        social_facebook: 'https://www.facebook.com/AmathubaAI/',
        social_twitter: 'https://x.com/AmathubaA',
        social_instagram: 'https://www.instagram.com/amathubaai/',
        social_linkedin: 'https://za.linkedin.com/company/amathuba-ai',
        btn_request_demo: 'Resources/amathuba/request-a-demo-cta-button.png',
        btn_ask_nandi: 'Resources/amathuba/ask-nandi-cta-button.png',
        btn_khulisa: 'Resources/amathuba/khulisa-cta-button.png',
        btn_intelidocs: 'Resources/amathuba/intelidocs-cta-button.png',
        btn_smart_contracts: 'Resources/amathuba/smart-contracts-cta-button.png',
        btn_commercial_intelligence: 'Resources/amathuba/commercial-intelligence-cta-button.png',
        our_partners_osh: 'Resources/amathuba/our-partners-osh-logo.png',
        our_partners_sage: 'Resources/amathuba/our-partners-sage-logo.png',
        our_partners_askelie: 'Resources/amathuba/our-partners-askelie-logo.png',
        icon_bg: 'Resources/amathuba/icon-bg.png',
        icon_linkedin: 'Resources/amathuba/icon-linkedin.png',
        icon_instagram: 'Resources/amathuba/icon-instagram.png',
        icon_twitter: 'Resources/amathuba/icon-twitter.png',
        icon_facebook: 'Resources/amathuba/icon-facebook.png',
        icon_youtube: 'Resources/amathuba/icon-youtube.png',
        company_tagline: 'Amathuba Artificial Intelligence',
        company_bio: 'Amathuba AI is committed to pioneering artificial intelligence solutions in Africa.'
      };
    } else {
      settings = {
        company_name: 'OS Holdings',
        company_website: 'https://os-holdings.co.za/',
        company_logo: 'Resources/2x/logo.png',
        company_brand_graphic: 'Resources/2x/brand-graphic-colour-top-right.png',
        color_primary: '#0d4b8e',
        color_secondary: '#f18a22',
        social_facebook: 'https://www.facebook.com/osholdings',
        social_twitter: 'https://x.com/holdings_os',
        social_linkedin: 'https://www.linkedin.com/company/osholdings',
        social_instagram: 'https://www.instagram.com/osholdings/',
        social_youtube: 'https://youtube.com/osholdings',
        company_tagline: 'Innovate | Excel | Grow',
        company_bio: 'OS Holdings is a diversified software solution company committed to creating lasting value.'
      };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, settings }));
    return;
  }

  // 2. MOCK API: templates
  if (isApiEndpoint('templates')) {
    const client = parsedUrl.query.client || '';
    let templates = [];

    if (client === 'amathuba-ai.com') {
      templates = [
        {
          id: 'amathuba-default',
          name: 'Amathuba AI Signature',
          html_content: getAmathubaHtml(),
          client_domain: 'amathuba-ai.com'
        }
      ];
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, templates }));
    return;
  }

  // 3. MOCK API: users
  if (isApiEndpoint('users')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const isBulk = parsedUrl.query.bulk === '1' || data.action === 'bulk' || Array.isArray(data.users) || Array.isArray(data);
          
          if (isBulk) {
            const list = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
            let count = 0;
            list.forEach(u => {
              const email = (u.email || '').toLowerCase().trim();
              const name = (u.name || ((u.firstName || '') + ' ' + (u.lastName || ''))).trim();
              if (email && name) {
                mockUsers[email] = {
                  email: email,
                  name: name,
                  title: u.title || u.jobTitle || '',
                  department: u.department || u.dept || 'General',
                  phone: u.phone || u.mobile || '',
                  template: u.template || 'os-flat-banner',
                  campaign_enabled: u.campaign_enabled ? 1 : 0,
                  campaign_id: u.campaign_id || null,
                  created_at: new Date().toISOString()
                };
                count++;
              }
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count, message: `Successfully imported ${count} personnel records.` }));
            return;
          }

          if (!data || !data.email || !data.name) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Missing email or name' }));
            return;
          }
          const email = data.email.toLowerCase().trim();
          mockUsers[email] = {
            email: email,
            name: data.name,
            title: data.title || '',
            department: data.department || '',
            phone: data.phone || '',
            template: data.template || 'os-flat-banner',
            campaign_enabled: data.campaign_enabled ? 1 : 0,
            campaign_id: data.campaign_id || null,
            created_at: new Date().toISOString()
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'User registered successfully' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
    } else {
      // GET request: supports ?email=..., ?query=... / ?search=..., ?name=..., ?list=1
      const queryVal = (parsedUrl.query.query || parsedUrl.query.search || parsedUrl.query.name || parsedUrl.query.email || '').toLowerCase().trim();
      const listAll = parsedUrl.query.list === '1' || parsedUrl.query.all === '1';

      if (listAll) {
        const clientFilter = (parsedUrl.query.client || '').toLowerCase().trim();
        let users = Object.values(mockUsers);
        if (clientFilter && clientFilter !== 'all') {
          users = users.filter(u => {
            const uDomain = (u.email || '').split('@')[1] || '';
            const mappedDomain = (uDomain === 'osbusinessamp.com' || uDomain === 'osbusinessam.com') ? 'osholdings.co.za' : uDomain;
            const mappedClient = (clientFilter === 'osbusinessamp.com' || clientFilter === 'osbusinessam.com') ? 'osholdings.co.za' : clientFilter;
            return mappedDomain === mappedClient || (mappedClient === 'osholdings.co.za' && uDomain === 'os-holdings.co.za');
          });
        }
        const directory = users.map(u => ({
          name: u.name,
          email: u.email,
          title: u.title,
          department: u.department,
          phone: u.phone,
          template: u.template,
          campaign_enabled: u.campaign_enabled,
          campaign_id: u.campaign_id,
          created_at: u.created_at
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, users: directory }));
        return;
      }

      if (!queryVal) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing search query or email parameter' }));
        return;
      }

      // Exact email match
      if (mockUsers[queryVal]) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: mockUsers[queryVal] }));
        return;
      }

      // Name or email match across all mock users
      const allUsers = Object.values(mockUsers);
      const exactNameMatch = allUsers.find(u => (u.name || '').toLowerCase().trim() === queryVal);
      if (exactNameMatch) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: exactNameMatch }));
        return;
      }

      const partialMatches = allUsers.filter(u => 
        (u.name || '').toLowerCase().includes(queryVal) || 
        (u.email || '').toLowerCase().includes(queryVal)
      );

      if (partialMatches.length > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, user: partialMatches[0], matches: partialMatches }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'User not found' }));
    }
    return;
  }

  // 3.5 MOCK API: login
  if (isApiEndpoint('login')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const email = (data.email || '').toLowerCase().trim();
          const password = data.password || '';

          if (email === 'superadmin@mailfooter.com' && password === 'superadmin') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, role: 'superadmin', email }));
            return;
          }

          const adminRecord = mockAdmins[email];
          const isDemoMatch = (adminRecord && (password === 'WolffDemo2026!' || password === 'ApexDemo2026!' || password === adminRecord.password));

          if (isDemoMatch) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              role: 'admin',
              email,
              domain: adminRecord.domain,
              name: adminRecord.name,
              company_name: adminRecord.company_name || 'Corporate Tenant'
            }));
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid administrative email or password.' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON request' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    }
    return;
  }

  // 3.6 MOCK API: register
  if (isApiEndpoint('register')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const companyName = (data.companyName || '').trim();
          const rawDomain = (data.companyDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
          const adminName = (data.adminName || '').trim();
          const adminEmail = (data.adminEmail || '').trim().toLowerCase();
          const adminPassword = data.adminPassword || '';
          const plan = data.plan || 'starter';
          const billingCycle = data.billingCycle || 'annual';
          const billingMethod = data.billingMethod || 'invoice';

          if (!companyName || !rawDomain || !adminName || !adminEmail || !adminPassword) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'All required fields must be completed.' }));
            return;
          }

          if (mockClients[rawDomain]) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: `Organization with domain '${rawDomain}' is already registered.` }));
            return;
          }

          const invoiceId = 'inv_' + Date.now().toString().slice(-6);
          const planPrices = { starter: 1500, team: 2300, enterprise: 4500, custom: 12500 };
          const planUsers = { starter: 5, team: 20, enterprise: 50, custom: 999 };
          const price = planPrices[plan] || 1500;
          const maxUsers = planUsers[plan] || 5;

          // Save in mock stores
          mockClients[rawDomain] = {
            id: 'client_' + rawDomain.replace(/[^a-z0-9]/g, '_'),
            name: companyName,
            domain: rawDomain,
            plan: plan,
            plan_name: plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan',
            max_users: maxUsers,
            billing_cycle: billingCycle,
            price: price,
            admin_name: adminName,
            admin_email: adminEmail,
            created_at: new Date().toISOString()
          };

          mockAdmins[adminEmail] = {
            name: adminName,
            domain: rawDomain,
            company_name: companyName,
            password: adminPassword
          };

          mockUsers[adminEmail] = {
            email: adminEmail,
            name: adminName,
            title: 'Managing Administrator',
            department: 'Executive',
            phone: data.adminPhone || '',
            template: 'db-default'
          };

          const welcomeHtml = `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #0f172a;">Welcome to MailFooter, ${adminName}!</h2>
              <p>Your tenant environment for <strong>${companyName}</strong> (${rawDomain}) is live.</p>
              <p>Plan: <strong>${plan.toUpperCase()}</strong> (${maxUsers} Users Limit)</p>
              <p>Invoice Reference: <strong>${invoiceId}</strong></p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p>Log in to your Admin Dashboard to configure your branding guidelines and signatures.</p>
            </div>
          `;

          mockEmailLogs.push({
            id: mockEmailLogs.length + 1,
            recipient: adminEmail,
            recipient_name: adminName,
            subject: `Welcome to MailFooter - ${companyName} Environment Provisioned`,
            email_type: 'welcome',
            client_domain: rawDomain,
            status: 'sent',
            body_html: welcomeHtml,
            created_at: new Date().toISOString()
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `Tenant for ${companyName} provisioned successfully.`,
            client: {
              id: 'client_' + rawDomain.replace(/[^a-z0-9]/g, '_'),
              name: companyName,
              domain: rawDomain,
              plan: plan,
              plan_name: plan.charAt(0).toUpperCase() + plan.slice(1) + ' Plan',
              max_users: maxUsers,
              billing_cycle: billingCycle,
              price: price,
              admin_name: adminName,
              admin_email: adminEmail,
              invoice_id: invoiceId,
              invoice_status: (billingMethod === 'cc' ? 'paid' : 'pending')
            },
            session: {
              admin_domain: rawDomain,
              admin_email: adminEmail,
              admin_name: adminName,
              role: 'admin'
            },
            welcome_email: {
              recipient: adminEmail,
              subject: `Welcome to MailFooter - ${companyName} Environment Provisioned`,
              status: 'sent',
              log_id: mockEmailLogs.length,
              body_html: welcomeHtml
            }
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        }
      });
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    }
    return;
  }

  // 3.7 MOCK API: password_reset
  if (isApiEndpoint('password_reset')) {
    const action = parsedUrl.query.action || '';
    if (action === 'request' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const email = (data.email || '').trim().toLowerCase();
          const token = 'mock_token_' + Date.now();
          mockResetTokens[token] = { email, expires: Date.now() + 3600000 };

          const resetLink = `http://localhost:${PORT}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'If an account matches this email, a reset link has been dispatched.',
            debug_reset_link: resetLink
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
        }
      });
      return;
    } else if (action === 'verify' && req.method === 'GET') {
      const token = parsedUrl.query.token || '';
      const email = parsedUrl.query.email || '';
      const valid = mockResetTokens[token] && mockResetTokens[token].email === email && mockResetTokens[token].expires > Date.now();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: valid, valid: Boolean(valid) }));
      return;
    } else if (action === 'reset' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const email = (data.email || '').trim().toLowerCase();
          const password = data.password || '';
          if (mockAdmins[email]) {
            mockAdmins[email].password = password;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Password has been successfully updated.' }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
        }
      });
      return;
    }
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Invalid action' }));
    return;
  }

  // 3.8 MOCK API: mailer
  if (isApiEndpoint('mailer')) {
    const action = parsedUrl.query.action || '';
    if (action === 'logs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: mockEmailLogs.length, logs: mockEmailLogs }));
      return;
    } else if (action === 'preview') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>MailFooter Preview: Welcome Email</h1><p>Demo preview content.</p>');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Mailer API online' }));
    return;
  }

  // 4. MOCK API: stats
  if (isApiEndpoint('stats')) {
    const client = (parsedUrl.query.client || '').toLowerCase().trim();
    
    // Filter mock users by client domain (with OSH group domain mapping)
    const employees = Object.values(mockUsers).filter(u => {
      const uDomain = u.email.split('@')[1] || '';
      const mappedDomain = (uDomain === 'osbusinessamp.com' || uDomain === 'osbusinessam.com') ? 'osholdings.co.za' : uDomain;
      return mappedDomain === client;
    });

    const totalUsers = employees.length;
    
    const clientOpens = mockOpens.filter(o => {
      const oDomain = o.email.split('@')[1] || '';
      const mappedDomain = (oDomain === 'osbusinessamp.com' || oDomain === 'osbusinessam.com') ? 'osholdings.co.za' : oDomain;
      return mappedDomain === client;
    });
    
    const totalOpens = clientOpens.length;
    
    const clientClicks = mockClicks.filter(c => {
      const cDomain = c.email.split('@')[1] || '';
      const mappedDomain = (cDomain === 'osbusinessamp.com' || cDomain === 'osbusinessam.com') ? 'osholdings.co.za' : cDomain;
      return mappedDomain === client;
    });
    
    const totalClicks = clientClicks.length;
    const ctr = totalOpens > 0 ? parseFloat(((totalClicks / totalOpens) * 100).toFixed(1)) : 0;

    // Simple device/client classification from mockOpens
    const deviceStats = { Desktop: 0, Mobile: 0, Tablet: 0, Unknown: 0 };
    const clientStats = { Outlook: 0, Gmail: 0, "Apple Mail": 0, "Web Browser / Other": 0, Unknown: 0 };
    
    // Simple locations from mockOpens
    const locationsMap = {};
    clientOpens.forEach(() => {
      const loc = "Johannesburg, South Africa";
      locationsMap[loc] = (locationsMap[loc] || 0) + 1;
    });
    const locations = Object.entries(locationsMap).map(([loc, count]) => ({ location: loc, count: count }));

    const links = {
      'Company Website': clientClicks.filter(c => c.link_id === 'website').length,
      'Marketing Banner': clientClicks.filter(c => c.link_id === 'campaign_banner').length,
      'LinkedIn Profile': clientClicks.filter(c => c.link_id === 'linkedin').length,
      'Twitter/X Profile': clientClicks.filter(c => c.link_id === 'twitter').length,
      'Instagram Profile': clientClicks.filter(c => c.link_id === 'instagram').length,
      'Facebook Profile': clientClicks.filter(c => c.link_id === 'facebook').length,
      'YouTube Channel': clientClicks.filter(c => c.link_id === 'youtube').length
    };

    // Build activity feed log from mock opens and clicks
    const activityLog = [];
    clientOpens.forEach(o => {
      const userObj = mockUsers[o.email] || { name: o.email.split('@')[0] };
      activityLog.push({
        type: 'open',
        user: userObj.name,
        email: o.email,
        detail: 'Email opened',
        timestamp: o.timestamp
      });
    });
    clientClicks.forEach(c => {
      const userObj = mockUsers[c.email] || { name: c.email.split('@')[0] };
      const detailMap = {
        'website': 'Clicked Website',
        'campaign_banner': 'Clicked Campaign Banner',
        'linkedin': 'Clicked LinkedIn',
        'twitter': 'Clicked Twitter',
        'instagram': 'Clicked Instagram',
        'facebook': 'Clicked Facebook',
        'youtube': 'Clicked YouTube'
      };
      activityLog.push({
        type: 'click',
        user: userObj.name,
        email: c.email,
        detail: detailMap[c.link_id] || 'Clicked Link',
        timestamp: c.timestamp
      });
    });
    
    // Sort activity DESC
    activityLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentActivity = activityLog.slice(0, 30);

    const stats = {
      success: true,
      metrics: {
        total_users: totalUsers,
        total_opens: totalOpens,
        total_clicks: totalClicks,
        ctr: ctr,
        devices: deviceStats,
        clients: clientStats,
        locations: locations,
        links: links,
        campaign: {
          id: client === 'amathuba-ai.com' ? "amathuba_campaign" : "sage300_ad",
          name: client === 'amathuba-ai.com' ? "Amathuba AI Products Launch" : "OS Holdings - Sage 300 Ad",
          link: client === 'amathuba-ai.com' ? "https://www.amathuba-ai.com" : "https://os-holdings.co.za/sage-300-people-signup/",
          clicks: clientClicks.filter(c => c.link_id === 'campaign_banner').length,
          opens: mockOpens.filter(o => o.campaign_id !== 'none' && (o.email.split('@')[1] || '') === client).length,
          ctr: 0
        }
      },
      employees: employees.map(emp => ({
        name: emp.name,
        email: emp.email,
        title: emp.title,
        department: emp.department,
        created_at: emp.created_at,
        opens: mockOpens.filter(o => o.email === emp.email).length,
        clicks: mockClicks.filter(c => c.email === emp.email).length
      })),
      activity: recentActivity
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats));
    return;
  }

  // 5. MOCK API: campaigns
  if (isApiEndpoint('campaigns')) {
    const client = parsedUrl.query.client || '';
    let campaigns = [];
    if (client === 'amathuba-ai.com') {
      campaigns = [
        {
          id: 'amathuba_campaign',
          name: 'Amathuba AI Launch',
          image_main: 'Resources/amathuba/cta-banner.png',
          image_partner: null,
          image_button: 'Resources/amathuba/request-a-demo-cta-button.png',
          target_link: 'https://www.amathuba-ai.com/demo-signup',
          is_active: 1,
          template_id: 'amathuba-default',
          client_domain: 'amathuba-ai.com'
        }
      ];
    } else {
      campaigns = [
        {
          id: 'sage300_ad',
          name: 'OS Holdings - Sage 300 Ad',
          image_main: 'Resources/2x/cta-banner-left.png',
          image_partner: 'Resources/2x/cta-banner-right-top.png',
          image_button: 'Resources/2x/cta-banner-right-bottom.png',
          target_link: 'https://os-holdings.co.za/sage-300-people-signup/',
          is_active: 1,
          template_id: 'all',
          client_domain: 'osholdings.co.za'
        }
      ];
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, campaigns }));
    return;
  }

  // 4. MOCK API: track image pixel endpoints (prevent 404 broken images in live preview iframe)
  if (pathname.includes('/track/')) {
    const userId = parsedUrl.query.user_id || '';
    let domain = 'osholdings.co.za';
    if (userId.includes('@')) {
      domain = userId.split('@')[1];
    } else if (userId.includes('%40')) {
      domain = userId.split('%40')[1];
    }

    if (pathname.includes('/track/logo')) {
      const imgPath = (domain === 'amathuba-ai.com')
        ? path.join(ROOT_DIR, 'Resources', 'amathuba', 'logo.png')
        : path.join(ROOT_DIR, 'Resources', '1x', 'logo.png');

      if (fs.existsSync(imgPath)) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        fs.createReadStream(imgPath).pipe(res);
        return;
      }
    }

    if (pathname.includes('/track/banner')) {
      const type = parsedUrl.query.type || 'main';
      let imgPath = '';

      if (domain === 'amathuba-ai.com') {
        if (type === 'main') {
          imgPath = path.join(ROOT_DIR, 'Resources', 'amathuba', 'cta-banner.png');
        } else if (type === 'button') {
          imgPath = path.join(ROOT_DIR, 'Resources', 'amathuba', 'request-a-demo-cta-button.png');
        }
      } else {
        if (type === 'main') {
          imgPath = path.join(ROOT_DIR, 'Resources', '1x', 'cta-banner-left.png');
        } else if (type === 'partner') {
          imgPath = path.join(ROOT_DIR, 'Resources', '1x', 'cta-banner-right-top.png');
        } else if (type === 'button') {
          imgPath = path.join(ROOT_DIR, 'Resources', '1x', 'cta-banner-right-bottom.png');
        }
      }

      if (imgPath && fs.existsSync(imgPath)) {
        res.writeHead(200, { 'Content-Type': getContentType(imgPath) });
        fs.createReadStream(imgPath).pipe(res);
        return;
      }
    }

    // Default fallback to transparent 1x1 pixel
    res.writeHead(200, { 'Content-Type': 'image/png' });
    const pixelBuf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.end(pixelBuf);
    return;
  }

  // 5. STATIC FILES SERVING
  // Default to index.html if pointing to directory root
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  MailFooter Mock Dev Server is running!                      `);
  console.log(`  Access the app builder for the new client here:               `);
  console.log(`                                                                `);
  console.log(`  http://localhost:${PORT}/app.html?client=amathuba-ai.com&email=nomsa@amathuba-ai.com`);
  console.log(`                                                                `);
  console.log(`  Press Ctrl+C to stop the server.                              `);
  console.log(`================================================================`);
});
