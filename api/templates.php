<?php
// api/templates.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $clientDomain = $_GET['client'] ?? $_SERVER['HTTP_X_CLIENT_IMPERSONATE'] ?? '';
    try {
        if (!empty($clientDomain)) {
            $stmt = $pdo->prepare("SELECT * FROM templates WHERE client_domain = :domain ORDER BY created_at DESC");
            $stmt->execute([':domain' => $clientDomain]);
            $templates = $stmt->fetchAll();
        } else {
            $templates = $pdo->query("SELECT * FROM templates ORDER BY created_at DESC")->fetchAll();
        }

        // Scan disk templates from the templates directory
        $templatesDir = dirname(__DIR__) . '/templates';
        $diskTemplates = [];
        if (is_dir($templatesDir)) {
            $subdirs = @scandir($templatesDir);
            if ($subdirs !== false) {
                foreach ($subdirs as $subdir) {
                    if ($subdir === '.' || $subdir === '..') {
                        continue;
                    }
                    $dirPath = $templatesDir . '/' . $subdir;
                    if (is_dir($dirPath)) {
                        $htmlPath = $dirPath . '/template.html';
                        $configPath = $dirPath . '/config.json';
                        
                        if (file_exists($htmlPath)) {
                            $htmlContent = file_get_contents($htmlPath);
                            $name = ucwords(str_replace('-', ' ', $subdir));
                            
                            if (file_exists($configPath)) {
                                $config = json_decode(file_get_contents($configPath), true);
                                if ($config && !empty($config['name'])) {
                                    $name = $config['name'];
                                }
                            }
                            
                            $diskTemplates[] = [
                                'id' => $subdir,
                                'name' => $name,
                                'html_content' => $htmlContent,
                                'created_at' => date('Y-m-d H:i:s', filemtime($htmlPath)),
                                'client_domain' => null
                            ];
                        }
                    }
                }
            }
        }

        // Merge disk-based templates with database templates if not a custom client domain
        if (empty($clientDomain) || $clientDomain === 'osholdings.co.za') {
            $templates = array_merge($diskTemplates, $templates);
        }

        echo json_encode(['success' => true, 'templates' => $templates]);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Failed to fetch templates: ' . $e->getMessage()]);
    }
    exit();
}

if ($method === 'POST') {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || empty($data['action'])) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing action parameter']);
        exit();
    }
    
    $action = $data['action'];
    $clientDomain = $_GET['client'] ?? $_SERVER['HTTP_X_CLIENT_IMPERSONATE'] ?? $data['client'] ?? '';
    
    // Action 1: Add/Import Template
    if ($action === 'add') {
        if (empty($data['name']) || empty($data['html_content'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing required fields (name, html_content)']);
            exit();
        }
        
        $id = strtolower(preg_replace('/[^a-zA-Z0-9]/', '-', $data['name'])) . '-' . time();
        if (!empty($data['id'])) {
            $id = $data['id'];
        }
        
        try {
            $stmt = $pdo->prepare("
                INSERT OR REPLACE INTO templates (id, name, html_content, client_domain)
                VALUES (:id, :name, :html_content, :client_domain)
            ");
            
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':html_content' => $data['html_content'],
                ':client_domain' => !empty($clientDomain) ? $clientDomain : null
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Template saved successfully', 'id' => $id]);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to save template: ' . $e->getMessage()]);
        }
        exit();
    }
    
    // Action 2: Delete Template
    if ($action === 'delete') {
        if (empty($data['id'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing template ID']);
            exit();
        }
        
        $id = $data['id'];
        
        // Don't let users delete default template or disk-based engine templates
        if ($id === 'db-default') {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Cannot delete default template']);
            exit();
        }

        $templatesDir = dirname(__DIR__) . '/templates';
        if (is_dir($templatesDir . '/' . $id)) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Cannot delete core engine templates']);
            exit();
        }
        
        try {
            $stmtDel = $pdo->prepare("DELETE FROM templates WHERE id = :id");
            $stmtDel->execute([':id' => $id]);
            
            echo json_encode(['success' => true, 'message' => 'Template deleted successfully']);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to delete template: ' . $e->getMessage()]);
        }
        exit();
    }
    
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Invalid action type']);
    exit();
}

header('HTTP/1.1 405 Method Not Allowed');
echo json_encode(['error' => 'Method not allowed']);
exit();
