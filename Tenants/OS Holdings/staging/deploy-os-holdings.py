#!/usr/bin/env python3
# deploy-os-holdings.py
# Automated deployment script to upload OS Holdings Mailfooter Suite via FTP

import os
import json
import sys
import argparse
from ftplib import FTP

def main():
    parser = argparse.ArgumentParser(description="Deploy OS Holdings Mailfooter Suite via FTP")
    parser.add_argument("--dry-run", action="store_true", help="Simulate upload without transferring files")
    parser.add_argument("--config", default="deploy-config-os-holdings.json", help="Path to JSON config file")
    args = parser.parse_args()

    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, args.config)
    
    if not os.path.exists(config_path):
        print(f"Error: Configuration file '{args.config}' not found!")
        print("To deploy to production:")
        print("  1. Copy 'deploy-config-os-holdings.json.example' to 'deploy-config-os-holdings.json'")
        print("  2. Fill in your FTP credentials.")
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

    if not args.dry_run and (user == "mailfooter@os-holdings.co.za" and passwd == "your_ftp_password"):
        print("Error: Please replace the placeholder password in 'deploy-config-os-holdings.json'.")
        sys.exit(1)

    files_to_upload = [
        ("light.html", "light.html"),
        ("light.html", "index.html"),
        ("light.css", "light.css"),
        ("light.js", "light.js"),
        ("signature.html", "signature.html"),
        (".htaccess", ".htaccess")
    ]

    print("==================================================")
    print("  OS Holdings Mailfooter Automated Deployment Suite")
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
        for dn in ["assets", "Resources", "MailFooter Resources", "Signature Blueprints"]:
            dp = os.path.join(script_dir, dn)
            if os.path.exists(dp):
                print(f"  - Directory: {dn}/ ({len(os.listdir(dp))} items)")
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

    def upload_file(local_path, remote_path_target):
        clean_target = remote_path_target.lstrip("/")
        print(f"Uploading {os.path.basename(local_path)} -> /{clean_target}... ", end="", flush=True)
        try:
            with open(local_path, "rb") as f:
                ftp.storbinary(f"STOR {clean_target}", f)
            print("OK")
        except Exception as e:
            print(f"ERROR: {e}")

    # Upload files
    for src_name, dest_name in files_to_upload:
        local_fp = os.path.join(script_dir, src_name)
        if os.path.exists(local_fp):
            remote_fp = f"{remote_path}/{dest_name}".strip("/") if remote_path else dest_name
            upload_file(local_fp, remote_fp)

    try:
        ftp.quit()
    except Exception:
        ftp.close()

    print("\n==================================================")
    print("✓ OS Holdings Deployment Completed Successfully!")
    print("==================================================")
    print("Live URLs to verify:")
    print(f"  - Portal Suite: {domain}/")
    print(f"  - Light Alias: {domain}/light")
    print(f"  - Signature Generator: {domain}/signature")
    print("==================================================\n")

if __name__ == "__main__":
    main()
