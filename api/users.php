<?php
// api/users.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Client-Impersonate');
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

// Map helper function to format raw SQLite user row into standard staff JSON object
function formatUserRow($row) {
    $fullName = !empty($row['name']) ? $row['name'] : trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
    $parts = explode(' ', $fullName, 2);
    $firstName = !empty($row['first_name']) ? $row['first_name'] : ($parts[0] ?? '');
    $lastName = !empty($row['last_name']) ? $row['last_name'] : ($parts[1] ?? '');

    return [
        'id' => md5(strtolower(trim($row['email']))),
        'firstName' => $firstName,
        'lastName' => $lastName,
        'name' => $fullName,
        'role' => !empty($row['role']) ? $row['role'] : 'Staff',
        'title' => $row['title'] ?? '',
        'department' => $row['department'] ?? 'General',
        'email' => $row['email'],
        'phone' => $row['phone'] ?? '',
        'mobile' => $row['mobile'] ?? '',
        'company' => $row['company'] ?? 'Company',
        'location' => $row['location'] ?? '',
        'web' => $row['web'] ?? '',
        'primaryColor' => $row['primary_color'] ?? '#0d4b8e',
        'secondaryColor' => $row['secondary_color'] ?? '#f18a22',
        'linkedin' => $row['linkedin'] ?? '',
        'twitter' => $row['twitter'] ?? '',
        'facebook' => $row['facebook'] ?? '',
        'instagram' => $row['instagram'] ?? '',
        'youtube' => $row['youtube'] ?? '',
        'template' => $row['template'] ?? 'os-flat-banner',
        'campaign_enabled' => !empty($row['campaign_enabled']) ? 1 : 0,
        'campaign_id' => $row['campaign_id'] ?? null,
        'created_at' => $row['created_at'] ?? null
    ];
}

// Handle GET requests (Retrieve single user or full directory list)
if ($method === 'GET') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    $action = strtolower(trim($_GET['action'] ?? ''));
    $all = !empty($_GET['all']);

    // List all users for active domain
    if (empty($email) || $action === 'list') {
        try {
            if ($enforceDomain && !$all) {
                $mappedDomain = ($clientDomain === 'osbusinessamp.com' || $clientDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $clientDomain;
                $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) LIKE :domain_pattern ORDER BY created_at ASC");
                $stmt->execute([':domain_pattern' => '%@' . strtolower($mappedDomain)]);
            } else {
                $stmt = $pdo->query("SELECT * FROM users ORDER BY created_at ASC");
            }
            $rows = $stmt->fetchAll();
            $users = array_map('formatUserRow', $rows);

            echo json_encode([
                'success' => true,
                'count' => count($users),
                'client_domain' => $clientDomain,
                'users' => $users
            ]);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
        exit();
    }

    // Retrieve single user by email
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
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = :email");
        $stmt->execute([':email' => $email]);
        $userRow = $stmt->fetch();

        if ($userRow) {
            echo json_encode(['success' => true, 'user' => formatUserRow($userRow)]);
        } else {
            echo json_encode(['success' => false, 'error' => 'User not found']);
        }
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit();
}

// Handle POST requests
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

