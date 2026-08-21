<?php
// track/logo.php
header('Access-Control-Allow-Origin: *');

// Disable caching so every load pings the server
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once dirname(__DIR__) . '/api/db.php';

$email = $_GET['user_id'] ?? null;
$campaignId = $_GET['campaign_id'] ?? null;
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

if ($email) {
    $email = urldecode($email);
}

// Log open event
if ($email) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO opens (email, campaign_id, user_agent, ip_address)
            VALUES (:email, :campaign_id, :user_agent, :ip_address)
        ");
        $stmt->execute([
            ':email' => $email,
            ':campaign_id' => $campaignId ? $campaignId : 'none',
            ':user_agent' => $userAgent,
            ':ip_address' => $ipAddress
        ]);
    } catch (Exception $e) {
        // Fail silently so the logo still loads
    }
}

// Resolve the custom tenant logo from the settings table
$logoPath = '';
$domain = '';
if ($email && strpos($email, '@') !== false) {
    $domain = substr(strrchr($email, "@"), 1);
    if ($domain === 'osbusinessamp.com' || $domain === 'osbusinessam.com' || $domain === 'os-holdings.co.za') {
        $domain = 'osholdings.co.za';
    }
}

if (!empty($domain)) {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = :key LIMIT 1");
        $stmt->execute([':key' => $domain . ':company_logo']);
        $logoVal = $stmt->fetchColumn();
        if (!empty($logoVal)) {
            $logoPath = dirname(__DIR__) . '/' . $logoVal;
        }
    } catch (Exception $e) {}
}

// Fallback to global logo setting if no custom tenant logo is found
if (empty($logoPath) || !file_exists($logoPath)) {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'company_logo' LIMIT 1");
        $stmt->execute();
        $logoVal = $stmt->fetchColumn();
        if (!empty($logoVal)) {
            $logoPath = dirname(__DIR__) . '/' . $logoVal;
        }
    } catch (Exception $e) {}
}

// Fallback to hardcoded default logo if settings are empty/missing
if (empty($logoPath) || !file_exists($logoPath)) {
    $logoPath = dirname(__DIR__) . '/Resources/1x/logo.png';
}

if (file_exists($logoPath)) {
    $ext = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
    $mime = 'image/png';
    if ($ext === 'jpg' || $ext === 'jpeg') {
        $mime = 'image/jpeg';
    } elseif ($ext === 'gif') {
        $mime = 'image/gif';
    } elseif ($ext === 'webp') {
        $mime = 'image/webp';
    }
    header("Content-Type: " . $mime);
    readfile($logoPath);
} else {
    // Fallback: 1x1 transparent GIF
    header('Content-Type: image/gif');
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
}
exit();
