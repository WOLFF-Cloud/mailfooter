<?php
// api/scan_templates.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$root = dirname(__DIR__);
$templatesDir = $root . '/templates';
$fallbackDir = $root . '/Signature Blueprints';

$dir = is_dir($templatesDir) ? $templatesDir : $fallbackDir;
if (!is_dir($dir)) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['success' => false, 'error' => 'Templates directory not found']);
    exit();
}

$files = @scandir($dir);
if ($files === false) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['success' => false, 'error' => 'Failed to scan templates directory']);
    exit();
}

$images = [];
$folderName = is_dir($templatesDir) ? 'templates' : 'Signature Blueprints';

foreach ($files as $file) {
    if ($file === '.' || $file === '..') {
        continue;
    }
    
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'])) {
        $images[] = [
            'filename' => $file,
            'url' => $folderName . '/' . $file
        ];
    }
}

echo json_encode(['success' => true, 'files' => $images]);
exit();
