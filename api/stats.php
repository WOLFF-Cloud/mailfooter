<?php
// api/stats.php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

$impersonateDomain = getActiveDomain($pdo);
if (empty($impersonateDomain)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['success' => false, 'error' => 'Client domain is required']);
    exit();
}

// Helper to geolocate IP (Cached)
function geolocateIP($ip, $pdo) {
    if (empty($ip) || $ip === '127.0.0.1' || $ip === '::1' || strpos($ip, '192.168.') === 0 || strpos($ip, '10.') === 0) {
        return ['city' => 'Local Network', 'country' => 'Localhost', 'lat' => 0, 'lon' => 0];
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM ip_cache WHERE ip = :ip");
        $stmt->execute([':ip' => $ip]);
        $cached = $stmt->fetch();
        if ($cached) {
            return $cached;
        }
    } catch (Exception $e) {
        // Table issue, bypass cache
    }
    
    // Fetch from ip-api with a short timeout
    $ctx = stream_context_create(['http' => ['timeout' => 2]]);
    $response = @file_get_contents("http://ip-api.com/json/" . urlencode($ip) . "?fields=status,country,city,lat,lon", false, $ctx);
    
    if ($response) {
        $data = json_decode($response, true);
        if ($data && isset($data['status']) && $data['status'] === 'success') {
            $location = [
                'ip' => $ip,
                'country' => $data['country'] ? $data['country'] : 'Unknown',
                'city' => $data['city'] ? $data['city'] : 'Unknown',
                'lat' => $data['lat'],
                'lon' => $data['lon']
            ];
            
            try {
                $stmt = $pdo->prepare("
                    INSERT OR IGNORE INTO ip_cache (ip, country, city, lat, lon)
                    VALUES (:ip, :country, :city, :lat, :lon)
                ");
                $stmt->execute([
                    ':ip' => $ip,
                    ':country' => $location['country'],
                    ':city' => $location['city'],
                    ':lat' => $location['lat'],
                    ':lon' => $location['lon']
                ]);
            } catch (Exception $e) {
                // Ignore save errors
            }
            
            return $location;
        }
    }
    
    return ['city' => 'Unknown', 'country' => 'Unknown', 'lat' => null, 'lon' => null];
}

// Helper to parse User-Agents
function parseUserAgent($ua) {
    if (empty($ua)) {
        return ['device' => 'Unknown', 'client' => 'Unknown'];
    }
    
    // Determine Device
    $device = 'Desktop';
    if (preg_match('/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i', $ua)) {
        $device = 'Tablet';
    } elseif (preg_match('/(mobile|ipod|iphone|blackberry|opera mini|opera mobi|iemobile|symbian|webos|fennec)/i', $ua)) {
        $device = 'Mobile';
    }
    
    // Determine Client
    $client = 'Web Browser / Other';
    if (strpos($ua, 'GoogleImageProxy') !== false || strpos($ua, 'Gmail') !== false) {
        $client = 'Gmail';
    } elseif (strpos($ua, 'Outlook') !== false || strpos($ua, 'MSOffice') !== false || strpos($ua, 'Microsoft Outlook') !== false) {
        $client = 'Outlook';
    } elseif (strpos($ua, 'Thunderbird') !== false) {
        $client = 'Thunderbird';
    } elseif (preg_match('/(iPhone|iPad|Macintosh|Mac OS X).*Mail/i', $ua)) {
        $client = 'Apple Mail';
    }
    
    return ['device' => $device, 'client' => $client];
}

// Handle single campaign stats detail action
if (isset($_GET['action']) && $_GET['action'] === 'campaign_details') {
    $campaignId = $_GET['id'] ?? '';
    if (empty($campaignId)) {
        header('HTTP/1.1 400 Bad Request');
        echo json_encode(['error' => 'Missing campaign ID']);
        exit();
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM campaigns WHERE id = :id AND (client_domain = :domain OR client_domain IS NULL)");
        $stmt->execute([':id' => $campaignId, ':domain' => $impersonateDomain]);
        $campaign = $stmt->fetch();
        
        if (!$campaign) {
            header('HTTP/1.1 404 Not Found');
            echo json_encode(['error' => 'Campaign not found']);
            exit();
        }
        
        $domainPattern = '%@' . $impersonateDomain;
        
        $stmtO = $pdo->prepare("SELECT COUNT(*) FROM opens WHERE campaign_id = :id AND email LIKE :pattern");
        $stmtO->execute([':id' => $campaignId, ':pattern' => $domainPattern]);
        $opensCount = (int) $stmtO->fetchColumn();
        
        $stmtC = $pdo->prepare("SELECT COUNT(*) FROM clicks WHERE link_id = 'campaign_banner' AND destination = :target_link AND email LIKE :pattern");
        $stmtC->execute([':target_link' => $campaign['target_link'], ':pattern' => $domainPattern]);
        $clicksCount = (int) $stmtC->fetchColumn();
        
        $ctr = 0;
        if ($opensCount > 0) {
            $ctr = round(($clicksCount / $opensCount) * 100, 1);
        }
        
        $stmtLogs = $pdo->prepare("
            SELECT c.timestamp, c.ip_address, c.user_agent, u.name, c.email
            FROM clicks c
            LEFT JOIN users u ON c.email = u.email
            WHERE c.link_id = 'campaign_banner' AND c.destination = :target_link AND c.email LIKE :pattern
            ORDER BY c.timestamp DESC
            LIMIT 10
        ");
        $stmtLogs->execute([':target_link' => $campaign['target_link'], ':pattern' => $domainPattern]);
        $logs = $stmtLogs->fetchAll();
        
        $clickLogs = [];
        foreach ($logs as $row) {
            $parsed = parseUserAgent($row['user_agent']);
            $loc = geolocateIP($row['ip_address'], $pdo);
            $clickLogs[] = [
                'timestamp' => $row['timestamp'],
                'ip_address' => $row['ip_address'],
                'location' => $loc['city'] . ', ' . $loc['country'],
                'device' => $parsed['device'],
                'client' => $parsed['client'],
                'user' => $row['name'] ? $row['name'] : $row['email'],
                'email' => $row['email']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'campaign' => [
                'id' => $campaign['id'],
                'name' => $campaign['name'],
                'target_link' => $campaign['target_link'],
                'opens' => $opensCount,
                'clicks' => $clicksCount,
                'ctr' => $ctr
            ],
            'recent_clicks' => $clickLogs
        ]);
    } catch (PDOException $e) {
        header('HTTP/1.1 500 Internal Server Error');
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
    exit();
}

if (basename($_SERVER['SCRIPT_FILENAME']) === 'stats.php') {
try {
    // 1. General counts & aggregates (impersonateDomain is resolved and validated at the top)
    $domainPattern = '%@' . $impersonateDomain;
    
    $stmtU = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email LIKE :pattern");
    $stmtU->execute([':pattern' => $domainPattern]);
    $totalUsers = (int) $stmtU->fetchColumn();
    
    $stmtO = $pdo->prepare("SELECT user_agent, ip_address, campaign_id FROM opens WHERE email LIKE :pattern");
    $stmtO->execute([':pattern' => $domainPattern]);
    $opens = $stmtO->fetchAll();
    
    $stmtC = $pdo->prepare("SELECT user_agent, ip_address, link_id FROM clicks WHERE email LIKE :pattern");
    $stmtC->execute([':pattern' => $domainPattern]);
    $clicks = $stmtC->fetchAll();
    
    $totalOpens = count($opens);
    $totalClicks = count($clicks);
    
    // CTR calculation
    $ctr = 0;
    if ($totalOpens > 0) {
        $ctr = round(($totalClicks / $totalOpens) * 100, 1);
    }
    
    // 2. Parse User-Agent Devices & Clients (Based on Email Opens / Impressions)
    $deviceStats = ['Desktop' => 0, 'Mobile' => 0, 'Tablet' => 0, 'Unknown' => 0];
    $clientStats = ['Outlook' => 0, 'Gmail' => 0, 'Apple Mail' => 0, 'Web Browser / Other' => 0, 'Unknown' => 0];
    
    foreach ($opens as $row) {
        $parsed = parseUserAgent($row['user_agent']);
        $deviceKey = isset($deviceStats[$parsed['device']]) ? $parsed['device'] : 'Unknown';
        $clientKey = isset($clientStats[$parsed['client']]) ? $parsed['client'] : 'Web Browser / Other';
        $deviceStats[$deviceKey]++;
        $clientStats[$clientKey]++;
    }
    
    // 3. Geolocate IPs (Based on Email Opens / Impressions)
    $locationStats = [];
    
    foreach ($opens as $row) {
        if (!empty($row['ip_address'])) {
            $loc = geolocateIP($row['ip_address'], $pdo);
            $key = $loc['city'] . ', ' . $loc['country'];
            if (!isset($locationStats[$key])) {
                $locationStats[$key] = 0;
            }
            $locationStats[$key]++;
        }
    }
    
    arsort($locationStats);
    $topLocations = [];
    $i = 0;
    foreach ($locationStats as $locName => $count) {
        if ($i >= 5) break;
        $topLocations[] = ['location' => $locName, 'count' => $count];
        $i++;
    }

    // 3.5. Link Clicks breakdown (Based on clicks)
    $linkClicksBreakdown = [
        'Company Website' => 0,
        'Marketing Banner' => 0,
        'LinkedIn Profile' => 0,
        'Twitter/X Profile' => 0,
        'Instagram Profile' => 0,
        'Facebook Profile' => 0,
        'YouTube Channel' => 0
    ];
    $linkIdMap = [
        'website' => 'Company Website',
        'campaign_banner' => 'Marketing Banner',
        'linkedin' => 'LinkedIn Profile',
        'twitter' => 'Twitter/X Profile',
        'instagram' => 'Instagram Profile',
        'facebook' => 'Facebook Profile',
        'youtube' => 'YouTube Channel'
    ];
    foreach ($clicks as $row) {
        $lId = strtolower(trim($row['link_id'] ?? ''));
        if (isset($linkIdMap[$lId])) {
            $label = $linkIdMap[$lId];
            $linkClicksBreakdown[$label]++;
        }
    }
    
    // 4. Active Campaign Stats
    if (!empty($impersonateDomain)) {
        $stmtActive = $pdo->prepare("SELECT * FROM campaigns WHERE is_active = 1 AND (client_domain = :domain OR client_domain IS NULL) ORDER BY client_domain DESC LIMIT 1");
        $stmtActive->execute([':domain' => $impersonateDomain]);
        $activeCampaign = $stmtActive->fetch();
    } else {
        $stmtActive = $pdo->query("SELECT * FROM campaigns WHERE is_active = 1 LIMIT 1");
        $activeCampaign = $stmtActive->fetch();
    }
    
    $bannerClicks = 0;
    $bannerOpens = 0;
    
    if ($activeCampaign) {
        $activeId = $activeCampaign['id'];
        
        if (!empty($impersonateDomain)) {
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM clicks WHERE link_id = 'campaign_banner' AND email LIKE :pattern");
            $stmtC->execute([':pattern' => $domainPattern]);
            $bannerClicks = (int) $stmtC->fetchColumn();
            
            $stmtO = $pdo->prepare("SELECT COUNT(*) FROM opens WHERE campaign_id = :campaign_id AND email LIKE :pattern");
            $stmtO->execute([':campaign_id' => $activeId, ':pattern' => $domainPattern]);
            $bannerOpens = (int) $stmtO->fetchColumn();
        } else {
            $stmtC = $pdo->prepare("SELECT COUNT(*) FROM clicks WHERE link_id = 'campaign_banner'");
            $stmtC->execute();
            $bannerClicks = (int) $stmtC->fetchColumn();
            
            $stmtO = $pdo->prepare("SELECT COUNT(*) FROM opens WHERE campaign_id = :campaign_id");
            $stmtO->execute([':campaign_id' => $activeId]);
            $bannerOpens = (int) $stmtO->fetchColumn();
        }
    }
    
    $bannerCtr = 0;
    if ($bannerOpens > 0) {
        $bannerCtr = round(($bannerClicks / $bannerOpens) * 100, 1);
    }
    
    // 5. Employee List
    if (!empty($impersonateDomain)) {
        $employeesQuery = "
            SELECT 
                u.name,
                u.email,
                u.title,
                u.department,
                u.created_at,
                (SELECT COUNT(*) FROM clicks c WHERE c.email = u.email) as clicks,
                (SELECT COUNT(*) FROM opens o WHERE o.email = u.email) as opens
            FROM users u
            WHERE u.email LIKE :pattern
            ORDER BY clicks DESC, name ASC
        ";
        $stmtEmp = $pdo->prepare($employeesQuery);
        $stmtEmp->execute([':pattern' => $domainPattern]);
        $employees = $stmtEmp->fetchAll();
    } else {
        $employeesQuery = "
            SELECT 
                u.name,
                u.email,
                u.title,
                u.department,
                u.created_at,
                (SELECT COUNT(*) FROM clicks c WHERE c.email = u.email) as clicks,
                (SELECT COUNT(*) FROM opens o WHERE o.email = u.email) as opens
            FROM users u
            ORDER BY clicks DESC, name ASC
        ";
        $employees = $pdo->query($employeesQuery)->fetchAll();
    }
    
    // 6. Recent activity log
    $activityLog = [];
    
    if (!empty($impersonateDomain)) {
        $opensQuery = "
            SELECT 
                o.email,
                u.name,
                o.campaign_id,
                o.timestamp,
                'open' as type
            FROM opens o
            LEFT JOIN users u ON o.email = u.email
            WHERE o.email LIKE :pattern
            ORDER BY o.timestamp DESC
            LIMIT 20
        ";
        $stmtOpens = $pdo->prepare($opensQuery);
        $stmtOpens->execute([':pattern' => $domainPattern]);
        $recentOpens = $stmtOpens->fetchAll();
        
        $clicksQuery = "
            SELECT 
                c.email,
                u.name,
                c.link_id,
                c.destination,
                c.timestamp,
                'click' as type
            FROM clicks c
            LEFT JOIN users u ON c.email = u.email
            WHERE c.email LIKE :pattern
            ORDER BY c.timestamp DESC
            LIMIT 20
        ";
        $stmtClicks = $pdo->prepare($clicksQuery);
        $stmtClicks->execute([':pattern' => $domainPattern]);
        $recentClicks = $stmtClicks->fetchAll();
    } else {
        $opensQuery = "
            SELECT 
                o.email,
                u.name,
                o.campaign_id,
                o.timestamp,
                'open' as type
            FROM opens o
            LEFT JOIN users u ON o.email = u.email
            ORDER BY o.timestamp DESC
            LIMIT 20
        ";
        $recentOpens = $pdo->query($opensQuery)->fetchAll();
        
        $clicksQuery = "
            SELECT 
                c.email,
                u.name,
                c.link_id,
                c.destination,
                c.timestamp,
                'click' as type
            FROM clicks c
            LEFT JOIN users u ON c.email = u.email
            ORDER BY c.timestamp DESC
            LIMIT 20
        ";
        $recentClicks = $pdo->query($clicksQuery)->fetchAll();
    }
    
    foreach ($recentOpens as $row) {
        $name = $row['name'] ? $row['name'] : $row['email'];
        $activityLog[] = [
            'type' => 'open',
            'user' => $name,
            'email' => $row['email'],
            'detail' => 'Email opened',
            'timestamp' => $row['timestamp']
        ];
    }
    
    foreach ($recentClicks as $row) {
        $name = $row['name'] ? $row['name'] : $row['email'];
        $linkDisplay = ucfirst($row['link_id']);
        if ($row['link_id'] === 'campaign_banner') {
            $linkDisplay = 'Campaign Banner';
        }
        $activityLog[] = [
            'type' => 'click',
            'user' => $name,
            'email' => $row['email'],
            'detail' => 'Clicked ' . $linkDisplay,
            'timestamp' => $row['timestamp']
        ];
    }
    
    usort($activityLog, function ($a, $b) {
        return strcmp($b['timestamp'], $a['timestamp']);
    });
    
    $activityLog = array_slice($activityLog, 0, 30);
    
    // 7. Response payload
    echo json_encode([
        'success' => true,
        'metrics' => [
            'total_users' => $totalUsers,
            'total_opens' => $totalOpens,
            'total_clicks' => $totalClicks,
            'ctr' => $ctr,
            'devices' => $deviceStats,
            'clients' => $clientStats,
            'locations' => $topLocations,
            'links' => $linkClicksBreakdown,
            'campaign' => [
                'id' => $activeCampaign ? $activeCampaign['id'] : 'none',
                'name' => $activeCampaign ? $activeCampaign['name'] : 'No active campaign',
                'link' => $activeCampaign ? $activeCampaign['target_link'] : '',
                'clicks' => $bannerClicks,
                'opens' => $bannerOpens,
                'ctr' => $bannerCtr
            ]
        ],
        'employees' => $employees,
        'activity' => $activityLog
    ]);
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['error' => 'Stats retrieval failed: ' . $e->getMessage()]);
}
}
