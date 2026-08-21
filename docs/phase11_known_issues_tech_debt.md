# Phase 11: Known Issues & Technical Debt
## Developer Bug Register & Refactoring Guidelines

This document details known bugs, security considerations, and architectural limitations in MailFooter, along with workarounds to assist future developers.

---

### 1. Known Issues & Operational Workarounds

#### Local Browser Protocol Lock (`file://`)
* **Bug**: Opening the Admin Dashboard (`admin.html`) or the Builder (`app.html`) directly in a web browser using the `file://` protocol results in CORS failures. This blocks all API data fetching, and the dashboard displays empty states.
* **Workaround**: The frontend includes a protocol sensor banner (`#protocolWarning`). If it detects `file://`, it displays: *"Local File Mode: You are viewing this dashboard via file://. Run a local server (e.g. php -S localhost:8000) or deploy to GoDaddy to see live analytics."*
* **Resolution**: Developers must run a local web server to test database features.

#### SQLite Concurrency & Database Write Locks
* **Bug**: SQLite relies on file-level write locking. In a high-volume outbound email campaign, many recipients may open emails or click links at the same time. This concurrent write load on the database can cause SQLite write conflicts, returning a *"Database is locked"* error.
* **Workaround**: The telemetry endpoints in [`click.php`](file:///c:/Users/Lennon%20Arends/Desktop/AntiGravity%20Apps/HTML%20Email%20Signatures/track/click.php) and [`open.php`](file:///c:/Users/Lennon%20Arends/Desktop/AntiGravity%20Apps/HTML%20Email%20Signatures/track/open.php) wrap database insertions in `try-catch` blocks and fail silently. 
* **Impact**: If a write fails, the open or click event is not logged in the database, but the image renders and the link redirect still works for the recipient.
* **Future Resolution**: Migrate the database to a multi-write engine (e.g. MySQL or PostgreSQL) when moving to GoDaddy VPS hosting.

#### Rate-Limiting on Geolocation API (`ip-api.com`)
* **Bug**: The geolocation lookup in [`stats.php`](file:///c:/Users/Lennon%20Arends/Desktop/AntiGravity%20Apps/HTML%20Email%20Signatures/api/stats.php) uses the free tier of `ip-api.com`. This tier is rate-limited to **45 requests per minute** and does not support HTTPS.
* **Workaround**: An `ip_cache` table stores resolved IP addresses. If an IP address has opened an email before, its location is fetched from the local cache instead of query-rate hitting the API.
* **Failover**: If the rate limit is exceeded or the API is offline, the location defaults to `"Unknown, Unknown"`.
* **Resolution**: Purchase a premium SSL API key from `ip-api.com` for production VPS deployments.

---

### 2. Technical Debt & Pending Features

#### Missing CSV Directory Sync Button
* **Description**: The landing page lists "CSV Directory Sync" as a key capability, but there is no file upload input or parser logic for CSV staff lists in `admin.html`.
* **Current Status**: Standard users must enter their profile details manually via the preloader onboarding screen.
* **Workaround**: Admins can import staff details directly into the database using SQLite client tools or custom scripting.

#### Mock Billing Verification
* **Description**: The billing engine simulates Paystack transactions. The webhooks (`action=simulate_paystack_webhook`) and invoices (`action=generate_invoice`) are mock functions.
* **Current Status**: The sandbox simulates credit card payments and webhooks to update client statuses to `active`.
* **Workaround**: Admin accounts can be manually activated or suspended using the Super Admin dashboard or command shell.

#### Lack of Password Reset Mailer
* **Description**: There is no automated password recovery flow for tenant administrators.
* **Workaround**: Password adjustments or admin account recovery must be handled manually by a WOLFF Super Admin editing the `clients` table.
