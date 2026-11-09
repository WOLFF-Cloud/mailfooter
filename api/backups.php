<?php
// api/backups.php
// Server-backed directory snapshot & restore engine (keeps last 5 snapshots, 48-hour auto-rotation)

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
$domain = strtolower($clientParam ?: ($enforceDomain ? $clientDomain : 'os-holdings.co.za'));

$method = $_SERVER['REQUEST_METHOD'];

// Helper to format user row
function backupFormatRow($row) {
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
        'company' => $row['company'] ?? 'OS Holdings',
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

// Helper to fetch current staff records for domain
function getCurrentStaffRecords($pdo, $domain) {
    if ($domain === 'osbusinessamp.com' || $domain === 'osbusinessam.com') {
        $stmt = $pdo->prepare("
            SELECT * FROM users 
            WHERE LOWER(email) LIKE '%@osbusinessamp.com' OR LOWER(email) LIKE '%@osbusinessam.com'
            ORDER BY name ASC, created_at ASC
        ");
        $stmt->execute();
    } else if ($domain === 'osholdings.co.za' || $domain === 'os-holdings.co.za') {
        $stmt = $pdo->prepare("
            SELECT * FROM users 
            WHERE LOWER(email) LIKE '%@os-holdings.co.za' 
               OR LOWER(email) LIKE '%@osholdings.%' 
               OR LOWER(email) LIKE '%@osholdinsg.%'
            ORDER BY name ASC, created_at ASC
        ");
        $stmt->execute();
    } else {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(email) LIKE :domFilter ORDER BY name ASC, created_at ASC");
        $stmt->execute([':domFilter' => '%@' . strtolower($domain)]);
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    return array_map('backupFormatRow', $rows);
}

// Helper to prune older backups beyond latest 5 for this domain
function pruneBackups($pdo, $domain) {
    $stmt = $pdo->prepare("
        DELETE FROM directory_backups 
        WHERE domain = :domain 
          AND id NOT IN (
              SELECT id FROM directory_backups 
              WHERE domain = :domSub 
              ORDER BY created_at DESC, id DESC 
              LIMIT 5
          )
    ");
    $stmt->execute([':domain' => $domain, ':domSub' => $domain]);
}

// -------------------------------------------------------------
// GET: List last 5 snapshots
// -------------------------------------------------------------
if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("
            SELECT id, domain, reason, total_records, created_at 
            FROM directory_backups 
            WHERE domain = :domain 
            ORDER BY created_at DESC, id DESC 
            LIMIT 5
        ");
        $stmt->execute([':domain' => $domain]);
        $backups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'domain' => $domain,
            'backups' => $backups
        ]);
    } catch (Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit();
}

// -------------------------------------------------------------
// POST: Actions (auto_check, create, restore)
// -------------------------------------------------------------
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true) ?? [];
$action = strtolower(trim($data['action'] ?? ''));

// 1. AUTO_CHECK: Snapshot every 48 hours automatically
if ($action === 'auto_check') {
    try {
        $stmt = $pdo->prepare("
            SELECT created_at FROM directory_backups 
            WHERE domain = :domain 
            ORDER BY created_at DESC, id DESC 
            LIMIT 1
        ");
        $stmt->execute([':domain' => $domain]);
        $latest = $stmt->fetchColumn();

        $shouldSnapshot = false;
        if (!$latest) {
            $shouldSnapshot = true;
            $reason = 'Initial 48-Hour Baseline Backup';
        } else {
            $latestTs = strtotime($latest);
            $hoursPassed = (time() - $latestTs) / 3600;
            if ($hoursPassed >= 48) {
                $shouldSnapshot = true;
                $reason = 'Scheduled 48-Hour Cloud Backup';
            }
        }

        if ($shouldSnapshot) {
            $records = getCurrentStaffRecords($pdo, $domain);
            if (count($records) > 0) {
                $ins = $pdo->prepare("
                    INSERT INTO directory_backups (domain, reason, total_records, data_json, created_at)
                    VALUES (:domain, :reason, :total, :data, CURRENT_TIMESTAMP)
                ");
                $ins->execute([
                    ':domain' => $domain,
                    ':reason' => $reason,
                    ':total' => count($records),
                    ':data' => json_encode($records, JSON_UNESCAPED_UNICODE)
                ]);
                pruneBackups($pdo, $domain);
                echo json_encode(['success' => true, 'created' => true, 'reason' => $reason, 'count' => count($records)]);
                exit();
            }
        }

        echo json_encode(['success' => true, 'created' => false, 'message' => 'Latest backup is under 48 hours old.']);
    } catch (Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

// 2. CREATE MANUAL SNAPSHOT
if ($action === 'create') {
    try {
        $reason = trim($data['reason'] ?? 'Manual Cloud Backup');
        $records = getCurrentStaffRecords($pdo, $domain);

        $ins = $pdo->prepare("
            INSERT INTO directory_backups (domain, reason, total_records, data_json, created_at)
            VALUES (:domain, :reason, :total, :data, CURRENT_TIMESTAMP)
        ");
        $ins->execute([
            ':domain' => $domain,
            ':reason' => $reason,
            ':total' => count($records),
            ':data' => json_encode($records, JSON_UNESCAPED_UNICODE)
        ]);

        pruneBackups($pdo, $domain);

        echo json_encode([
            'success' => true,
            'message' => 'Cloud backup snapshot created successfully.',
            'backup_id' => $pdo->lastInsertId(),
            'total_records' => count($records)
        ]);
    } catch (Exception $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit();
}

// 3. RESTORE FROM SNAPSHOT
if ($action === 'restore') {
    $backupId = intval($data['id'] ?? 0);
    if ($backupId <= 0) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing or invalid backup ID.']);
        exit();
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM directory_backups WHERE id = :id AND domain = :domain");
        $stmt->execute([':id' => $backupId, ':domain' => $domain]);
        $backup = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$backup) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Backup snapshot not found for this domain.']);
            exit();
        }

        $records = json_decode($backup['data_json'], true);
        if (!is_array($records)) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Backup snapshot data is corrupted.']);
            exit();
        }

        // 1. Take safety snapshot of current state before restoring
        $currentRecords = getCurrentStaffRecords($pdo, $domain);
        if (count($currentRecords) > 0) {
            $safetyStmt = $pdo->prepare("
                INSERT INTO directory_backups (domain, reason, total_records, data_json, created_at)
                VALUES (:domain, :reason, :total, :data, CURRENT_TIMESTAMP)
            ");
            $safetyStmt->execute([
                ':domain' => $domain,
                ':reason' => 'Pre-restore Safety Snapshot (' . date('Y-m-d H:i') . ')',
                ':total' => count($currentRecords),
                ':data' => json_encode($currentRecords, JSON_UNESCAPED_UNICODE)
            ]);
        }

        // 2. Reinstate records into database
        $pdo->beginTransaction();

        $restoredCount = 0;
        foreach ($records as $u) {
            $email = strtolower(trim($u['email'] ?? ''));
            if (empty($email)) continue;
            $firstName = trim($u['firstName'] ?? '');
            $lastName = trim($u['lastName'] ?? '');
            $name = trim($u['name'] ?? ($firstName . ' ' . $lastName));
            if (empty($name)) $name = $email;

            $insertStmt = $pdo->prepare("
                INSERT OR REPLACE INTO users (
                    email, name, first_name, last_name, title, department, phone, mobile, role, company, location, web,
                    primary_color, secondary_color, linkedin, twitter, facebook, instagram, youtube, template, campaign_enabled, campaign_id, created_at
                ) VALUES (
                    :email, :name, :first_name, :last_name, :title, :department, :phone, :mobile, :role, :company, :location, :web,
                    :primary_color, :secondary_color, :linkedin, :twitter, :facebook, :instagram, :youtube, :template, :campaign_enabled, :campaign_id,
                    COALESCE((SELECT created_at FROM users WHERE LOWER(email) = :email_check), CURRENT_TIMESTAMP)
                )
            ");
            $insertStmt->execute([
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
                ':company' => $u['company'] ?? 'OS Holdings',
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
            $restoredCount++;
        }

        $pdo->commit();
        pruneBackups($pdo, $domain);

        echo json_encode([
            'success' => true,
            'message' => "Successfully reinstated $restoredCount staff records into server database.",
            'restored_count' => $restoredCount
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Restore failed: ' . $e->getMessage()]);
    }
    exit();
}

header('HTTP/1.1 400 Bad Request');
echo json_encode(['error' => 'Unsupported action.']);
