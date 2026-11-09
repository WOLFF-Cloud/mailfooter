<?php
// api/register.php
// Production-Ready Self-Service Tenant Registration Endpoint
// Provisions tenant database models, administrative credentials, branding settings, default templates, invoices, and dispatches Welcome Email.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST is supported.']);
    exit();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !is_array($data)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload received.']);
    exit();
}

// -------------------------------------------------------------
// 1. Sanitize & Normalize Inputs
// -------------------------------------------------------------
$companyName = trim($data['companyName'] ?? '');
$rawDomain = trim($data['companyDomain'] ?? '');
$companyWebsite = trim($data['companyWebsite'] ?? '');
$plan = strtolower(trim($data['plan'] ?? 'starter'));
$adminName = trim($data['adminName'] ?? '');
$adminEmail = strtolower(trim($data['adminEmail'] ?? ''));
$adminPhone = trim($data['adminPhone'] ?? '');
$adminPassword = $data['adminPassword'] ?? '';
$billingMethod = strtolower(trim($data['billingMethod'] ?? 'invoice'));
$billingCycle = strtolower(trim($data['billingCycle'] ?? 'annual'));
$industry = trim($data['industry'] ?? 'Corporate & Enterprise');

// Clean domain (remove https://, http://, www., paths, trailing slashes)
$domain = preg_replace('#^https?://#i', '', $rawDomain);
$domain = preg_replace('#^www\.#i', '', $domain);
$domain = strtolower(explode('/', $domain)[0]);
$domain = trim($domain);

if (empty($companyWebsite)) {
    $companyWebsite = 'https://' . $domain;
} elseif (!preg_match('#^https?://#i', $companyWebsite)) {
    $companyWebsite = 'https://' . $companyWebsite;
}

// -------------------------------------------------------------
// 2. Strict Validations
// -------------------------------------------------------------
if (empty($companyName) || strlen($companyName) < 2) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Company Name (at least 2 characters).']);
    exit();
}

// RFC compliant domain format validation
$domainRegex = '/^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i';
if (empty($domain) || !preg_match($domainRegex, $domain)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Corporate Email Domain (e.g. company.co.za or enterprise.com).']);
    exit();
}

// Email syntax validation
if (empty($adminEmail) || !filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Please provide a valid Administrator Work Email address.']);
    exit();
}

if (empty($adminName) || strlen($adminName) < 2) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Please provide the Administrator Full Name.']);
    exit();
}

// Password strength requirement
if (empty($adminPassword) || strlen($adminPassword) < 8) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Administrator password must be at least 8 characters in length.']);
    exit();
}

// -------------------------------------------------------------
// 3. Duplicate Checks (Foolproof Conflict Prevention)
// -------------------------------------------------------------
try {
    // Check if domain is already registered
    $stmtCheckDomain = $pdo->prepare("SELECT name FROM clients WHERE LOWER(domain) = :domain");
    $stmtCheckDomain->execute([':domain' => $domain]);
    $existingClient = $stmtCheckDomain->fetch();

    if ($existingClient) {
        header('HTTP/1.1 409 Conflict');
        echo json_encode([
            'success' => false,
            'error' => "An organization with the domain '{$domain}' ({$existingClient['name']}) is already registered on MailFooter. If you are an employee or administrator, please sign in via the Corporate Access Portal."
        ]);
        exit();
    }

    // Check if administrator email already exists
    $stmtCheckEmail = $pdo->prepare("SELECT email FROM admin_users WHERE LOWER(email) = :email");
    $stmtCheckEmail->execute([':email' => $adminEmail]);
    if ($stmtCheckEmail->fetch()) {
        header('HTTP/1.1 409 Conflict');
        echo json_encode([
            'success' => false,
            'error' => "An administrative account with email '{$adminEmail}' already exists. Please sign in or use Password Reset if you forgot your credentials."
        ]);
        exit();
    }
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['success' => false, 'error' => 'Database verification error: ' . $e->getMessage()]);
    exit();
}

