<?php
// api/login.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['error' => 'Method not allowed. Only POST is supported.']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || empty($data['email']) || empty($data['password'])) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Missing email or password in request body']);
    exit();
}

$email = strtolower(trim($data['email']));
$password = $data['password'];

// 1. Superadmin authentication fallback
if ($email === 'superadmin@mailfooter.com' && $password === 'superadmin') {
    echo json_encode([
        'success' => true,
        'role' => 'superadmin',
        'email' => $email
    ]);
    exit();
}

// 2. Client administrator authentication
try {
    $stmt = $pdo->prepare("SELECT * FROM admin_users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Successful login
        $domain = explode('@', $email)[1] ?? '';
        if ($domain === 'osbusinessamp.com' || $domain === 'osbusinessam.com') {
            $domain = 'osholdings.co.za';
        }
        echo json_encode([
            'success' => true,
            'role' => 'admin',
            'email' => $email,
            'domain' => $domain,
            'name' => $user['name']
        ]);
    } else {
        header('HTTP/1.1 401 Unauthorized');
        echo json_encode([
            'success' => false,
            'error' => 'Invalid administrative email or password.'
        ]);
    }
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode([
        'success' => false,
        'error' => 'Database authentication error: ' . $e->getMessage()
    ]);
}
