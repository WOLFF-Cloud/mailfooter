<?php
// track/banner.php
header('Access-Control-Allow-Origin: *');

// Disable caching so switching active campaigns works instantly
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

$type = $_GET['type'] ?? 'main';
$template = $_GET['template'] ?? 'all';
if (empty($template)) {
    $template = 'all';
}

require_once dirname(__DIR__) . '/api/db.php';

$email = $_GET['user_id'] ?? null;
$domain = '';
if ($email && strpos($email, '@') !== false) {
    $domain = substr(strrchr($email, "@"), 1);
    if ($domain === 'osbusinessamp.com' || $domain === 'osbusinessam.com' || $domain === 'os-holdings.co.za') {
        $domain = 'osholdings.co.za';
    }
}

$imagePath = '';

try {
    // Find active campaign by client domain and template with fallback to general ('all')
    $stmt = $pdo->prepare("
        SELECT * FROM campaigns 
        WHERE is_active = 1 
          AND (client_domain = :domain OR client_domain IS NULL)
          AND (template_id = :template OR template_id = 'all')
        ORDER BY CASE WHEN template_id = :template THEN 0 ELSE 1 END, created_at DESC 
        LIMIT 1
    ");
    $stmt->execute([':template' => $template, ':domain' => $domain]);
    $campaign = $stmt->fetch();
    
    if ($campaign) {
        if ($type === 'main') {
            $imagePath = $campaign['image_main'];
        } elseif ($type === 'partner') {
            $imagePath = $campaign['image_partner'];
        } elseif ($type === 'button') {
            $imagePath = $campaign['image_button'];
        }
    }
} catch (Exception $e) {
    // Fail silently, use defaults
}

// Fallbacks if database fails or campaign fields are empty
if (empty($imagePath)) {
    if ($type === 'main') {
        $imagePath = 'Resources/1x/cta-banner-left.png';
    } elseif ($type === 'partner') {
        $imagePath = 'Resources/1x/cta-banner-right-top.png';
    } elseif ($type === 'button') {
        $imagePath = 'Resources/1x/cta-banner-right-bottom.png';
    }
}

// Check if we need to return a transparent pixel (e.g. if custom campaign has no partner badge or button)
if ($imagePath === 'transparent' || empty($imagePath)) {
    header('Content-Type: image/gif');
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    exit();
}

// Handle relative vs absolute paths
if (!preg_match('/^https?:\/\//i', $imagePath)) {
    $fullPath = dirname(__DIR__) . '/' . $imagePath;
} else {
    // If it's an external URL, redirect directly
    header("Location: " . $imagePath);
    exit();
}

if (file_exists($fullPath)) {
    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mime = 'image/png';
    if ($ext === 'jpg' || $ext === 'jpeg') {
        $mime = 'image/jpeg';
    } elseif ($ext === 'gif') {
        $mime = 'image/gif';
    } elseif ($ext === 'webp') {
        $mime = 'image/webp';
    }
    
    header("Content-Type: " . $mime);
    readfile($fullPath);
} else {
    // Fallback
    header('Content-Type: image/gif');
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
}
exit();