// -------------------------------------------------------------
// 4. Pricing Plan Resolution
// -------------------------------------------------------------
$planPrice = 1500;
$planName = 'Starter Plan';
$maxUsers = 5;

try {
    $stmtPlan = $pdo->prepare("SELECT * FROM price_plans WHERE plan_id = :p");
    $stmtPlan->execute([':p' => $plan]);
    $planRecord = $stmtPlan->fetch();

    if ($planRecord) {
        $planName = $planRecord['name'];
        $maxUsers = (int)$planRecord['max_users'];
        $planPrice = ($billingCycle === 'monthly') ? (float)$planRecord['price_zar_monthly'] : (float)$planRecord['price_zar_annual'];
    } else {
        $plan = 'starter';
    }
} catch (Exception $e) {
    // Fallback to starter defaults
}

// -------------------------------------------------------------
// 5. Atomic Database Provisioning Transaction
// -------------------------------------------------------------
$clientId = 'client_' . preg_replace('/[^a-z0-9]/', '_', $domain);
$remoteToken = 'token_' . bin2hex(random_bytes(16));
$invoiceId = 'inv_' . date('Ymd') . '_' . substr(bin2hex(random_bytes(4)), 0, 6);
$templateId = 'tmpl_' . substr(md5($domain), 0, 8) . '_default';
$passwordHash = password_hash($adminPassword, PASSWORD_DEFAULT);

$defaultHtmlTemplate = '<table cellpadding="0" cellspacing="0" border="0" width="578" style="width: 578px; max-width: 578px; background-color: #ffffff; font-family: \'Segoe UI\', Arial, sans-serif; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; padding: 20px; line-height: 1.4;">
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

