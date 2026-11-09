<?php
// api/password_reset.php
// Enterprise Password Reset Engine
// Manages crypto-secure reset tokens, 1-hour expirations, verification, and email dispatches.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/mailer.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// -------------------------------------------------------------
// Action 1: Request Password Reset Link (POST)
// -------------------------------------------------------------
if ($action === 'request' && $method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    $email = strtolower(trim($data['email'] ?? $_POST['email'] ?? ''));

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['success' => false, 'error' => 'Please provide a valid administrative email address.']);
        exit();
    }

    try {
        // Look up admin user
        $stmtUser = $pdo->prepare("SELECT name, email FROM admin_users WHERE LOWER(email) = :email");
        $stmtUser->execute([':email' => $email]);
        $admin = $stmtUser->fetch();

        // Resolve client domain for logging
        $stmtClient = $pdo->prepare("SELECT domain FROM clients WHERE admin_email = :email LIMIT 1");
        $stmtClient->execute([':email' => $email]);
        $client = $stmtClient->fetch();
        $domain = $client ? $client['domain'] : (explode('@', $email)[1] ?? null);

        $debugLink = null;

        if ($admin) {
            $token = bin2hex(random_bytes(32)); // 64-character crypto token
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Invalidate any previous unused tokens for this account
            $stmtInv = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE email = :email AND used = 0");
            $stmtInv->execute([':email' => $email]);

            // Insert new token
            $stmtToken = $pdo->prepare("
                INSERT INTO password_resets (email, token, expires_at, used, created_at)
                VALUES (:email, :token, :expires, 0, CURRENT_TIMESTAMP)
            ");
            $stmtToken->execute([
                ':email' => $email,
                ':token' => $token,
                ':expires' => $expiresAt
            ]);

            // Construct secure reset URL
            $baseUrl = getAppBaseUrl();
            $resetUrl = $baseUrl . '/reset-password.html?token=' . $token . '&email=' . urlencode($email);
            $debugLink = $resetUrl;

            // Generate and send password reset email
            $subject = "Reset Your MailFooter Password";
            $emailHtml = renderPasswordResetEmail($admin['name'], $email, $resetUrl, 60);

            sendMailNotification(
                $pdo,
                $email,
                $admin['name'],
                $subject,
                $emailHtml,
                'password_reset',
                $domain
            );

            // Audit log
            $stmtAudit = $pdo->prepare("
                INSERT INTO audit_logs (action, target, ip_address, timestamp)
                VALUES (:action, :target, :ip, CURRENT_TIMESTAMP)
            ");
            $stmtAudit->execute([
                ':action' => "Password Reset Requested for admin: {$email}",
                ':target' => $email,
                ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
            ]);
        }

        // Return positive response regardless of existence (Anti-enumeration security standard)
        $response = [
            'success' => true,
            'message' => 'If an administrative account matches this email, a password reset link has been dispatched to your inbox.'
        ];

        // Include debug link in local dev environments
        if ($debugLink && isCentralOrDev()) {
            $response['debug_reset_link'] = $debugLink;
        }

        echo json_encode($response);
    } catch (Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['success' => false, 'error' => 'Unable to process reset request: ' . $e->getMessage()]);
    }
    exit();
}

// -------------------------------------------------------------
// Action 2: Verify Reset Token Validity (GET)
// -------------------------------------------------------------
if ($action === 'verify' && $method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    $email = strtolower(trim($_GET['email'] ?? ''));

    if (empty($token) || empty($email)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['success' => false, 'valid' => false, 'error' => 'Missing token or email parameter.']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("
            SELECT * FROM password_resets 
            WHERE token = :token AND email = :email AND used = 0 AND expires_at > CURRENT_TIMESTAMP
            LIMIT 1
        ");
        $stmt->execute([':token' => $token, ':email' => $email]);
        $record = $stmt->fetch();

        if ($record) {
            echo json_encode(['success' => true, 'valid' => true, 'email' => $email]);
        } else {
            echo json_encode([
                'success' => false, 
                'valid' => false, 
                'error' => 'This password reset link has expired or has already been used. Please request a new link.'
            ]);
        }
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit();
}

// -------------------------------------------------------------
// Action 3: Execute Password Reset (POST)
// -------------------------------------------------------------
if ($action === 'reset' && $method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    $token = trim($data['token'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';

    if (empty($token) || empty($email)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['success' => false, 'error' => 'Missing security token or email.']);
        exit();
    }

    if (empty($password) || strlen($password) < 8) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters long.']);
        exit();
    }

    if ($password !== $confirmPassword) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['success' => false, 'error' => 'Passwords do not match.']);
        exit();
    }

    try {
        // Validate token
        $stmt = $pdo->prepare("
            SELECT * FROM password_resets 
            WHERE token = :token AND email = :email AND used = 0 AND expires_at > CURRENT_TIMESTAMP
            LIMIT 1
        ");
        $stmt->execute([':token' => $token, ':email' => $email]);
        $resetRecord = $stmt->fetch();

        if (!$resetRecord) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode([
                'success' => false,
                'error' => 'Invalid or expired password reset link. Please request a fresh reset link.'
            ]);
            exit();
        }

        $pdo->beginTransaction();

        // 1. Update password in admin_users
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $stmtUpdate = $pdo->prepare("UPDATE admin_users SET password = :p WHERE LOWER(email) = :email");
        $stmtUpdate->execute([':p' => $newHash, ':email' => $email]);

        // 2. Mark token used
        $stmtMark = $pdo->prepare("UPDATE password_resets SET used = 1 WHERE token = :token");
        $stmtMark->execute([':token' => $token]);

        // 3. Log to audit trail
        $stmtAudit = $pdo->prepare("
            INSERT INTO audit_logs (action, target, ip_address, timestamp)
            VALUES (:action, :target, :ip, CURRENT_TIMESTAMP)
        ");
        $stmtAudit->execute([
            ':action' => "Password reset completed for administrator: {$email}",
            ':target' => $email,
            ':ip' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $pdo->commit();

        // 4. Dispatch Password Changed confirmation email
        $stmtUser = $pdo->prepare("SELECT name FROM admin_users WHERE LOWER(email) = :email");
        $stmtUser->execute([':email' => $email]);
        $userName = $stmtUser->fetchColumn() ?: 'Administrator';

        $loginUrl = getAppBaseUrl() . '/index.html?login=admin';
        $confirmHtml = renderPasswordChangedEmail($userName, $email, $loginUrl);
        sendMailNotification(
            $pdo,
            $email,
            $userName,
            'Your MailFooter Password Was Changed',
            $confirmHtml,
            'password_changed',
            explode('@', $email)[1] ?? null
        );

        echo json_encode([
            'success' => true,
            'message' => 'Your password has been successfully reset. You can now sign in with your new credentials.'
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['success' => false, 'error' => 'Database update error: ' . $e->getMessage()]);
    }
    exit();
}

header('HTTP/1.1 400 Bad Request');
echo json_encode(['success' => false, 'error' => 'Invalid action or request method.']);
