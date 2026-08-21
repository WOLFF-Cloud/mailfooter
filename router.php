<?php
// router.php
// Routing helper for local PHP built-in web servers (e.g. php -S localhost:8000 router.php)

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = urldecode($uri);

// Normalize trailing slash and remove it if present (except for root /)
$normalizedUri = ($uri !== '/' && substr($uri, -1) === '/') ? substr($uri, 0, -1) : $uri;

// 1. Static file serving check (if the file exists directly in root)
$filePath = __DIR__ . $normalizedUri;
if ($normalizedUri !== '/' && file_exists($filePath) && !is_dir($filePath)) {
    return false; // let the built-in server serve the static file directly
}

// 2. Route Admin and HTML Portals
if ($normalizedUri === '/admin') {
    include __DIR__ . '/admin.html';
    exit();
}
if ($normalizedUri === '/super-admin') {
    include __DIR__ . '/super-admin.html';
    exit();
}
if ($normalizedUri === '/app') {
    include __DIR__ . '/app.html';
    exit();
}
if ($normalizedUri === '/register') {
    include __DIR__ . '/register.html';
    exit();
}
if ($normalizedUri === '/index') {
    include __DIR__ . '/index.html';
    exit();
}

// 3. Route REST API Endpoints
if (strpos($normalizedUri, '/api/') === 0) {
    $endpoint = substr($normalizedUri, 5); // strip '/api/'
    $endpointClean = str_replace('.php', '', $endpoint);
    $apiFile = __DIR__ . '/api/' . $endpointClean . '.php';
    
    if (file_exists($apiFile)) {
        include $apiFile;
        exit();
    }
}

// 4. Route Tracking Pixel and Click Redirect Endpoints
if (strpos($normalizedUri, '/track/') === 0) {
    $endpoint = substr($normalizedUri, 7); // strip '/track/'
    $endpointClean = str_replace('.php', '', $endpoint);
    $trackFile = __DIR__ . '/track/' . $endpointClean . '.php';
    
    if (file_exists($trackFile)) {
        include $trackFile;
        exit();
    }
}

// Fallback to serving index.html for root, or return false to let PHP handle standard files
if ($normalizedUri === '/') {
    include __DIR__ . '/index.html';
    exit();
}

return false;