try {
    $pdo->beginTransaction();

    // 1. Insert Client Organization
    $stmtClient = $pdo->prepare("
        INSERT INTO clients (id, name, domain, plan, status, billing_cycle, price, admin_name, admin_email, admin_phone, remote_token, notes, created_at)
        VALUES (:id, :name, :domain, :plan, 'active', :cycle, :price, :aname, :aemail, :aphone, :token, 'Self-service registration via portal', CURRENT_TIMESTAMP)
    ");
    $stmtClient->execute([
        ':id' => $clientId,
        ':name' => $companyName,
        ':domain' => $domain,
        ':plan' => $plan,
        ':cycle' => $billingCycle,
        ':price' => $planPrice,
        ':aname' => $adminName,
        ':aemail' => $adminEmail,
        ':aphone' => $adminPhone,
        ':token' => $remoteToken
    ]);

    // 2. Insert Admin User Credentials
    $stmtAdmin = $pdo->prepare("
        INSERT INTO admin_users (email, name, password, created_at)
        VALUES (:email, :name, :password, CURRENT_TIMESTAMP)
    ");
    $stmtAdmin->execute([
        ':email' => $adminEmail,
        ':name' => $adminName,
        ':password' => $passwordHash
    ]);

    // 3. Seed Scoped Tenant Brand Settings
    $settingsToSeed = [
        'company_name' => $companyName,
        'company_website' => $companyWebsite,
        'company_logo' => 'Resources/2x/logo.png',
        'company_brand_graphic' => 'Resources/2x/brand-graphic-colour-top-right.png',
        'color_primary' => '#0d4b8e',
        'color_secondary' => '#f18a22',
        'company_tagline' => $companyName . ' Corporate Signatures',
        'company_bio' => 'Official corporate communication channel for ' . $companyName,
        'business_size' => "1-{$maxUsers} Employees",
        'business_industry' => $industry,
        'business_address' => '',
        'admin_name' => $adminName,
        'admin_email' => $adminEmail
    ];

    $stmtSet = $pdo->prepare("INSERT OR REPLACE INTO settings (setting_key, setting_value) VALUES (:k, :v)");
    foreach ($settingsToSeed as $k => $v) {
        $stmtSet->execute([
            ':k' => $domain . ':' . $k,
            ':v' => $v
        ]);
    }

    // 4. Create Standard Template Scoped to Tenant
    $stmtTmpl = $pdo->prepare("
        INSERT INTO templates (id, name, html_content, client_domain, created_at)
        VALUES (:id, :name, :html, :domain, CURRENT_TIMESTAMP)
    ");
    $stmtTmpl->execute([
        ':id' => $templateId,
        ':name' => $companyName . ' Executive Template',
        ':html' => $defaultHtmlTemplate,
        ':domain' => $domain
    ]);

    // 5. Generate Initial Billing Invoice
    $invoiceStatus = ($billingMethod === 'cc') ? 'paid' : 'pending';
    $payRef = ($billingMethod === 'cc') ? ('pay_sim_' . bin2hex(random_bytes(6))) : null;
    $paidAt = ($billingMethod === 'cc') ? date('Y-m-d H:i:s') : null;

    $stmtInv = $pdo->prepare("
        INSERT INTO invoices (id, client_domain, amount, currency, status, issued_at, due_at, paid_at, paystack_reference)
        VALUES (:id, :domain, :amount, 'ZAR', :status, CURRENT_TIMESTAMP, :due, :paid, :ref)
    ");
    $stmtInv->execute([
        ':id' => $invoiceId,
        ':domain' => $domain,
        ':amount' => $planPrice,
        ':status' => $invoiceStatus,
        ':due' => date('Y-m-d H:i:s', strtotime('+30 days')),
        ':paid' => $paidAt,
        ':ref' => $payRef
    ]);

    // 6. Create Initial Signature User Profile for Admin
    $stmtUser = $pdo->prepare("
        INSERT INTO users (email, name, title, department, phone, template, campaign_enabled, campaign_id, created_at)
        VALUES (:email, :name, 'Managing Administrator', 'Executive', :phone, :template, 0, NULL, CURRENT_TIMESTAMP)
    ");
    $stmtUser->execute([
        ':email' => $adminEmail,
        ':name' => $adminName,
        ':phone' => $adminPhone,
        ':template' => $templateId
    ]);

    // 7. Audit Log
    $stmtAudit = $pdo->prepare("
        INSERT INTO audit_logs (action, target, ip_address, timestamp)
        VALUES (:action, :target, :ip, CURRENT_TIMESTAMP)
    ");
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $stmtAudit->execute([
        ':action' => "Self-Service Registration: {$companyName} ({$domain}) on {$planName} ({$billingCycle}).",
        ':target' => $domain,
        ':ip' => $clientIp
    ]);

    $pdo->commit();
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'success' => false,
        'error' => 'Failed to provision tenant resources: ' . $e->getMessage()
    ]);
    exit();
}

// -------------------------------------------------------------
// 6. Dispatch Official Welcome Email
// -------------------------------------------------------------
$subject = "Welcome to MailFooter - {$companyName} Environment Provisioned";
$emailHtml = renderWelcomeEmail($companyName, $domain, $adminName, $adminEmail, $planName, $planPrice, $billingCycle, $invoiceId);

$mailResult = sendMailNotification(
    $pdo,
    $adminEmail,
    $adminName,
    $subject,
    $emailHtml,
    'welcome',
    $domain
);

// -------------------------------------------------------------
// 7. Return Comprehensive Success Payload
// -------------------------------------------------------------
echo json_encode([
    'success' => true,
    'message' => "Welcome to MailFooter! Corporate tenant for {$companyName} has been successfully provisioned.",
    'client' => [
        'id' => $clientId,
        'name' => $companyName,
        'domain' => $domain,
        'plan' => $plan,
        'plan_name' => $planName,
        'max_users' => $maxUsers,
        'billing_cycle' => $billingCycle,
        'price' => $planPrice,
        'admin_name' => $adminName,
        'admin_email' => $adminEmail,
        'invoice_id' => $invoiceId,
        'invoice_status' => $invoiceStatus
    ],
    'session' => [
        'admin_domain' => $domain,
        'admin_email' => $adminEmail,
        'admin_name' => $adminName,
        'role' => 'admin'
    ],
    'welcome_email' => [
        'recipient' => $adminEmail,
        'subject' => $subject,
        'status' => $mailResult['status'],
        'log_id' => $mailResult['log_id'],
        'body_html' => $emailHtml
    ]
]);
