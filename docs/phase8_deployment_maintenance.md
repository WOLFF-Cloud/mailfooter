# Phase 8: Deployment & Maintenance
## System Release pipelines & Infrastructure Maintenance

This document provides developer and operations checklists for the development, deployment, rollback, and backup administration of the MailFooter platform.

---

### 1. Developer Workflows & Environments

#### Local Development Environment (Active)
Developers code and test features locally using a PHP development environment.
* **Local Web Server**: Run standard PHP development server:
  `php -S localhost:8000`
* **Local Database**: Local queries connect to a temporary SQLite database at `database/database.sqlite`.

#### Staging Environment (Staged Roadmap)
* **Current Protocol**: Pre-release checks are validated locally on `localhost`.
* **Future Protocol**: Implement a staging subdomain on GoDaddy (`staging.mailfooter.co.za`) to mirror the production environment.
* **Testing Pipeline**: Pushing commits to the staging branch will deploy to the staging subdomain for automated rendering checks across Outlook, Gmail, and Apple Mail clients.

#### Production Environment
* **Live Location**: GoDaddy shared hosting (migrating to VPS).
* **Live URL**: `https://os-holdings.co.za/mailfooter/` or `https://mailfooter.co.za/`.

---

### 2. Code Deployment Checklist (Production Release)

Deployments are automated using a Python script ([`deploy.py`](file:///c:/Users/Lennon%20Arends/Desktop/AntiGravity%20Apps/HTML%20Email%20Signatures/deploy.py)) which uploads code assets to GoDaddy via FTP.

#### Pre-Deployment Check:
1. Ensure the local workspace is clean and all tests pass.
2. Verify that [deploy-config.json](file:///c:/Users/Lennon%20Arends/Desktop/AntiGravity%20Apps/HTML%20Email%20Signatures/deploy-config.json) contains correct GoDaddy FTP credentials.
   * *Note*: Credentials must match the schema:
     ```json
     {
       "host": "your_godaddy_ftp_host",
       "username": "your_ftp_username",
       "password": "your_ftp_password",
       "remotePath": "public_html/mailfooter"
     }
     ```

#### Executing Deployment:
3. Run the deployment script via terminal:
   `python .\deploy.py`
4. The script executes the following stages:
   * Logs in to GoDaddy FTP.
   * Creates necessary remote directories (`MailFooter Resources`, `api`, `track`, etc.) if they do not exist.
   * Uploads primary frontend layout files and API/tracking PHP scripts.
   * **Database Protection**: The script automatically skips `.sqlite` files to protect live production user data from being overwritten by local development database templates.
5. Verify live deployment at: `https://mailfooter.co.za`.

---

### 3. Update Syncing & Canary Rollout Procedures
Once files are uploaded, changes must be propagated across the system.

1. **Flush Server Caches**: After deploying a design or template change, the administrator must trigger a **Force Core Refresh** inside the Super Admin Portal (`api/super_admin.php?action=push_update`). This forces email client caches to fetch the new HTML signature assets.
2. **Canary Rollout Staged Deployment**:
   * For major updates (e.g., changing the core template engine), log in to the Super Admin Dashboard and configure the Canary dial.
   * Set the rollout percentage (e.g., 10%, 25%, 50%, 100%).
   * The server serves the new update to the specified percentage of users, falling back to the stable v1.3.8 core for the rest, allowing real-time monitoring of logs for rendering failures.

---

### 4. Codebase Rollback Procedures (Hotfix Runbook)
If a critical bug or rendering issue occurs on production, execute one of the following rollback procedures:

#### Option A: Git Rollback (Recommended)
1. Revert to the last stable Git commit locally:
   `git checkout [last-stable-tag]`
2. Re-run the deployment script:
   `python .\deploy.py`
3. Verify that the production server renders the reverted version.

#### Option B: Server File Restoration (If FTP is Unresponsive)
1. Log in to the GoDaddy cPanel File Manager console.
2. Navigate to the `public_html/mailfooter` directory.
3. Upload the last stable codebase ZIP backup, extract it, and overwrite existing files.

---

### 5. Database Backup & Recovery Procedures

#### Backup Protocols
To prevent data loss, both automated and manual backup routines are enforced:
* **Automated (Daily)**: GoDaddy cPanel runs an automated daily backup of the entire web root, archiving the `database/database.sqlite` file.
* **Manual (On-Demand)**: Before running major updates or schema migrations, the administrator must download a database backup via the Super Admin Portal (`api/settings.php?action=backup` or clicking **Download DB Backup**).

#### Recovery Runbook (Database Restore)
In the event of database corruption or accidental deletion:
1. Identify the latest clean database backup file (named `database.sqlite` or similar).
2. Log in to GoDaddy cPanel File Manager, or connect via FTP.
3. Rename the current corrupted database file on the server to `database_corrupted.sqlite`.
4. Upload the clean backup file to the `/database/` folder and name it exactly `database.sqlite`.
5. Verify database integrity via the Super Admin Command Shell:
   `compact` (Executes SQLite compaction, vacuuming, and checks structure).
6. Verify that the Live Event Log displays historical open/click data correctly.
