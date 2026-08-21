<?php
// track/click.php

$email = $_GET['user_id'] ?? null;
$linkId = $_GET['link_id'] ?? null;
$template = $_GET['template'] ?? 'all';
if (empty($template)) {
    $template = 'all';
}
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

if ($email) {
    $email = urldecode($email);
}

// 1. Resolve destination internally based on link_id (no URL in parameters = safe from spam filters)
$dest = '';

// Map link_id to settings table keys
$settingKeys = [
    'website' => 'company_website',
    'linkedin' => 'social_linkedin',
    'twitter' => 'social_twitter',
    'instagram' => 'social_instagram',
    'facebook' => 'social_facebook',
    'youtube' => 'social_youtube'
];

if (isset($settingKeys[$linkId])) {
    $key = $settingKeys[$linkId];
    try {
        require_once dirname(__DIR__) . '/api/db.php';
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = :key LIMIT 1");
        $stmt->execute([':key' => $key]);
        $val = $stmt->fetchColumn();
        if (!empty($val)) {
            $dest = $val;
        }
    } catch (Exception $e) {
        // Fallback below
    }
    
    // Hardcoded safety fallbacks if DB is down or settings are empty
    if (empty($dest)) {
        if ($linkId === 'website') {
            $dest = 'https://www.osholdings.com';
        } elseif ($linkId === 'linkedin') {
            $dest = 'https://www.linkedin.com/company/os-holdings';
        } elseif ($linkId === 'twitter') {
            $dest = 'https://x.com/osholdings';
        } elseif ($linkId === 'instagram') {
            $dest = 'https://instagram.com/osholdings';
        } elseif ($linkId === 'facebook') {
            $dest = 'https://facebook.com/osholdings';
        } elseif ($linkId === 'youtube') {
            $dest = 'https://youtube.com/osholdings';
        }
    }
} elseif ($linkId === 'campaign_banner') {
    try {
        require_once dirname(__DIR__) . '/api/db.php';
        $stmt = $pdo->prepare("
            SELECT target_link FROM campaigns 
            WHERE is_active = 1 AND (template_id = :template OR template_id = 'all')
            ORDER BY CASE WHEN template_id = :template THEN 0 ELSE 1 END, created_at DESC 
            LIMIT 1
        ");
        $stmt->execute([':template' => $template]);
        $campaign = $stmt->fetch();
        if ($campaign) {
            $dest = $campaign['target_link'];
        }
    } catch (Exception $e) {
        // Fallback below
    }
    
    // Safety fallback for campaign banner link
    if (empty($dest)) {
        $dest = 'https://www.osholdings.com/sage-demo';
    }
}

// Global safety fallback if link_id was unrecognized or not set
if (empty($dest)) {
    $dest = 'https://www.osholdings.com';
}

// 2. Log click event in SQLite
if ($email) {
    try {
        require_once dirname(__DIR__) . '/api/db.php';
        
        $stmt = $pdo->prepare("
            INSERT INTO clicks (email, link_id, destination, user_agent, ip_address)
            VALUES (:email, :link_id, :destination, :user_agent, :ip_address)
        ");
        $stmt->execute([
            ':email' => $email,
            ':link_id' => $linkId,
            ':destination' => $dest,
            ':user_agent' => $userAgent,
            ':ip_address' => $ipAddress
        ]);
    } catch (Exception $e) {
        // Fail silently so redirect still works
    }
}

// 3. Perform 302 Found Redirect
header("HTTP/1.1 302 Found");
header("Location: " . $dest);
exit();
