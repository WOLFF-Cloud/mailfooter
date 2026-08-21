const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Starting MailFooter Automated Deployment ===\n');

const configFile = path.join(__dirname, 'deploy-config.json');
if (!fs.existsSync(configFile)) {
  console.error('Error: deploy-config.json not found!');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
const host = config.host;
const user = config.username;
const pass = config.password;
const rawRemote = (config.remotePath || '').trim().replace(/^\/+|\/+$/g, '');

const filesToUpload = [
  'index.html',
  'app.html',
  'light.html',
  'light.css',
  'light.js',
  'register.html',
  'admin.html',
  'super-admin.html',
  'landing-index.html',
  'script.js',
  'templates.js',
  'signature.html',
  'styles.css',
  'landing.css',
  'landing.js',
  '.htaccess',
  'router.php'
];

const dirsToUpload = [
  'MailFooter Resources',
  'Resources',
  'api',
  'track',
  'database',
  'templates',
  'Signature Blueprints'
];

// Collect all files recursively
function getFilesRecursively(dir, baseDir = '') {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const relativePath = path.join(baseDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, relativePath));
    } else {
      if (!file.endsWith('.sqlite')) {
        results.push({ local: filePath, relative: relativePath.replace(/\\/g, '/') });
      }
    }
  }
  return results;
}

const allUploads = [];

// Add root files
for (const file of filesToUpload) {
  const localPath = path.join(__dirname, file);
  if (fs.existsSync(localPath)) {
    allUploads.push({ local: localPath, relative: file });
  }
}

// Add directories
for (const dir of dirsToUpload) {
  const localDir = path.join(__dirname, dir);
  if (fs.existsSync(localDir)) {
    const dirFiles = getFilesRecursively(localDir, dir);
    allUploads.push(...dirFiles);
  }
}

const targetPaths = [rawRemote];

console.log(`Found ${allUploads.length} files to deploy.`);
console.log(`Target Host: ${host}`);
console.log(`Remote Destinations: ${targetPaths.map(p => p || '(root)').join(', ')}\n`);

let successCount = 0;
let failCount = 0;

for (const targetPath of targetPaths) {
  console.log(`\n>>> Uploading to: ${targetPath || '(root)'} ...`);
  for (let i = 0; i < allUploads.length; i++) {
    const item = allUploads[i];
    const encodedRelative = item.relative.split('/').map(p => encodeURIComponent(p)).join('/');
    const remoteUrl = targetPath
      ? `ftp://${host}/${targetPath}/${encodedRelative}`
      : `ftp://${host}/${encodedRelative}`;
    const progress = `[${i + 1}/${allUploads.length}]`;
    process.stdout.write(`${progress} Uploading ${item.relative} ... `);

    try {
      // Use curl.exe with --ftp-create-dirs
      execSync(
        `curl.exe -s --ftp-create-dirs -u "${user}:${pass}" -T "${item.local}" "${remoteUrl}"`,
        { stdio: 'pipe', timeout: 30000 }
      );
      console.log('OK');
      successCount++;
    } catch (err) {
      console.log('FAILED');
      console.error(`  Error: ${err.message}`);
      failCount++;
    }
  }
}

console.log(`\n=== Deployment Complete ===`);
console.log(`Success: ${successCount} uploads`);
console.log(`Failed: ${failCount} uploads`);
console.log(`\nLive URLs to verify:`);
console.log(`- https://os-holdings.co.za/mailfooter/app.html`);
console.log(`- https://os-holdings.co.za/mailfooter/light.html`);
