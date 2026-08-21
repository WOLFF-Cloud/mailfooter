<?php
// api/upload_banner.php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

if (!isset($_FILES['banner'])) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'No file uploaded under key "banner"']);
    exit();
}

$file = $_FILES['banner'];

// Validate PHP upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'File upload error code: ' . $file['error']]);
    exit();
}

// Validate MIME type
$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedMimeTypes)) {
    header('HTTP/1.1 400 Bad Request');
    echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.']);
    exit();
}

// Ensure upload directory exists
$uploadDir = dirname(__DIR__) . '/Resources/uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique, clean file name
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
if (empty($extension)) {
    // Fallback extensions based on mime type
    $extMap = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp'
    ];
    $extension = $extMap[$mimeType] ?? 'png';
}

$cleanName = 'banner_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($extension);
$destination = $uploadDir . '/' . $cleanName;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    echo json_encode([
        'success' => true,
        'message' => 'Banner uploaded successfully',
        'url' => 'Resources/uploads/' . $cleanName
    ]);
} else {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(['error' => 'Failed to move uploaded file.']);
}
exit();
