# Phase 6: Database Documentation
## Relational Schema Dictionary & Analytics Data Storage

This document details the SQLite database structure used by MailFooter, providing table dictionaries, relationship mappings, and data flow pathways.

---

### 1. Database Overview
MailFooter uses a single-file relational database: `database/database.sqlite`. 
* **Driver**: PDO SQLite
* **Referential Integrity**: Enforced via foreign key constraints (`PRAGMA foreign_keys = ON;`).
* **Multi-Tenancy Partitioning**: Segmented logically by the domain suffix of user emails matching the `domain` column in the `clients` table.

---

### 2. Entity Relationship Diagram (Conceptual)
```
  ┌──────────────────┐               ┌───────────────┐
  │     clients      │1             *│   invoices    │
  │  (domain - PK)   ├──────────────>│(client_domain)│
  └────────┬─────────┘               └───────────────┘
           │1
           │* (Domain partition)
  ┌────────▼─────────┐1             *┌───────────────┐
  │      users       ├──────────────>│     opens     │
  │   (email - PK)   │               │(email, camp_id)│
  └────────┬─────────┘               └───────▲───────┘
           │1                                │*
           │* (Tracked user)                 │
  ┌────────▼─────────┐*             1┌───────┴───────┐
  │     clicks       │<──────────────┤   campaigns   │
  │(email, dest, ip) │               │   (id - PK)   │
  └──────────────────┘               └───────────────┘
```

---

### 3. Detailed Schema Dictionary

#### Table 1: `clients`
* **Plain English Purpose**: Stores the tenant account configuration, metadata, subscription status, and billing details for each registered company.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique ID (e.g. `client_osholdings`). |
| `name` | TEXT | NOT NULL | Registered name of the company. |
| `domain` | TEXT | NOT NULL, UNIQUE | Primary web domain (e.g. `osholdings.co.za`). |
| `plan` | TEXT | NOT NULL | Active subscription tier (`starter`, `team`, `enterprise`, `custom`). |
| `status` | TEXT | DEFAULT 'active' | Account state (`active`, `suspended`, `pending`). |
| `billing_cycle` | TEXT | DEFAULT 'annual' | Billing frequency (`annual`, `monthly`). |
| `price` | REAL | DEFAULT 0 | Amount paid per cycle. |
| `admin_name` | TEXT | NOT NULL | Contact name of the tenant admin. |
| `admin_email` | TEXT | NOT NULL | Contact email of the tenant admin. |
| `admin_phone` | TEXT | - | Admin contact phone. |
| `remote_token` | TEXT | NOT NULL | Access token used for API authorizations. |
| `notes` | TEXT | - | Administrative comments. |
| `suspended_at` | DATETIME | - | Timestamp of account suspension (null if active). |
| `last_update_pushed`| DATETIME | - | Timestamp of last manual design sync. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date client was created. |

---

#### Table 2: `users`
* **Plain English Purpose**: Stores employee profiles, including personal contact details and their signature layout assignment.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `email` | TEXT | PRIMARY KEY | Employee's business email. |
| `name` | TEXT | NOT NULL | Employee's full name. |
| `title` | TEXT | NOT NULL | Employee's official job title. |
| `department` | TEXT | - | Employee's department. |
| `phone` | TEXT | - | Employee's direct phone number. |
| `template` | TEXT | - | Assigned signature layout template ID. |
| `campaign_enabled` | INTEGER | DEFAULT 0 | Boolean flag (0/1) to include promo banners. |
| `campaign_id` | TEXT | - | Assigned marketing campaign ID. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date employee profile was created. |

---

#### Table 3: `campaigns`
* **Plain English Purpose**: Stores the marketing banners, CTA buttons, and redirect targets uploaded by administrators.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique ID (e.g. `sage300_ad`). |
| `name` | TEXT | NOT NULL | Internal campaign name. |
| `image_main` | TEXT | NOT NULL | Path to main banner graphic (578x101px or 416x101px). |
| `image_partner` | TEXT | - | Path to Sage partner logo (optional). |
| `image_button` | TEXT | - | Path to action CTA button graphic (optional). |
| `target_link` | TEXT | NOT NULL | Destination URL for the redirection. |
| `is_active` | INTEGER | DEFAULT 0 | Status flag (0 = inactive, 1 = active). |
| `template_id` | TEXT | DEFAULT 'all' | Filters campaign to specific layouts. |
| `client_domain` | TEXT | - | Domain owner of the campaign asset. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Campaign creation timestamp. |

