# Phase 9: Third-Party Services
## External Dependencies & Vendor Risk Matrix

This document maps out all third-party services, APIs, CDNs, and libraries required to operate MailFooter, detailing their costs, owners, and risks.

---

### 1. Vendor Dependency & Cost Matrix

| Service Name | Purpose | Standard Cost / Commission | Renewal Frequency | Owner / Custodian | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GoDaddy** | Infrastructure hosting, domain registry, DNS hosting, and email servers. | ~R350 / month (SaaS VPS baseline) | Monthly | Lead SysAdmin (WOLFF) | **CRITICAL** |
| **Paystack** | Card payment processing, customer subscriptions, and invoices. | 1.5% + R2.00 per local card transaction (ex VAT) | Pay-as-you-use | Finance Director (WOLFF) | **HIGH** |
| **ip-api.com** | Geolocation parsing for recipient IP addresses in logs. | Free Tier (Rate limit: 45 req/min) | Ongoing | Lead Web Developer (WOLFF) | **LOW / MEDIUM** |
| **Google Fonts** | Professional web fonts (Outfit, Plus Jakarta Sans, Fira Code). | Free (Open Source) | N/A | Google Inc. | **LOW** |
| **Chart.js** | Admin panel performance data visualization CDNs. | Free (Open Source) | N/A | Chart.js Developers | **LOW** |

---

### 2. Detailed Dependency Risk Profiles & Mitigation

#### GoDaddy Infrastructure (Hosting, Domain, Email)
* **Purpose**: Serves all HTML/JS assets, runs PHP APIs, hosts the SQLite database, handles `/track/` redirect endpoints, and manages `support@mailfooter.co.za` emails.
* **Risk Scenario**: Server crash, network routing outage, or domain suspension.
* **Impact**: Total outage. The builder portal is inaccessible, and live signatures in sent emails fail to load logo/banner images or redirect clicked links.
* **Mitigation**:
  * Implement automated daily database backups via GoDaddy cPanel.
  * Keep code versioned on GitHub to enable rapid redeployment to a fallback hosting provider.
  * Plan migration to an independent GoDaddy Virtual Private Server (VPS) for higher resource allocation.

#### Paystack Payment Gateway
* **Purpose**: Manages multi-currency (ZAR/USD) card payments, webhook notifications, and automated billing activations.
* **Risk Scenario**: API timeout, webhook failure, or merchant account lock.
* **Impact**: New client registrations fail to activate automatically, and dashboard billing records do not update. Existing email signatures continue tracking impressions normally.
* **Mitigation**:
  * Provide manual invoice generation (`action=generate_invoice`) and account activation controls in the Super Admin Command Center.
  * Implement webhook retries and alert logs for failed transactions.

#### ip-api.com (IP Geolocation)
* **Purpose**: Resolves recipient IP addresses into city and country locations for analytics.
* **Risk Scenario**: Reaching the free rate limit (45 requests/minute) or API service downtime.
* **Impact**: The database logs geolocation data as `"Unknown, Unknown"`. All other telemetry (impressions, clicks, device/browser types) remains fully functional.
* **Mitigation**:
  * Cache IP results locally in the `ip_cache` table (implemented in `api/db.php`) to avoid querying the API for recurring IP addresses.
  * Upgrade to the **Pro Plan** (~$15/month for unlimited queries and HTTPS support) as tenant volume grows.

#### Google Fonts & Chart.js CDNs
* **Purpose**: Renders dashboard graphs and typography.
* **Risk Scenario**: CDN service failure or browser connection block.
* **Impact**: UI typography falls back to system sans-serif (Arial, Segoe UI). Analytics graphs do not render (displaying empty panels).
* **Mitigation**:
  * Core layout styling specifies robust sans-serif fallbacks.
  * Local tables and textual logging outputs remain operational if Chart.js fails.
