<?php
// api/users.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$clientParam = $_GET['client'] ?? $_SERVER['HTTP_X_CLIENT_IMPERSONATE'] ?? '';
$clientDomain = getActiveDomain($pdo);
$enforceDomain = !isCentralOrDev() || !empty($clientParam);

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST' && $method !== 'GET') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['error' => 'Method not allowed. Only GET and POST are supported.']);
    exit();
}

// Handle GET requests (Retrieve user details by email)
if ($method === 'GET') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    
    if (empty($email)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing email parameter']);
        exit();
    }
    
    if ($enforceDomain) {
        $emailParts = explode('@', $email);
        $emailDomain = strtolower(end($emailParts));
        $mappedEmailDomain = ($emailDomain === 'osbusinessamp.com' || $emailDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $emailDomain;
        $mappedClientDomain = ($clientDomain === 'osbusinessamp.com' || $clientDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $clientDomain;
        if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0) {
            header('HTTP/1.1 403 Forbidden');
            echo json_encode(['error' => 'Access denied to this domain\'s user records']);
            exit();
        }
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();
        
        if ($user) {
            echo json_encode(['success' => true, 'user' => $user]);
        } else {
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Handle delete action
if (isset($data['action']) && $data['action'] === 'delete') {
    if (empty($data['email'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing email in request body']);
        exit();
    }
    $data['email'] = strtolower(trim($data['email']));
    
    if ($enforceDomain) {
        $emailParts = explode('@', $data['email']);
        $emailDomain = strtolower(end($emailParts));
        $mappedEmailDomain = ($emailDomain === 'osbusinessamp.com' || $emailDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $emailDomain;
        $mappedClientDomain = ($clientDomain === 'osbusinessamp.com' || $clientDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $clientDomain;
        if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0) {
            header('HTTP/1.1 403 Forbidden');
            echo json_encode(['error' => 'Access denied to delete this domain\'s user records']);
            exit();
        }
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM users WHERE email = :email");
        $stmt->execute([':email' => $data['email']]);
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Failed to delete user: ' . $e->getMessage()]);
    }
    exit();
}

if (!$data || empty($data['email']) || empty($data['name'])) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Missing email or name in request body']);
    exit();
}
$data['email'] = strtolower(trim($data['email']));

if ($enforceDomain) {
    $emailParts = explode('@', $data['email']);
    $emailDomain = strtolower(end($emailParts));
    $mappedEmailDomain = ($emailDomain === 'osbusinessamp.com' || $emailDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $emailDomain;
    $mappedClientDomain = ($clientDomain === 'osbusinessamp.com' || $clientDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $clientDomain;
    if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0) {
        header('HTTP/1.1 403 Forbidden');
        echo json_encode(['error' => 'You can only register email signatures for your own company domain.']);
        exit();
    }
}

try {
    $stmt = $pdo->prepare("
        INSERT OR REPLACE INTO users (email, name, title, department, phone, template, campaign_enabled, campaign_id, created_at)
        VALUES (:email, :name, :title, :department, :phone, :template, :campaign_enabled, :campaign_id, 
                COALESCE((SELECT created_at FROM users WHERE email = :email_check), CURRENT_TIMESTAMP))
    ");
    
    $stmt->execute([
        ':email' => $data['email'],
        ':email_check' => $data['email'],
        ':name' => $data['name'],
        ':title' => $data['title'] ?? '',
        ':department' => $data['department'] ?? null,
        ':phone' => $data['phone'] ?? null,
        ':template' => $data['template'] ?? null,
        ':campaign_enabled' => !empty($data['campaign_enabled']) ? 1 : 0,
        ':campaign_id' => $data['campaign_id'] ?? null
    ]);
    
    echo json_encode(['success' => true, 'message' => 'User registered successfully']);
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['error' => 'Failed to save user: ' . $e->getMessage()]);
}