// Handle delete action
if (isset($data['action']) && $data['action'] === 'delete') {
    if (empty($data['email'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing email in request body']);
        exit();
    }
    $targetEmail = strtolower(trim($data['email']));

    if ($enforceDomain) {
        $emailParts = explode('@', $targetEmail);
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
        $stmt = $pdo->prepare("DELETE FROM users WHERE LOWER(email) = :email");
        $stmt->execute([':email' => $targetEmail]);
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Failed to delete user: ' . $e->getMessage()]);
    }
    exit();
}

// Helper to save a single user record into SQLite
function saveSingleUser($pdo, $u, $enforceDomain, $clientDomain) {
    $email = strtolower(trim($u['email'] ?? ''));
    if (empty($email)) {
        throw new Exception('Missing email address');
    }

    $firstName = trim($u['firstName'] ?? '');
    $lastName = trim($u['lastName'] ?? '');
    $name = trim($u['name'] ?? '');
    if (empty($name)) {
        $name = trim($firstName . ' ' . $lastName);
    }
    if (empty($name)) {
        $name = $email;
    }
    if (empty($firstName) && empty($lastName)) {
        $parts = explode(' ', $name, 2);
        $firstName = $parts[0] ?? '';
        $lastName = $parts[1] ?? '';
    }

    if ($enforceDomain) {
        $emailParts = explode('@', $email);
        $emailDomain = strtolower(end($emailParts));
        $mappedEmailDomain = ($emailDomain === 'osbusinessamp.com' || $emailDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $emailDomain;
        $mappedClientDomain = ($clientDomain === 'osbusinessamp.com' || $clientDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $clientDomain;
        if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0) {
            throw new Exception("Email domain ($emailDomain) does not match active client domain ($clientDomain).");
        }
    }

    $stmt = $pdo->prepare("
        INSERT OR REPLACE INTO users (
            email, name, first_name, last_name, title, department, phone, mobile, role, company, location, web,
            primary_color, secondary_color, linkedin, twitter, facebook, instagram, youtube, template, campaign_enabled, campaign_id, created_at
        ) VALUES (
            :email, :name, :first_name, :last_name, :title, :department, :phone, :mobile, :role, :company, :location, :web,
            :primary_color, :secondary_color, :linkedin, :twitter, :facebook, :instagram, :youtube, :template, :campaign_enabled, :campaign_id,
            COALESCE((SELECT created_at FROM users WHERE LOWER(email) = :email_check), CURRENT_TIMESTAMP)
        )
    ");

    $stmt->execute([
        ':email' => $email,
        ':email_check' => $email,
        ':name' => $name,
        ':first_name' => $firstName,
        ':last_name' => $lastName,
        ':title' => $u['title'] ?? '',
        ':department' => $u['department'] ?? 'General',
        ':phone' => $u['phone'] ?? '',
        ':mobile' => $u['mobile'] ?? '',
        ':role' => $u['role'] ?? 'Staff',
        ':company' => $u['company'] ?? '',
        ':location' => $u['location'] ?? '',
        ':web' => $u['web'] ?? '',
        ':primary_color' => $u['primaryColor'] ?? '#0d4b8e',
        ':secondary_color' => $u['secondaryColor'] ?? '#f18a22',
        ':linkedin' => $u['linkedin'] ?? '',
        ':twitter' => $u['twitter'] ?? '',
        ':facebook' => $u['facebook'] ?? '',
        ':instagram' => $u['instagram'] ?? '',
        ':youtube' => $u['youtube'] ?? '',
        ':template' => $u['template'] ?? 'os-flat-banner',
        ':campaign_enabled' => !empty($u['campaign_enabled']) ? 1 : 0,
        ':campaign_id' => $u['campaign_id'] ?? null
    ]);
}

// Handle Batch/Bulk User Ingestion
if (isset($data['users']) && is_array($data['users'])) {
    $successCount = 0;
    $errors = [];
    foreach ($data['users'] as $idx => $u) {
        try {
            saveSingleUser($pdo, $u, $enforceDomain, $clientDomain);
            $successCount++;
        } catch (Exception $e) {
            $errors[] = "Row #" . ($idx + 1) . ": " . $e->getMessage();
        }
    }
    echo json_encode([
        'success' => true,
        'message' => "Saved $successCount users successfully.",
        'inserted' => $successCount,
        'errors' => $errors
    ]);
    exit();
}

// Handle Single User Save
try {
    saveSingleUser($pdo, $data, $enforceDomain, $clientDomain);
    echo json_encode(['success' => true, 'message' => 'User saved successfully to database']);
} catch (Exception $e) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Failed to save user: ' . $e->getMessage()]);
}
