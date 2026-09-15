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
    if (!$row) return null;
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
        'mobile' => $row['mobile'] ?? ($row['phone'] ?? ''),
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
        if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0 && strcasecmp($emailDomain, 'os-holdings.co.za') !== 0) {
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
        ':title' => $u['title'] ?? ($u['jobTitle'] ?? ''),
        ':department' => $u['department'] ?? ($u['dept'] ?? 'General'),
        ':phone' => $u['phone'] ?? '',
        ':mobile' => $u['mobile'] ?? ($u['phone'] ?? ''),
        ':role' => $u['role'] ?? 'Staff',
        ':company' => $u['company'] ?? '',
        ':location' => $u['location'] ?? '',
        ':web' => $u['web'] ?? '',
        ':primary_color' => $u['primaryColor'] ?? ($u['primary_color'] ?? '#0d4b8e'),
        ':secondary_color' => $u['secondaryColor'] ?? ($u['secondary_color'] ?? '#f18a22'),
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

// Handle GET requests (Retrieve user details by email or search query, or list directory)
if ($method === 'GET') {
    $email = strtolower(trim($_GET['email'] ?? ''));
    $query = strtolower(trim($_GET['query'] ?? $_GET['search'] ?? $_GET['name'] ?? $email));
    $action = strtolower(trim($_GET['action'] ?? ''));
    $listAll = !empty($_GET['list']) || !empty($_GET['all']) || ($action === 'list');

    // List all users for active domain if requested or if no query specified
    if ($listAll || empty($query)) {
        try {
            $filterDomain = $clientParam ?: ($enforceDomain ? $clientDomain : '');
            if (!empty($filterDomain) && !isCentralOrDev() && empty($_GET['all'])) {
                $mappedDomain = ($filterDomain === 'osbusinessamp.com' || $filterDomain === 'osbusinessam.com') ? 'osholdings.co.za' : $filterDomain;
                $altDomain = ($mappedDomain === 'osholdings.co.za') ? 'os-holdings.co.za' : $mappedDomain;
                $stmt = $pdo->prepare("
                    SELECT * FROM users 
                    WHERE LOWER(email) LIKE :domFilter OR LOWER(email) LIKE :altDomFilter
                    ORDER BY name ASC, created_at ASC
                ");
                $stmt->execute([
                    ':domFilter' => '%@' . strtolower($mappedDomain),
                    ':altDomFilter' => '%@' . strtolower($altDomain)
                ]);
            } else {
                $stmt = $pdo->query("SELECT * FROM users ORDER BY name ASC, created_at ASC");
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

    try {
        // 1. Check exact match by email or name
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) = :q OR LOWER(name) = :q LIMIT 1");
        $stmt->execute([':q' => $query]);
        $userRow = $stmt->fetch();

        if ($userRow) {
            echo json_encode([
                'success' => true,
                'user' => formatUserRow($userRow)
            ]);
            exit();
        }

        // 2. Fuzzy match across name or email
        $stmtLike = $pdo->prepare("SELECT * FROM users WHERE LOWER(name) LIKE :qLike OR LOWER(email) LIKE :qLike ORDER BY name ASC LIMIT 5");
        $stmtLike->execute([':qLike' => '%' . $query . '%']);
        $matches = $stmtLike->fetchAll();

        if (!empty($matches)) {
            $formattedMatches = array_map('formatUserRow', $matches);
            echo json_encode([
                'success' => true,
                'user' => $formattedMatches[0],
                'matches' => $formattedMatches
            ]);
            exit();
        }

        echo json_encode(['success' => false, 'error' => 'User not found']);
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
        if (strcasecmp($mappedEmailDomain, $mappedClientDomain) !== 0 && strcasecmp($emailDomain, 'os-holdings.co.za') !== 0) {
            header('HTTP/1.1 403 Forbidden');
            echo json_encode(['error' => "Access denied to delete this domain's user records"]);
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

// Handle Bulk Import Action (?bulk=1 or { action: 'bulk', users: [...] } or direct array)
$isBulk = !empty($_GET['bulk']) || (isset($data['action']) && $data['action'] === 'bulk') || (isset($data['users']) && is_array($data['users'])) || (is_array($data) && isset($data[0]));

if ($isBulk) {
    $userList = [];
    if (isset($data['users']) && is_array($data['users'])) {
        $userList = $data['users'];
    } elseif (is_array($data) && isset($data[0])) {
        $userList = $data;
    }

    if (empty($userList)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'No user records provided for bulk import']);
        exit();
    }

    $successCount = 0;
    $errors = [];

    try {
        $pdo->beginTransaction();
        foreach ($userList as $idx => $u) {
            try {
                saveSingleUser($pdo, $u, $enforceDomain, $clientDomain);
                $successCount++;
            } catch (Exception $e) {
                $errors[] = "Row #" . ($idx + 1) . ": " . $e->getMessage();
            }
        }
        $pdo->commit();

        echo json_encode([
            'success' => true,
            'count' => $successCount,
            'inserted' => $successCount,
            'message' => "Successfully imported and synced {$successCount} personnel records.",
            'errors' => $errors
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Bulk import failed: ' . $e->getMessage()]);
    }
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