---

#### Table 4: `opens`
* **Plain English Purpose**: Telemetry log recording outbound email views (logo impressions).
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique log ID. |
| `email` | TEXT | - | Email address of the sender. |
| `campaign_id` | TEXT | - | Campaign banner displayed (if any). |
| `user_agent` | TEXT | - | Browser/Client user agent string of the recipient. |
| `ip_address` | TEXT | - | IP address of the recipient. |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Time of email open. |

---

#### Table 5: `clicks`
* **Plain English Purpose**: Telemetry log recording clicks on signature links or banners.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique log ID. |
| `email` | TEXT | - | Email address of the sender. |
| `link_id` | TEXT | - | Clicked item (`website`, `campaign_banner`, `linkedin`, etc.). |
| `destination` | TEXT | - | Redirect destination URL. |
| `user_agent` | TEXT | - | Browser/Client user agent string of the recipient. |
| `ip_address` | TEXT | - | IP address of the recipient. |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Time of click event. |

---

#### Table 6: `ip_cache`
* **Plain English Purpose**: Geolocation lookup cache to prevent spamming external geolocation APIs.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `ip` | TEXT | PRIMARY KEY | IP address. |
| `country` | TEXT | NOT NULL | Country name / ISO code. |
| `city` | TEXT | NOT NULL | City name. |
| `lat` | REAL | - | Latitude coordinate. |
| `lon` | REAL | - | Longitude coordinate. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Date cached. |

---

#### Table 7: `templates`
* **Plain English Purpose**: Stores default layouts and custom HTML signature designs.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique ID (e.g. `db-default`). |
| `name` | TEXT | NOT NULL | Display name of layout style. |
| `html_content` | TEXT | NOT NULL | Raw HTML template containing replacement tags. |
| `client_domain` | TEXT | - | Tenant domain restriction (null if global). |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Template created date. |

---

#### Table 8: `invoices`
* **Plain English Purpose**: Ledger of billing history, mock invoices, and payment references.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique invoice ID (e.g. `inv_1`). |
| `client_domain` | TEXT | NOT NULL | Tenant domain mapped. |
| `amount` | REAL | NOT NULL | Invoice cost. |
| `currency` | TEXT | DEFAULT 'ZAR' | Currency code (`ZAR` or `USD`). |
| `status` | TEXT | DEFAULT 'pending' | Status (`paid`, `pending`, `overdue`). |
| `issued_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Invoice issue date. |
| `due_at` | DATETIME | - | Invoice due date. |
| `paid_at` | DATETIME | - | Payment timestamp. |
| `paystack_reference`| TEXT | - | Paystack verification token. |

---

#### Table 9: `price_plans`
* **Plain English Purpose**: Master list of pricing packages and features.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `plan_id` | TEXT | PRIMARY KEY | Plan ID (`starter`, `team`, `enterprise`, `custom`). |
| `name` | TEXT | NOT NULL | Public display name of plan. |
| `max_users` | INTEGER | NOT NULL | Maximum users permitted. |
| `price_zar_annual` | REAL | NOT NULL | Annual ZAR cost. |
| `price_zar_monthly` | REAL | NOT NULL | Monthly ZAR cost. |
| `price_usd_annual` | REAL | NOT NULL | Annual USD cost. |
| `price_usd_monthly` | REAL | NOT NULL | Monthly USD cost. |
| `features` | TEXT | - | CSV of features enabled. |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp. |

---

#### Table 10: `audit_logs`
* **Plain English Purpose**: Global SaaS audit trail recording Super Admin actions.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique log ID. |
| `action` | TEXT | NOT NULL | Audit event (e.g., *Suspended Account: apexfinance.co.za*). |
| `target` | TEXT | - | Target client domain or plan code. |
| `ip_address` | TEXT | - | Admin's IP address. |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Log timestamp. |

---

#### Table 11: `settings`
* **Plain English Purpose**: Global system variables and tenant customization settings.
* **Fields**:

| Field | Data Type | Key / Constraint | Description |
| :--- | :--- | :--- | :--- |
| `setting_key` | TEXT | PRIMARY KEY | System parameter name. |
| `setting_value` | TEXT | - | Parameter value. |
