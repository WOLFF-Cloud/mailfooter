<?php
// api/campaigns.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

$clientDomain = getActiveDomain($pdo);
if (empty($clientDomain)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Client domain is required']);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE client_domain = :domain OR client_domain IS NULL ORDER BY created_at DESC");
        $stmt->execute([':domain' => $clientDomain]);
        $campaigns = $stmt->fetchAll();
        echo json_encode(['success' => true, 'campaigns' => $campaigns]);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Failed to fetch campaigns: ' . $e->getMessage()]);
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
    
    // Action 1: Set Active Campaign
    if ($action === 'set_active') {
        if (empty($data['id'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing campaign ID']);
            exit();
        }
        
        $id = $data['id'];
        
        try {
            $pdo->beginTransaction();
            // Find template_id of target campaign
            $stmtFind = $pdo->prepare("SELECT template_id, client_domain FROM campaigns WHERE id = :id");
            $stmtFind->execute([':id' => $id]);
            $campaign = $stmtFind->fetch();
            
            if ($campaign) {
                // Ensure they own the campaign before activating it!
                if (!empty($campaign['client_domain']) && strcasecmp($campaign['client_domain'], $clientDomain) !== 0) {
                    header('HTTP/1.1 403 Forbidden');
                    echo json_encode(['error' => 'You do not have permission to modify this campaign.']);
                    exit();
                }
                
                $templateId = $campaign['template_id'];
                // Set all campaigns for this template_id to inactive
                $stmtInactivate = $pdo->prepare("UPDATE campaigns SET is_active = 0 WHERE template_id = :template_id AND (client_domain = :domain OR client_domain IS NULL)");
                $stmtInactivate->execute([':template_id' => $templateId, ':domain' => $clientDomain]);
                
                // Set selected to active
                $stmtActivate = $pdo->prepare("UPDATE campaigns SET is_active = 1 WHERE id = :id");
                $stmtActivate->execute([':id' => $id]);
            }
            
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Active campaign updated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to set active campaign: ' . $e->getMessage()]);
        }
        exit();
    }
    
    // Action 2: Add New Campaign
    if ($action === 'add') {
        if (empty($data['name']) || empty($data['image_main']) || empty($data['target_link'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing required fields (name, image_main, target_link)']);
            exit();
        }
        
        $id = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $data['name'])) . '_' . time();
        $templateId = !empty($data['template_id']) ? $data['template_id'] : 'all';
        
        try {
            $stmt = $pdo->prepare("
                INSERT INTO campaigns (id, name, image_main, image_partner, image_button, target_link, is_active, template_id, client_domain)
                VALUES (:id, :name, :image_main, :image_partner, :image_button, :target_link, 0, :template_id, :client_domain)
            ");
            
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':image_main' => $data['image_main'],
                ':image_partner' => !empty($data['image_partner']) ? $data['image_partner'] : null,
                ':image_button' => !empty($data['image_button']) ? $data['image_button'] : null,
                ':target_link' => $data['target_link'],
                ':template_id' => $templateId,
                ':client_domain' => !empty($clientDomain) ? $clientDomain : null
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Campaign added successfully', 'id' => $id]);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to save campaign: ' . $e->getMessage()]);
        }
        exit();
    }
    
    // Action: Update Campaign
    if ($action === 'update') {
        if (empty($data['id']) || empty($data['name']) || empty($data['image_main']) || empty($data['target_link'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing required fields (id, name, image_main, target_link)']);
            exit();
        }
        
        $id = $data['id'];
        $templateId = !empty($data['template_id']) ? $data['template_id'] : 'all';
        $isActive = !empty($data['is_active']) ? 1 : 0;
        
        try {
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("
                UPDATE campaigns 
                SET name = :name, 
                    image_main = :image_main, 
                    image_partner = :image_partner, 
                    image_button = :image_button, 
                    target_link = :target_link,
                    template_id = :template_id,
                    is_active = :is_active
                WHERE id = :id AND (client_domain = :domain OR client_domain IS NULL)
            ");
            
            $stmt->execute([
                ':id' => $id,
                ':name' => $data['name'],
                ':image_main' => $data['image_main'],
                ':image_partner' => !empty($data['image_partner']) ? $data['image_partner'] : null,
                ':image_button' => !empty($data['image_button']) ? $data['image_button'] : null,
                ':target_link' => $data['target_link'],
                ':template_id' => $templateId,
                ':is_active' => $isActive,
                ':domain' => $clientDomain
            ]);
            
            // If campaign is set to active, make all other campaigns for this template_id inactive
            if ($isActive === 1) {
                $stmtInactivate = $pdo->prepare("UPDATE campaigns SET is_active = 0 WHERE template_id = :template_id AND id != :id AND (client_domain = :domain OR client_domain IS NULL)");
                $stmtInactivate->execute([
                    ':template_id' => $templateId,
                    ':id' => $id,
                    ':domain' => $clientDomain
                ]);
            }
            
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Campaign updated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to update campaign: ' . $e->getMessage()]);
        }
        exit();
    }

    // Action 3: Delete Campaign
    if ($action === 'delete') {
        if (empty($data['id'])) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'Missing campaign ID']);
            exit();
        }
        
        $id = $data['id'];
        
        try {
            // Check if it is active first
            $stmt = $pdo->prepare("SELECT is_active, client_domain FROM campaigns WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $campaign = $stmt->fetch();
            
            if ($campaign) {
                if (!empty($campaign['client_domain']) && strcasecmp($campaign['client_domain'], $clientDomain) !== 0) {
                    header('HTTP/1.1 403 Forbidden');
                    echo json_encode(['error' => 'You do not have permission to delete this campaign.']);
                    exit();
                }
                
                if ($campaign['is_active'] == 1) {
                    header('HTTP/1.1 400 Bad Request');
                    echo json_encode(['error' => 'Cannot delete the currently active campaign']);
                    exit();
                }
            }
            
            $stmtDel = $pdo->prepare("DELETE FROM campaigns WHERE id = :id");
            $stmtDel->execute([':id' => $id]);
            
            echo json_encode(['success' => true, 'message' => 'Campaign deleted successfully']);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to delete campaign: ' . $e->getMessage()]);
        }
        exit();
    }
    
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Invalid action type']);
}
