# deploy.ps1
# Automated deployment script to upload MailFooter signature files to GoDaddy via FTP

$configFile = Join-Path $PSScriptRoot "deploy-config.json"
$exampleFile = Join-Path $PSScriptRoot "deploy-config.json.example"

if (-not (Test-Path $configFile)) {
    Write-Host "Error: Configuration file 'deploy-config.json' not found!" -ForegroundColor Red
    Write-Host "To resolve this:" -ForegroundColor Yellow
    Write-Host "  1. Copy 'deploy-config.json.example' to 'deploy-config.json'"
    Write-Host "  2. Edit 'deploy-config.json' with your GoDaddy FTP credentials."
    Exit 1
}

# Load configuration
try {
    $config = Get-Content $configFile -Raw | ConvertFrom-Json
} catch {
    Write-Host "Error parsing 'deploy-config.json'. Ensure it is valid JSON." -ForegroundColor Red
    Exit 1
}

# Validate credentials
if ($config.username -eq "your_ftp_username" -or $config.password -eq "your_ftp_password") {
    Write-Host "Error: You need to edit 'deploy-config.json' with your actual FTP credentials." -ForegroundColor Red
    Exit 1
}

if ($config.protocol -ne "ftp") {
    Write-Host "Warning: This script currently runs natively for FTP. For SFTP, please use deploy.sh (requires curl/sftp) or install WinSCP PowerShell module." -ForegroundColor Yellow
}

$ftpHost = $config.host
$ftpUser = $config.username
$ftpPass = $config.password
$remotePath = $config.remotePath.Trim("/")

# Local files to upload
$filesToUpload = @(
    "index.html",
    "app.html",
    "light.html",
    "light.css",
    "light.js",
    "register.html",
    "admin.html",
    "super-admin.html",
    "landing-index.html",
    "script.js",
    "templates.js",
    "signature.html",
    "styles.css",
    "landing.css",
    "landing.js",
    ".htaccess"
)

$dirsToUpload = @(
    "MailFooter Resources",
    "Resources",
    "api",
    "track",
    "database",
    "templates",
    "Signature Blueprints"
)

# FTP helper functions
function Create-RemoteDirectory($remoteDir) {
    $uri = "ftp://$ftpHost/$remoteDir"
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
    try {
        $response = $request.GetResponse()
        $response.Close()
        Write-Host "Created remote directory: $remoteDir" -ForegroundColor Green
    } catch {
        # Directory might already exist, ignore this exception
        # Code 550 is typical FTP code for action not taken (e.g. directory exists)
    }
}

function Upload-File($localFile, $remoteFile) {
    $uri = "ftp://$ftpHost/$remoteFile"
    $request = [System.Net.FtpWebRequest]::Create($uri)
    $request.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
    $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
    $request.UseBinary = $true
    $request.KeepAlive = $false
    
    Write-Host "Uploading $localFile to $remoteFile..." -NoNewline
    
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($localFile)
        $request.ContentLength = $fileBytes.Length
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($fileBytes, 0, $fileBytes.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        Write-Host " Done." -ForegroundColor Green
    } catch {
        Write-Host "`nError uploading $($localFile): $_" -ForegroundColor Red
    }
}

# Recursively upload directory
function Upload-Directory($localPath, $remoteBase) {
    $dirName = Split-Path $localPath -Leaf
    $remoteDir = "$remoteBase/$dirName"
    
    # Create this directory remote
    Create-RemoteDirectory $remoteDir
    
    # Upload files
    $childFiles = Get-ChildItem -Path $localPath -File
    foreach ($file in $childFiles) {
        if ($file.Extension -eq ".sqlite") {
            continue  # Skip local sqlite databases to protect production data
        }
        $localFile = $file.FullName
        $remoteFile = "$remoteDir/$($file.Name)"
        Upload-File $localFile $remoteFile
    }
    
    # Recurse into directories
    $childDirs = Get-ChildItem -Path $localPath -Directory
    foreach ($dir in $childDirs) {
        Upload-Directory $dir.FullName $remoteDir
    }
}

Write-Host "=== Starting MailFooter Deployment to GoDaddy ===" -ForegroundColor Cyan
Write-Host "Target Host: $ftpHost"
Write-Host "Target Folder: $remotePath"
Write-Host ""

# Ensure the base remote folder path exists by creating it or verifying
# If remotePath is nested, e.g. public_html/mailfooter, we need to create it level by level
$pathParts = $remotePath -split "/"
$currentPath = ""
foreach ($part in $pathParts) {
    if ($part) {
        if ($currentPath) {
            $currentPath = "$currentPath/$part"
        } else {
            $currentPath = $part
        }
        Create-RemoteDirectory $currentPath
    }
}

# 1. Upload root files
foreach ($file in $filesToUpload) {
    $localPath = Join-Path $PSScriptRoot $file
    if (Test-Path $localPath) {
        $remoteFilePath = "$remotePath/$file"
        Upload-File $localPath $remoteFilePath
    }
}

# 2. Upload directories
foreach ($dir in $dirsToUpload) {
    $localPath = Join-Path $PSScriptRoot $dir
    if (Test-Path $localPath) {
        Upload-Directory $localPath $remotePath
    }
}

Write-Host ""
Write-Host "=== Deployment Completed Successfully! ===" -ForegroundColor Green
Write-Host "Your application should be live at: https://os-holdings.co.za/mailfooter/" -ForegroundColor Cyan
