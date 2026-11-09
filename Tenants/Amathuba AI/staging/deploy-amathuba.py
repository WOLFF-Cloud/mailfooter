#!/usr/bin/env python3
# deploy-amathuba.py
# Automated deployment script to upload Amathuba AI Mailfooter files via FTP

import os
import json
import sys
import argparse
from ftplib import FTP

def main():
    parser = argparse.ArgumentParser(description="Deploy Amathuba AI Mailfooter Suite via FTP")
    parser.add_argument("--dry-run", action="store_true", help="Simulate upload without transferring files")
    parser.add_argument("--config", default="deploy-config-amathuba.json", help="Path to JSON config file")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, args.config)
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file '{args.config}' not found!")
        print("To deploy to production:")
        print("  1. Copy 'deploy-config-amathuba.json.example' to 'deploy-config-amathuba.json'")
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
    remote_path = config.get("remotePath", "public_html/mailfooter").strip("/")
    domain = config.get("domain", f"https://{host}/{remote_path}")

    if not args.dry_run and (user == "your_ftp_username" or passwd == "your_ftp_password"):
        print("Error: Please replace the placeholder FTP username/password in 'deploy-config-amathuba.json'.")
        sys.exit(1)

    files_to_upload = [
        "amathuba-light.html",
        "amathuba-light.css",
        "amathuba-light.js",
        "amathuba-signature.html"
    ]
    
    dirs_to_upload = [
        "assets"
    ]

    print("==================================================")
    print("  Amathuba AI Mailfooter Automated FTP Deployment")
    print("==================================================")
    print(f"Host:        {host}")
    print(f"User:        {user}")
    print(f"Destination: /{remote_path}")
    print(f"Live Domain: {domain}")
    print(f"Mode:        {'DRY RUN (No files transferred)' if args.dry_run else 'LIVE DEPLOYMENT'}")
    print("==================================================\n")

    if args.dry_run:
        print("[DRY RUN] Scanning files to upload:")
        for fn in files_to_upload:
            lp = os.path.join(script_dir, fn)
            print(f"  - File: {fn} ({os.path.getsize(lp)} bytes)" if os.path.exists(lp) else f"  - MISSING: {fn}")
        for dn in dirs_to_upload:
            dp = os.path.join(script_dir, dn)
            if os.path.exists(dp):
                items = os.listdir(dp)
                print(f"  - Directory: {dn}/ ({len(items)} assets)")
            else:
                print(f"  - MISSING DIRECTORY: {dn}/")
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
    for fn in files_to_upload:
        local_fp = os.path.join(script_dir, fn)
        if os.path.exists(local_fp):
            remote_fp = f"{remote_path}/{fn}".strip("/")
            upload_file(local_fp, remote_fp)
        else:
            print(f"Warning: File not found locally: {fn}")

    # 3. Upload assets
    for dn in dirs_to_upload:
        local_dp = os.path.join(script_dir, dn)
        if os.path.exists(local_dp):
            upload_dir_recursive(local_dp, remote_path)
        else:
            print(f"Warning: Directory not found locally: {dn}")

    try:
        ftp.quit()
    except Exception:
        ftp.close()

    print("\n==================================================")
    print("✓ Amathuba AI Deployment Completed Successfully!")
    print("==================================================")
    print("Live URLs to verify:")
    print(f"  - Light Suite Portal: {domain}/amathuba-light.html")
    print(f"  - Standalone Signature: {domain}/amathuba-signature.html")
    print("==================================================\n")

if __name__ == "__main__":
    main()
