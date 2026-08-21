<?php
// api/db.php
// Wolff Demo Environment - Automated SQLite Initializer & Showcase Seeder

// Ensure database directory exists
$dbDir = dirname(__DIR__) . '/database';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0755, true);
}

$dbPath = $dbDir . '/database.sqlite';

try {
    $pdo = new PDO("sqlite:" . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
    // Enable SQLite foreign keys
    $pdo->exec("PRAGMA foreign_keys = ON;");
    
    // Initialize Database Schema
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT NOT NULL,
            department TEXT,
            phone TEXT,
            template TEXT,
            campaign_enabled INTEGER DEFAULT 0,
            campaign_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS opens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            campaign_id TEXT,
            user_agent TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            link_id TEXT,
            destination TEXT,
            user_agent TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ip_cache (
            ip TEXT PRIMARY KEY,
            country TEXT NOT NULL,
            city TEXT NOT NULL,
            lat REAL,
            lon REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS campaigns (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            image_main TEXT NOT NULL,
            image_partner TEXT,
            image_button TEXT,
            target_link TEXT NOT NULL,
            is_active INTEGER DEFAULT 0,
            template_id TEXT DEFAULT 'all',
            client_domain TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT
        );
        
        CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            html_content TEXT NOT NULL,
            client_domain TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            domain TEXT NOT NULL UNIQUE,
            plan TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            billing_cycle TEXT DEFAULT 'annual',
            price REAL DEFAULT 0,
            admin_name TEXT NOT NULL,
            admin_email TEXT NOT NULL,
            admin_phone TEXT,
            remote_token TEXT NOT NULL,
            notes TEXT,
            suspended_at DATETIME,
            last_update_pushed DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS price_plans (
            plan_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            max_users INTEGER NOT NULL,
            price_zar_annual REAL NOT NULL,
            price_zar_monthly REAL NOT NULL,
            price_usd_annual REAL NOT NULL,
            price_usd_monthly REAL NOT NULL,
            features TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            target TEXT,
            ip_address TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            client_domain TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ZAR',
            status TEXT DEFAULT 'pending',
            issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            due_at DATETIME,
            paid_at DATETIME,
            paystack_reference TEXT
        );

        CREATE TABLE IF NOT EXISTS admin_users (
            email TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ");

    // ==========================================
    // SEED DEFAULT PRICING PLANS
    // ==========================================
    $countPlans = $pdo->query("SELECT COUNT(*) FROM price_plans")->fetchColumn();
    if ($countPlans == 0) {
        $stmt = $pdo->prepare("
            INSERT INTO price_plans (plan_id, name, max_users, price_zar_annual, price_zar_monthly, price_usd_annual, price_usd_monthly, features)
            VALUES (:id, :name, :max, :zar_ann, :zar_mon, :usd_ann, :usd_mon, :features)
        ");
        $defaultPlans = [
            ['starter', 'Starter Plan', 5, 1500, 150, 85, 8.5, 'campaigns,remove_branding'],
            ['team', 'Team Plan', 20, 2300, 230, 130, 13, 'campaigns,remove_branding,custom_templates'],
            ['enterprise', 'Enterprise Plan', 50, 4500, 450, 250, 25, 'campaigns,remove_branding,custom_templates,api_access'],
            ['custom', 'Custom Enterprise', 999999, 12500, 1250, 750, 75, 'campaigns,remove_branding,custom_templates,api_access,dedicated_support']
        ];
        foreach ($defaultPlans as $p) {
            $stmt->execute([
                ':id' => $p[0],
                ':name' => $p[1],
                ':max' => $p[2],
                ':zar_ann' => $p[3],
                ':zar_mon' => $p[4],
                ':usd_ann' => $p[5],
                ':usd_mon' => $p[6],
                ':features' => $p[7]
            ]);
        }
    }

    // ==========================================
    // SEED DEMO CLIENT TENANTS
    // ==========================================
    $countClients = $pdo->query("SELECT COUNT(*) FROM clients")->fetchColumn();
    if ($countClients == 0) {
        $clientsToSeed = [
            [
                'client_wolff', 'Wolff Technologies', 'wolff-tech.com', 'enterprise', 'active', 'annual', 4500,
                'Sarah Jenkins', 'admin@wolff-tech.com', '+1 (555) 234-5678', 'token_wolff_demo', 'Primary Wolff Demo enterprise tenant.',
                null, date('Y-m-d H:i:s', strtotime('-1 day')), date('Y-m-d H:i:s', strtotime('-180 days'))
            ],
            [
                'client_apex', 'Apex Global', 'apexglobal.io', 'starter', 'active', 'annual', 1500,
                'Daniel Mercer', 'daniel.mercer@apexglobal.io', '+1 (555) 890-1234', 'token_apex_demo', 'Showcase client: Financial Services.',
                null, null, date('Y-m-d H:i:s', strtotime('-60 days'))
            ],
            [
                'client_nexus', 'Nexus Financial', 'nexus-financial.com', 'team', 'active', 'monthly', 230,
                'Claire Standish', 'claire@nexus-financial.com', '+1 (555) 432-1098', 'token_nexus_demo', 'Showcase client: FinTech Platform.',
                null, null, date('Y-m-d H:i:s', strtotime('-30 days'))
            ],
            [
                'client_vanguard', 'Vanguard Logistics', 'vanguardlogistics.com', 'enterprise', 'active', 'annual', 4500,
                'Marcus Vance', 'marcus@vanguardlogistics.com', '+1 (555) 765-4321', 'token_vanguard_demo', 'Showcase client: Global Logistics.',
                null, null, date('Y-m-d H:i:s', strtotime('-15 days'))
            ]
        ];

        $stmt = $pdo->prepare("
            INSERT INTO clients (id, name, domain, plan, status, billing_cycle, price, admin_name, admin_email, admin_phone, remote_token, notes, suspended_at, last_update_pushed, created_at)
            VALUES (:id, :name, :domain, :plan, :status, :cycle, :price, :admin_name, :admin_email, :admin_phone, :token, :notes, :suspended, :pushed, :created)
        ");

        foreach ($clientsToSeed as $c) {
            $stmt->execute([
                ':id' => $c[0],
                ':name' => $c[1],
                ':domain' => $c[2],
                ':plan' => $c[3],
                ':status' => $c[4],
                ':cycle' => $c[5],
                ':price' => $c[6],
                ':admin_name' => $c[7],
                ':admin_email' => $c[8],
                ':admin_phone' => $c[9],
                ':token' => $c[10],
                ':notes' => $c[11],
                ':suspended' => $c[12],
                ':pushed' => $c[13],
                ':created' => $c[14]
            ]);
        }
    }

    // ==========================================
    // SEED DEMO ADMIN USERS (LOGINS)
    // ==========================================
    $countAdmins = $pdo->query("SELECT COUNT(*) FROM admin_users")->fetchColumn();
    if ($countAdmins == 0) {
        $adminUsersToSeed = [
            ['admin@wolff-tech.com', 'Sarah Jenkins', password_hash('WolffDemo2026!', PASSWORD_DEFAULT)],
            ['sarah.jenkins@wolff-tech.com', 'Sarah Jenkins', password_hash('WolffDemo2026!', PASSWORD_DEFAULT)],
            ['marcus.vance@wolff-tech.com', 'Marcus Vance', password_hash('WolffDemo2026!', PASSWORD_DEFAULT)],
            ['daniel.mercer@apexglobal.io', 'Daniel Mercer', password_hash('ApexDemo2026!', PASSWORD_DEFAULT)],
            ['claire@nexus-financial.com', 'Claire Standish', password_hash('NexusDemo2026!', PASSWORD_DEFAULT)],
            ['superadmin@mailfooter.com', 'MailFooter Super Admin', password_hash('superadmin', PASSWORD_DEFAULT)]
        ];

        $stmtAdmin = $pdo->prepare("INSERT OR REPLACE INTO admin_users (email, name, password) VALUES (:email, :name, :password)");
        foreach ($adminUsersToSeed as $au) {
            $stmtAdmin->execute([
                ':email' => $au[0],
                ':name' => $au[1],
                ':password' => $au[2]
            ]);
        }
    }

    // ==========================================
    // SEED DEFAULT BRANDING SETTINGS FOR WOLFF TECH
    // ==========================================
    $defaults = [
        'company_name' => 'Wolff Technologies',
        'company_website' => 'https://wolff-tech.com',
        'company_logo' => 'Resources/2x/logo.png',
        'company_brand_graphic' => 'Resources/2x/brand-graphic-colour-top-right.png',
        'social_linkedin' => 'https://www.linkedin.com/company/wolff-technologies',
        'social_twitter' => 'https://x.com/wolff_tech',
        'social_facebook' => 'https://www.facebook.com/wolfftech',
        'social_instagram' => 'https://www.instagram.com/wolfftech/',
        'social_youtube' => '',
        'color_primary' => '#1677ff',
        'color_secondary' => '#13c2c2',
        'company_tagline' => 'Next-Gen Enterprise Digital Solutions',
        'company_bio' => 'Wolff Technologies delivers secure, scalable, and intelligent cloud signatures for modern global enterprises.',
        'business_size' => '100+ Employees',
        'business_industry' => 'Cloud Enterprise & Software',
        'business_address' => 'Suite 500, Innovation Tower, Tech District',
        'admin_name' => 'Sarah Jenkins',
        'admin_email' => 'admin@wolff-tech.com'
    ];
    $stmtSet = $pdo->prepare("INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES (:key, :value)");
    foreach ($defaults as $k => $v) {
        $stmtSet->execute([':key' => $k, ':value' => $v]);
    }

    // Scoped settings for wolff-tech.com domain
    foreach ($defaults as $k => $v) {
        $stmtSet->execute([':key' => 'wolff-tech.com:' . $k, ':value' => $v]);
    }

    // ==========================================
    // SEED DEFAULT TEMPLATES
    // ==========================================
    $countTemplates = $pdo->query("SELECT COUNT(*) FROM templates")->fetchColumn();
    if ($countTemplates == 0) {
        $defaultHtml = '<table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: \'Segoe UI\', Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; padding: 20px; line-height: 1.4;">
  <tr>
    <td valign="top" width="120" style="width: 120px; padding-right: 15px; border-right: 1px solid #e5e7eb;">
      <a href="{webTracked}" target="_blank" style="text-decoration: none; display: block;">
        <img src="{logo}" alt="Logo" width="100" style="border: 0; display: block; max-width: 100px; height: auto;" />
      </a>
    </td>
    <td valign="top" style="padding-left: 15px; text-align: left;">
      <div style="font-size: 16px; font-weight: bold; color: {primary}; margin: 0;">{name}</div>
      <div style="font-size: 13px; font-weight: bold; color: {secondary}; margin-top: 2px; margin-bottom: 8px;">{title} | {dept}</div>
      <div style="font-size: 12px; color: #555555; font-family: \'Segoe UI\', Arial, sans-serif;">
        <div style="margin-bottom: 2px;"><strong>Phone:</strong> {phone}</div>
        <div style="margin-bottom: 2px;"><strong>Email:</strong> <a href="mailto:{email}" style="color: #333333; text-decoration: none;">{email}</a></div>
        <div><strong>Website:</strong> <a href="{webTracked}" target="_blank" style="color: {primary}; text-decoration: none; font-weight: 600;">{web}</a></div>
      </div>
    </td>
  </tr>
  <!-- campaign-banner-start -->
  <tr>
    <td colspan="2" style="padding-top: 15px; border-top: 1px dashed #e5e7eb; margin-top: 15px;">
      <a href="{campaignLink}" target="_blank" style="text-decoration: none; display: block;">
        <img src="{campaignImg}" alt="Campaign Banner" width="538" style="border: 0; display: block; max-width: 100%; border-radius: 4px;" />
      </a>
    </td>
  </tr>
  <!-- campaign-banner-end -->
</table>';

        $stmtT = $pdo->prepare("INSERT INTO templates (id, name, html_content, client_domain) VALUES (:id, :name, :html, :domain)");
        $stmtT->execute([
            ':id' => 'wolff-default',
            ':name' => 'Wolff Technologies Executive Template',
            ':html' => $defaultHtml,
            ':domain' => 'wolff-tech.com'
        ]);
    }

    // ==========================================
    // SEED DEMO CAMPAIGNS
    // ==========================================
    $countCampaigns = $pdo->query("SELECT COUNT(*) FROM campaigns")->fetchColumn();
    if ($countCampaigns == 0) {
        $stmtC = $pdo->prepare("
            INSERT INTO campaigns (id, name, image_main, image_partner, image_button, target_link, is_active, template_id, client_domain)
            VALUES (:id, :name, :image_main, :image_partner, :image_button, :target_link, :is_active, :template_id, :client_domain)
        ");
        $stmtC->execute([
            ':id' => 'wolff_q3_launch',
            ':name' => 'Wolff Cloud 2.0 Product Announcement',
            ':image_main' => 'Resources/2x/cta-banner-left.png',
            ':image_partner' => 'Resources/2x/cta-banner-right-top.png',
            ':image_button' => 'Resources/2x/cta-banner-right-bottom.png',
            ':target_link' => 'https://wolff-tech.com/product-launch',
            ':is_active' => 1,
            ':template_id' => 'all',
            ':client_domain' => 'wolff-tech.com'
        ]);
    }

    // ==========================================
    // SEED DEMO SIGNATURE USERS
    // ==========================================
    $countUsers = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    if ($countUsers == 0) {
        $demoUsers = [
            ['sarah.jenkins@wolff-tech.com', 'Sarah Jenkins', 'Chief Executive Officer', 'Executive', '+1 (555) 234-5678', 'wolff-default', 1, 'wolff_q3_launch'],
            ['marcus.vance@wolff-tech.com', 'Marcus Vance', 'Chief Technology Officer', 'Engineering', '+1 (555) 234-5679', 'wolff-default', 1, 'wolff_q3_launch'],
            ['elena.rostova@wolff-tech.com', 'Elena Rostova', 'VP of Marketing & Brand', 'Marketing', '+1 (555) 234-5680', 'wolff-default', 1, 'wolff_q3_launch'],
            ['david.miller@wolff-tech.com', 'David Miller', 'Head of Customer Success', 'Operations', '+1 (555) 234-5681', 'wolff-default', 1, 'wolff_q3_launch'],
            ['jessica.taylor@wolff-tech.com', 'Jessica Taylor', 'Lead Product Designer', 'Design & UX', '+1 (555) 234-5682', 'wolff-default', 1, 'wolff_q3_launch'],
            ['alex.rivera@wolff-tech.com', 'Alex Rivera', 'Senior Cloud Architect', 'Engineering', '+1 (555) 234-5683', 'wolff-default', 1, 'wolff_q3_launch'],
            ['michael.chang@wolff-tech.com', 'Michael Chang', 'Data Analytics Lead', 'Intelligence', '+1 (555) 234-5684', 'wolff-default', 1, 'wolff_q3_launch'],
            ['rachel.adams@wolff-tech.com', 'Rachel Adams', 'HR & Talent Director', 'Corporate', '+1 (555) 234-5685', 'wolff-default', 1, 'wolff_q3_launch'],
            ['daniel.mercer@apexglobal.io', 'Daniel Mercer', 'Managing Director', 'Executive', '+1 (555) 890-1234', 'wolff-default', 1, 'wolff_q3_launch']
        ];

        $stmtU = $pdo->prepare("
            INSERT INTO users (email, name, title, department, phone, template, campaign_enabled, campaign_id, created_at)
            VALUES (:email, :name, :title, :dept, :phone, :template, :campaign_enabled, :campaign_id, CURRENT_TIMESTAMP)
        ");

        foreach ($demoUsers as $u) {
            $stmtU->execute([
                ':email' => $u[0],
                ':name' => $u[1],
                ':title' => $u[2],
                ':dept' => $u[3],
                ':phone' => $u[4],
                ':template' => $u[5],
                ':campaign_enabled' => $u[6],
                ':campaign_id' => $u[7]
            ]);
        }
    }

    // ==========================================
    // SEED DEMO INVOICES
    // ==========================================
    $countInvoices = $pdo->query("SELECT COUNT(*) FROM invoices")->fetchColumn();
    if ($countInvoices == 0) {
        $invoicesToSeed = [
            ['inv_101', 'wolff-tech.com', 4500, 'USD', 'paid', date('Y-m-d H:i:s', strtotime('-30 days')), date('Y-m-d H:i:s', strtotime('+30 days')), date('Y-m-d H:i:s', strtotime('-30 days')), 'pay_ref_wolff_101'],
            ['inv_102', 'apexglobal.io', 1500, 'USD', 'paid', date('Y-m-d H:i:s', strtotime('-15 days')), date('Y-m-d H:i:s', strtotime('+15 days')), date('Y-m-d H:i:s', strtotime('-15 days')), 'pay_ref_apex_102'],
            ['inv_103', 'nexus-financial.com', 230, 'USD', 'paid', date('Y-m-d H:i:s', strtotime('-5 days')), date('Y-m-d H:i:s', strtotime('+25 days')), date('Y-m-d H:i:s', strtotime('-5 days')), 'pay_ref_nexus_103']
        ];

        $stmtInv = $pdo->prepare("
            INSERT INTO invoices (id, client_domain, amount, currency, status, issued_at, due_at, paid_at, paystack_reference)
            VALUES (:id, :domain, :amount, :currency, :status, :issued, :due, :paid, :ref)
        ");

        foreach ($invoicesToSeed as $inv) {
            $stmtInv->execute([
                ':id' => $inv[0],
                ':domain' => $inv[1],
                ':amount' => $inv[2],
                ':currency' => $inv[3],
                ':status' => $inv[4],
                ':issued' => $inv[5],
                ':due' => $inv[6],
                ':paid' => $inv[7],
                ':ref' => $inv[8]
            ]);
        }
    }

    // ==========================================
    // SEED DEMO ANALYTICS (OPENS & CLICKS)
    // ==========================================
    $countOpens = $pdo->query("SELECT COUNT(*) FROM opens")->fetchColumn();
    if ($countOpens == 0) {
        $sampleEmails = [
            'sarah.jenkins@wolff-tech.com',
            'marcus.vance@wolff-tech.com',
            'elena.rostova@wolff-tech.com',
            'david.miller@wolff-tech.com',
            'jessica.taylor@wolff-tech.com'
        ];
        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleMail/3654.120.0.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
            'Microsoft Outlook 16.0.14326 (Windows NT 10.0; Win64; x64)'
        ];
        $ips = [
            '197.245.160.10' => ['country' => 'United States', 'city' => 'New York'],
            '102.132.220.45' => ['country' => 'United Kingdom', 'city' => 'London'],
            '41.160.180.12' => ['country' => 'Germany', 'city' => 'Berlin'],
            '165.255.40.88' => ['country' => 'South Africa', 'city' => 'Johannesburg'],
            '13.107.42.16' => ['country' => 'Canada', 'city' => 'Toronto']
        ];

        // Seed IP Cache
        $stmtIp = $pdo->prepare("INSERT OR IGNORE INTO ip_cache (ip, country, city, lat, lon) VALUES (:ip, :country, :city, :lat, :lon)");
        foreach ($ips as $ip => $geo) {
            $stmtIp->execute([
                ':ip' => $ip,
                ':country' => $geo['country'],
                ':city' => $geo['city'],
                ':lat' => 40.7128,
                ':lon' => -74.0060
            ]);
        }

        // Seed 140 Opens across past 30 days
        $stmtOpen = $pdo->prepare("INSERT INTO opens (email, campaign_id, user_agent, ip_address, timestamp) VALUES (:email, :camp, :ua, :ip, :ts)");
        for ($i = 0; $i < 140; $i++) {
            $daysAgo = rand(0, 30);
            $hoursAgo = rand(0, 23);
            $ts = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days -{$hoursAgo} hours"));
            $email = $sampleEmails[array_rand($sampleEmails)];
            $ua = $userAgents[array_rand($userAgents)];
            $ipKeys = array_keys($ips);
            $ip = $ipKeys[array_rand($ipKeys)];

            $stmtOpen->execute([
                ':email' => $email,
                ':camp' => 'wolff_q3_launch',
                ':ua' => $ua,
                ':ip' => $ip,
                ':ts' => $ts
            ]);
        }

        // Seed 45 Clicks across past 30 days
        $linkIds = ['banner_main', 'cta_button', 'partner_link', 'social_linkedin'];
        $stmtClick = $pdo->prepare("INSERT INTO clicks (email, link_id, destination, user_agent, ip_address, timestamp) VALUES (:email, :link, :dest, :ua, :ip, :ts)");
        for ($i = 0; $i < 45; $i++) {
            $daysAgo = rand(0, 30);
            $hoursAgo = rand(0, 23);
            $ts = date('Y-m-d H:i:s', strtotime("-{$daysAgo} days -{$hoursAgo} hours"));
            $email = $sampleEmails[array_rand($sampleEmails)];
            $ua = $userAgents[array_rand($userAgents)];
            $ipKeys = array_keys($ips);
            $ip = $ipKeys[array_rand($ipKeys)];
            $link = $linkIds[array_rand($linkIds)];

            $stmtClick->execute([
                ':email' => $email,
                ':link' => $link,
                ':dest' => 'https://wolff-tech.com/product-launch',
                ':ua' => $ua,
                ':ip' => $ip,
                ':ts' => $ts
            ]);
        }
    }

} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Shared Helper to determine central/dev hosting context
function isCentralOrDev() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, ':') !== false) {
        $host = explode(':', $host)[0];
    }
    $host = strtolower(trim($host));
    if (strpos($host, 'www.') === 0) {
        $host = substr($host, 4);
    }
    return (
        $host === 'localhost' || 
        $host === '127.0.0.1' || 
        $host === '::1' || 
        $host === 'wolff-cloud.co.za' || 
        $host === 'mailfooter.wolff-cloud.co.za' || 
        $host === 'mailfooter.co.za' || 
        $host === 'superadmin.com'
    );
}

// Shared Helper to auto-detect and resolve active tenant domain
function getActiveDomain($pdo) {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    if (strpos($host, ':') !== false) {
        $host = explode(':', $host)[0];
    }
    $host = strtolower(trim($host));
    if (strpos($host, 'www.') === 0) {
        $host = substr($host, 4);
    }
    
    $isCentralOrDev = isCentralOrDev();
    
    $clientParam = $_GET['client'] ?? $_SERVER['HTTP_X_CLIENT_IMPERSONATE'] ?? '';
    $clientParam = strtolower(trim($clientParam));
    
    $resolved = 'wolff-tech.com'; // Default Wolff Demo domain
    
    if (!empty($clientParam)) {
        $resolved = $clientParam;
    } else if (!$isCentralOrDev && !empty($host)) {
        $resolved = $host;
    }

    return $resolved;
}
