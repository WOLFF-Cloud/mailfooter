#!/usr/bin/env python3
# deploy.py
# Automated deployment script to upload MailFooter signature files to GoDaddy via FTP

import os
import json
import sys
from ftplib import FTP

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "deploy-config.json")
    
    if not os.path.exists(config_path):
        print("Error: Configuration file 'deploy-config.json' not found!")
        print("To resolve this:")
        print("  1. Copy 'deploy-config.json.example' to 'deploy-config.json'")
        print("  2. Edit 'deploy-config.json' with your GoDaddy FTP credentials.")
        sys.exit(1)
        
    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except Exception as e:
        print(f"Error parsing 'deploy-config.json': {e}")
        sys.exit(1)
        
    if config.get("username") == "your_ftp_username" or config.get("password") == "your_ftp_password":
        print("Error: You need to edit 'deploy-config.json' with your actual FTP credentials.")
        sys.exit(1)
        
    host = config.get("host")
    user = config.get("username")
    passwd = config.get("password")
    remote_path = config.get("remotePath", "").strip("/")
    
    files_to_upload = [
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
    ]
    
    dirs_to_upload = [
        "MailFooter Resources",
        "Resources",
        "api",
        "track",
        "database",
        "templates",
        "Signature Blueprints"
    ]
    
    print(f"=== Starting MailFooter Deployment to GoDaddy ===")
    print(f"Target Host: {host}")
    print(f"Target Folder: {remote_path}")
    print()
    
    try:
        ftp = FTP(host)
        ftp.login(user, passwd)
        print("Connected and logged in successfully.")
    except Exception as e:
        print(f"FTP Connection Error: {e}")
        sys.exit(1)
        
    # Helper to recursively create directory remote
    def ensure_remote_dir(path):
        parts = path.split("/")
        current = ""
        for part in parts:
            if not part:
                continue
            current = f"{current}/{part}" if current else part
            try:
                ftp.mkd(current)
                print(f"Created remote directory: {current}")
            except Exception:
                # Directory probably exists, ignore
                pass
 
    def upload_file(local_file_path, remote_file_path):
        print(f"Uploading {local_file_path} to {remote_file_path}... ", end="", flush=True)
        try:
            with open(local_file_path, "rb") as f:
                ftp.storbinary(f"STOR {remote_file_path}", f)
            print("Done.")
        except Exception as e:
            print(f"\nError uploading {local_file_path}: {e}")
 
    def upload_directory(local_dir_path, remote_base):
        dir_name = os.path.basename(local_dir_path)
        remote_dir = f"{remote_base}/{dir_name}"
        ensure_remote_dir(remote_dir)
        
        for item in os.listdir(local_dir_path):
            if item.endswith(".sqlite"):
                continue  # Skip local sqlite databases to protect production data
            local_item = os.path.join(local_dir_path, item)
            remote_item = f"{remote_dir}/{item}"
            if os.path.isfile(local_item):
                upload_file(local_item, remote_item)
            elif os.path.isdir(local_item):
                upload_directory(local_item, remote_dir)

    # Ensure root remote path exists
    ensure_remote_dir(remote_path)
    
    # 1. Upload files
    for file_name in files_to_upload:
        local_file = os.path.join(script_dir, file_name)
        if os.path.exists(local_file):
            remote_file = f"{remote_path}/{file_name}"
            upload_file(local_file, remote_file)
            
    # 2. Upload directories
    for dir_name in dirs_to_upload:
        local_dir = os.path.join(script_dir, dir_name)
        if os.path.exists(local_dir):
            upload_directory(local_dir, remote_path)
            
    try:
        ftp.quit()
    except Exception:
        ftp.close()
        
    print()
    print("=== Deployment Completed Successfully! ===")
    print("Your application should be live at: https://os-holdings.co.za/mailfooter/")

if __name__ == "__main__":
    main()
