<?php
// track/open.php
header('Access-Control-Allow-Origin: *');

// Disable caching
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');
header('Content-Type: image/gif');

$email = $_GET['user_id'] ?? null;
$campaignId = $_GET['campaign_id'] ?? null;
$userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
$ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;

// Clean email
if ($email) {
    $email = urldecode($email);
}

// Log to DB
if ($email) {
    try {
        // Include DB connection
        require_once dirname(__DIR__) . '/api/db.php';
        
        $stmt = $pdo->prepare("
            INSERT INTO opens (email, campaign_id, user_agent, ip_address)
            VALUES (:email, :campaign_id, :user_agent, :ip_address)
        ");
        $stmt->execute([
            ':email' => $email,
            ':campaign_id' => $campaignId,
            ':user_agent' => $userAgent,
            ':ip_address' => $ipAddress
        ]);
    } catch (Exception $e) {
        // Fail silently so the recipient doesn't see a broken image
    }
}

// Output 1x1 transparent GIF
echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
exit();
