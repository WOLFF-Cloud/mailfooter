#!/usr/bin/env python3
# deploy-osba.py
# Automated deployment script to upload OS Business Amplifier (OSBA) Mailfooter Suite via FTP

import os
import json
import sys
import argparse
from ftplib import FTP

def main():
    parser = argparse.ArgumentParser(description="Deploy OSBA Mailfooter Suite via FTP")
    parser.add_argument("--dry-run", action="store_true", help="Simulate upload without transferring files")
    parser.add_argument("--config", default="deploy-config-osba.json", help="Path to JSON config file")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "../../.."))
    config_path = os.path.join(script_dir, args.config)
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file '{args.config}' not found!")
        print("To deploy to production:")
        print("  1. Copy 'deploy-config-osba.json.example' to 'deploy-config-osba.json'")
        print("  2. Fill in your FTP credentials and remote path.")
        print(f"  3. Run: python3 {os.path.basename(__file__)}")
        sys.exit(1)
        
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error parsing config file '{args.config}': {e}")
        sys.exit(1)
        
    host = config.get("host")
    user = config.get("username")
    passwd = config.get("password")
    remote_path = config.get("remotePath", "").strip("/")
    domain = config.get("domain", f"https://{host}/{remote_path}").rstrip("/")

    if not args.dry_run and (user == "mailfooter@osbusinessamp.com" and passwd == "your_ftp_password"):
        print("Error: Please replace the placeholder password in 'deploy-config-osba.json'.")
        sys.exit(1)

    files_to_upload = [
        ("osba-light.html", "index.html"),
        ("osba-light.html", "osba-light.html"),
        ("osba-light.css", "osba-light.css"),
        ("osba-light.js", "osba-light.js"),
        ("osba-signature.html", "osba-signature.html")
    ]

    print("==================================================")
    print("  OSBA Mailfooter Automated Deployment Suite")
    print("==================================================")
    print(f"Host:        {host}")
    print(f"User:        {user}")
    print(f"Destination: /{remote_path}")
    print(f"Live Domain: {domain}")
    print(f"Mode:        {'DRY RUN (No files transferred)' if args.dry_run else 'LIVE DEPLOYMENT'}")
    print("==================================================\n")

    if args.dry_run:
        print("[DRY RUN] Scanning files to upload:")
        for src_name, dest_name in files_to_upload:
            lp = os.path.join(script_dir, src_name)
            print(f"  - File: {src_name} -> {dest_name} ({os.path.getsize(lp)} bytes)" if os.path.exists(lp) else f"  - MISSING: {src_name}")
        assets_dp = os.path.join(script_dir, "assets")
        if os.path.exists(assets_dp):
            print(f"  - Directory: assets/ ({len(os.listdir(assets_dp))} assets)")
        print("\nDry run completed successfully. Run without --dry-run to upload.")
        return

    print(f"Connecting to {host}...")
    try:
        ftp = FTP(host, timeout=30)
        ftp.login(user, passwd)
        print(f"Authenticated as {user} successfully.\n")
    except Exception as e:
        print(f"FTP Connection Failed: {e}")
        sys.exit(1)

    def ensure_remote_dir(path):
        parts = path.split("/")
        current = ""
        for part in parts:
            if not part:
                continue
            current = f"{current}/{part}" if current else part
            try:
                ftp.mkd(current)
                print(f"Created remote folder: /{current}")
            except Exception:
                pass

    def upload_file(local_path, remote_path_target):
        clean_target = remote_path_target.lstrip("/")
        print(f"Uploading {os.path.basename(local_path)} -> /{clean_target}... ", end="", flush=True)
        try:
            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {clean_target}", f)
            print("OK")
        except Exception as e:
            print(f"ERROR: {e}")

    def upload_dir_recursive(local_dir, remote_base):
        dir_name = os.path.basename(local_dir)
        target_remote_dir = f"{remote_base}/{dir_name}".strip("/")
        ensure_remote_dir(target_remote_dir)
        
        for item in sorted(os.listdir(local_dir)):
            if item.startswith("."):
                continue
            local_item = os.path.join(local_dir, item)
            remote_item = f"{target_remote_dir}/{item}".strip("/")
            if os.path.isfile(local_item):
                upload_file(local_item, remote_item)
            elif os.path.isdir(local_item):
                upload_dir_recursive(local_item, target_remote_dir)

    # 1. Ensure target remote path
    if remote_path:
        ensure_remote_dir(remote_path)

    # 2. Upload staging files
    for src_name, dest_name in files_to_upload:
        local_fp = os.path.join(script_dir, src_name)
        if os.path.exists(local_fp):
            remote_fp = f"{remote_path}/{dest_name}".strip("/") if remote_path else dest_name
            upload_file(local_fp, remote_fp)

    # 3. Upload .htaccess
    htaccess_content = (
        "DirectoryIndex amathuba-light.html index.html index.php osba-light.html\n\n"
        "RewriteEngine On\n"
        "RewriteCond %{REQUEST_FILENAME} -f [OR]\n"
        "RewriteCond %{REQUEST_FILENAME} -d\n"
        "RewriteRule ^ - [L]\n\n"
        "RewriteRule ^$ osba-light.html [L,QSA]\n"
        "RewriteRule ^light/?$ osba-light.html [L,QSA]\n"
        "RewriteRule ^signature/?$ osba-signature.html [L,QSA]\n"
        "RewriteRule ^api/([a-zA-Z0-9_-]+)/?$ api/$1.php [L,QSA]\n"
        "RewriteRule ^track/([a-zA-Z0-9_-]+)/?$ track/$1.php [L,QSA]\n"
    )
    ht_path = os.path.join(script_dir, ".htaccess")
    with open(ht_path, "w") as f:
        f.write(htaccess_content)
    upload_file(ht_path, f"{remote_path}/.htaccess".strip("/") if remote_path else ".htaccess")

    # 4. Upload assets
    assets_dir = os.path.join(script_dir, "assets")
    if os.path.exists(assets_dir):
        upload_dir_recursive(assets_dir, remote_path)

    # 5. Upload api directory from project root
    api_dir = os.path.join(project_root, "api")
    if os.path.exists(api_dir):
        upload_dir_recursive(api_dir, remote_path)

    # 6. Ensure database folder exists
    db_remote = f"{remote_path}/database".strip("/") if remote_path else "database"
    ensure_remote_dir(db_remote)

    try:
        ftp.quit()
    except Exception:
        ftp.close()

    print("\n==================================================")
    print("✓ OSBA Deployment Completed Successfully!")
    print("==================================================")
    print("Live URLs to verify:")
    print(f"  - Light Suite Portal: {domain}/")
    print(f"  - Direct Light Alias: {domain}/light")
    print(f"  - Standalone Signature: {domain}/signature")
    print("==================================================\n")

if __name__ == "__main__":
    main()
