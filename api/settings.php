<?php
// api/settings.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// Handle GET requests
if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    
    // Check if backup is requested
    if ($action === 'backup') {
        $dbFile = __DIR__ . '/../database/database.sqlite';
        if (file_exists($dbFile)) {
            header('Content-Description: File Transfer');
            header('Content-Type: application/octet-stream');
            header('Content-Disposition: attachment; filename="mailfooter_backup_' . date('Y-m-d') . '.sqlite"');
            header('Expires: 0');
            header('Cache-Control: must-revalidate');
            header('Pragma: public');
            header('Content-Length: ' . filesize($dbFile));
            readfile($dbFile);
            exit();
        } else {
            header('HTTP/1.1 404 Not Found');
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Database file not found']);
            exit();
        }
    }
    
    // Default GET: return settings dictionary
    try {
        $clientDomain = getActiveDomain($pdo);
        
        $rows = $pdo->query("SELECT setting_key, setting_value FROM settings")->fetchAll();
        $rawSettings = [];
        foreach ($rows as $row) {
            $rawSettings[$row['setting_key']] = $row['setting_value'];
        }
        
        // Define settings list we care about
        $configKeys = [
            'company_name', 'company_website', 'company_logo', 'company_brand_graphic',
            'social_linkedin', 'social_twitter', 'social_facebook', 'social_instagram', 'social_youtube',
            'color_primary', 'color_secondary', 'company_tagline', 'company_bio',
            'business_size', 'business_industry', 'business_address', 'admin_name', 'admin_email',
            
            // Amathuba AI specific settings keys
            'brand_element_pattern', 'btn_request_demo', 'btn_ask_nandi', 'btn_khulisa',
            'btn_intelidocs', 'btn_smart_contracts', 'btn_commercial_intelligence',
            'our_partners_osh', 'our_partners_sage', 'our_partners_askelie',
            'icon_bg', 'icon_linkedin', 'icon_instagram', 'icon_twitter', 'icon_facebook', 'icon_youtube'
        ];
        
        $settings = [];
        foreach ($configKeys as $k) {
            $clientKey = !empty($clientDomain) ? ($clientDomain . ':' . $k) : '';
            if (!empty($clientKey) && isset($rawSettings[$clientKey])) {
                $settings[$k] = $rawSettings[$clientKey];
            } else {
                if (!empty($clientDomain)) {
                    // Smart domain defaults to avoid leaking other tenant branding
                    if ($k === 'company_name') {
                        $parts = explode('.', $clientDomain);
                        $settings[$k] = strtoupper($parts[0]);
                    } else if ($k === 'company_website') {
                        $settings[$k] = 'https://www.' . $clientDomain;
                    } else if ($k === 'admin_email') {
                        $settings[$k] = 'admin@' . $clientDomain;
                    } else if ($k === 'admin_name') {
                        $settings[$k] = 'Administrator';
                    } else if ($k === 'company_logo' || $k === 'company_brand_graphic') {
                        $settings[$k] = '';
                    } else if (isset($rawSettings[$k])) {
                        if (strpos($rawSettings[$k], 'osholdings') !== false || strpos($rawSettings[$k], 'os-holdings') !== false) {
                            $settings[$k] = '';
                        } else {
                            $settings[$k] = $rawSettings[$k];
                        }
                    } else {
                        $settings[$k] = '';
                    }
                } else {
                    $settings[$k] = $rawSettings[$k] ?? '';
                }
            }
        }
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'settings' => $settings]);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to fetch settings: ' . $e->getMessage()]);
    }
    exit();
}

// Handle POST requests
if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !is_array($data)) {
        header('HTTP/1.1 400 Bad Request');
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid JSON payload']);
        exit();
    }
    
    try {
        $clientDomain = getActiveDomain($pdo);
        if (empty($clientDomain)) {
            header('HTTP/1.1 400 Bad Request');
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Client domain is required to update settings']);
            exit();
        }
        
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("
            INSERT OR REPLACE INTO settings (setting_key, setting_value)
            VALUES (:key, :value)
        ");
        
        foreach ($data as $key => $value) {
            $storeKey = !empty($clientDomain) ? ($clientDomain . ':' . $key) : $key;
            $stmt->execute([
                ':key' => $storeKey,
                ':value' => (string)$value
            ]);
        }
        
        $pdo->commit();
        
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Settings updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        header('HTTP/1.1 500 Internal Server Error');
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Failed to update settings: ' . $e->getMessage()]);
    }
    exit();
}

header('HTTP/1.1 405 Method Not Allowed');
echo json_encode(['error' => 'Method not allowed']);
exit();
