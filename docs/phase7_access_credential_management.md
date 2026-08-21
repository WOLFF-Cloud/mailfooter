# Phase 7: Access & Credential Management
## Infrastructure Access Registry & Security Governance

This document serves as the central register of all infrastructure, domain, DNS, repository, and payment assets required to operate MailFooter.

> [!CAUTION]
> **Security Policy**: Under no circumstances should plain-text passwords or API secret keys be stored in this file. This register documents only ownership, access locations, console URLs, and credential holders.

---

### 1. Master Infrastructure Asset Registry

| System / Asset | Provider / Platform | Account Owner | Access Location / URL | Credential Custodian |
| :--- | :--- | :--- | :--- | :--- |
| **SaaS Web Hosting** | GoDaddy Shared Hosting / VPS | WOLFF Operations Team | [GoDaddy Gateway Console](https://gateway.godaddy.com) | Lead SysAdmin (WOLFF) |
| **Domain Registration**| GoDaddy Registrar | WOLFF Operations Team | [GoDaddy Domain Manager](https://dcc.godaddy.com) | Lead SysAdmin (WOLFF) |
| **DNS Management** | GoDaddy DNS | WOLFF Operations Team | [GoDaddy DNS Console](https://dns.godaddy.com) | Lead SysAdmin (WOLFF) |
| **SSL / TLS Certificate**| GoDaddy AutoSSL | System Automated | GoDaddy cPanel AutoSSL | Auto-Renew (cPanel) |
| **Source Code Repo** | GitHub | WOLFF Cloud Solutions | [GitHub Repo Link](https://github.com/wolff-cloud/mailfooter) | Technical Director |
| **Payment Gateway** | Paystack (South Africa) | WOLFF Billing Dept | [Paystack Dashboard](https://dashboard.paystack.com) | Finance Director (WOLFF) |
| **Email Server Hosting**| GoDaddy Mail Server | WOLFF Support Desk | [GoDaddy Webmail Portal](https://email.godaddy.com) | Helpdesk Lead |

---

### 2. Domain & DNS Specifications
The main application runs on `mailfooter.co.za` (and subdomains / tracking endpoints). DNS records are managed within the GoDaddy DNS Management console.

#### Required Active DNS Records:

| Record Type | Host / Name | Value / Destination | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `@` (Root) | `[GoDaddy Server IP]` | 1 Hour | Routes root domain traffic to GoDaddy webserver. |
| **CNAME** | `www` | `mailfooter.co.za` | 1 Hour | Aliases www traffic to root domain. |
| **TXT** | `@` | `v=spf1 include:secureserver.net ~all` | 1 Hour | SPF record authorizing GoDaddy servers to send email. |
| **MX** | `@` | `mailstore1.secureserver.net` (Priority 10)<br>`mailstore2.secureserver.net` (Priority 20) | 1 Hour | Routes incoming email to GoDaddy email servers. |

---

### 3. Payment Gateway Credentials (Paystack)
Integration keys are maintained inside the server's environment configuration or loaded via settings.
* **Sandbox Console**: `https://dashboard.paystack.com/#/dashboard`
* **API Key Registry Location**: Configured dynamically inside the private PHP settings config on GoDaddy (loaded via PHP environment variables).
* **Payment Webhook Endpoint**: `https://mailfooter.co.za/api/super_admin.php?action=simulate_paystack_webhook`

---

### 4. Git Repository Access Management
The source code is hosted on a private GitHub repository: `github.com/wolff-cloud/mailfooter`.
* **Access Control**: MFA (Multi-Factor Authentication) is mandatory for all developer accounts.
* **Branch Protection Rules**: The `main` branch is protected. Direct pushes are disabled. All changes must be pushed via pull requests (PRs) requiring review from a Senior Technical Lead.

---

### 5. Access Audit Checklist (Quarterly COO Duties)
To maintain security compliance, the COO must audit this register every **90 days**:
1. **Revoke Terminated Staff**: Ensure all developers or support staff offboarded from WOLFF in the last quarter have their GitHub, GoDaddy, and Paystack access revoked.
2. **Review DNS Changes**: Verify no unauthorized A records or TXT modifications exist in GoDaddy.
3. **Verify SSL Status**: Check that the GoDaddy AutoSSL shows as "Active" and has not failed renewal.
4. **Audit Audit Logs**: View the `audit_logs` database table for unexpected admin or CLI shell activity.
