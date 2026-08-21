# Phase 4: Administration Documentation
## Tenant Administrator Dashboard & System Controls

This document provides step-by-step instructions for managing a company tenant account using the **MailFooter Company Admin Dashboard** (`admin.html`).

---

### 1. Dashboard Overview & Real-Time Analytics
Upon logging in, the administrator is presented with the **Dashboard** tab, divided into telemetry metrics, recipient platforms, geolocation demographics, and live logs.

#### Key Telemetry Counters
* **Active Signatures**: The total number of registered employee accounts using signatures under the tenant's domain.
* **Total Email Opens**: The count of image loads (impressions) recorded for the company's logo.
* **Total Link Clicks**: The aggregated clicks on signatures (website, campaign banners, social links).
* **Average CTR**: The Click-Through Rate conversion ratio (`Clicks / Opens * 100`).

#### Reports & Visual Charts
1. **Recipient Platforms**: Horizontal breakdown bars indicating the device types (Desktop, Mobile, Tablet, Unknown) and mail client engines (Outlook, Gmail, Apple Mail, Web Browser / Other) used by email recipients.
2. **Demographics & Geolocation**: A list of the top cities and countries from which outbound emails are being opened. It uses secure, cached IP-to-location lookups.
3. **Live Event Log**: A rolling, live event stream displaying a timestamped feed of views and click events (e.g., *"Samantha Govender opened email from Johannesburg, ZA using Apple Mail"*).

---

### 2. Branding & Social Links Configuration
The **Branding & Socials** tab implements the **Branding Lock** feature, locking central brand guidelines for all employees.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BRANDING & SOCIALS SETTINGS                     │
├───────────────────────────────────┬────────────────────────────────────┤
│         1. Brand Assets           │         2. Social Links            │
│  [Company Name]   [Web URL]        │  [LinkedIn URL]   [Twitter/X URL]  │
│  [Slogan Tagline] [Logo Upload]    │  [Facebook URL]   [Instagram URL]  │
│  [Primary Color]  [Accent Color]   │  [YouTube URL]                     │
└───────────────────────────────────┴────────────────────────────────────┘
```

#### Step-by-Step Configuration:
1. Navigate to **Branding & Socials** in the sidebar navigation.
2. Under **Branding Assets**, fill in:
   * **Company Name**: The official title displayed in signatures.
   * **Company Website URL**: The target link when users click the corporate logo (e.g., `https://www.osholdings.com`).
   * **Default Slogan / Tagline**: The footer text (e.g., `Innovate | Excel | Grow`).
   * **Brand Colors**: Set the **Primary** and **Accent** colors using the hex color pickers.
   * **Corporate Logo & Brand Graphic**: Drag and drop logo files (PNG or JPG format) into the upload dropzones.
3. Under **Social Media Channels**, enter official corporate profile links.
4. Click **Save Settings** in the top right. Changes are immediately applied to the templates.

---

### 3. Campaign & Banner Manager
The **Create Campaign** tab manages the outbound marketing banners appended below employee signatures.

#### Step-by-Step Campaign Creation:
1. Navigate to **Create Campaign** in the sidebar.
2. Fill out the campaign details:
   * **Campaign Name**: An internal identifier (e.g., *Sage 300 Q2 Launch*).
   * **Target Signature Template**: Assign to a specific design layout, or select *Apply to All Templates*.
   * **Landing Target URL**: The redirect website destination when recipients click the banner.
3. **Sage Split Layout Toggle**:
   * If **disabled**, upload a single banner image matching the standard dimensions: **578px width by 101px height**.
   * If **enabled**, the banner divides into a split grid layout:
     * **Main Campaign Graphic**: Drag and drop a **416px x 101px** banner.
     * **Partner Badge**: Drag and drop a **162px x 56px** logo (e.g., *Sage Gold Partner*).
     * **CTA Button**: Drag and drop a **162px x 45px** clickable button graphic.
4. Click **Create Campaign**. The banner is saved to the inventory list.
5. To activate, navigate to **Asset Hub**, find the banner, and select **Activate**. This pushes the banner live across all employee signatures instantly.

---

### 4. Custom Template Importer
Administrators with custom HTML layouts can import designs and map dynamic user tags.

#### Step-by-Step Import:
1. Navigate to **Import Template** in the sidebar.
2. Enter a template name (e.g., *Executive Split Blueprint*).
3. Drag and drop your `.html` file, or paste raw HTML code into the editor box.
4. The system automatically scans the HTML code for tags and displays a **Mapping Table**:
   * `{name}` &rarr; Employee's Full Name.
   * `{title}` &rarr; Job Title.
   * `{dept}` &rarr; Department.
   * `{phone}` &rarr; Contact Number.
   * `{email}` &rarr; Business Email.
   * `{logo}` &rarr; Corporate Logo.
   * `{campaignImg}` &rarr; Marketing Campaign Banner.
   * `{campaignLink}` &rarr; Campaign Target Redirect.
5. Review the mappings. Correct any unresolved tags.
6. Click **Save Imported Template**. The layout is added to your company's signature options.

---

### 5. Staff Directory & Leaderboard
The **Staff Directory** tab provides employee user management.

* **Employee Leaderboard**: Displays all registered employees using the signature under your domain, ranked by the number of outbound clicks they have generated.
* **Searching Users**: Use the **Search members...** bar to filter staff by name, title, or email.
* **Editing Employee Details**:
  1. Click **Edit** next to the employee's name to open the sliding edit drawer.
  2. Modify details (Name, Job Title, Dept, Phone, or layout template assignment).
  3. Toggle the **Include Campaign** checkbox to enable or disable marketing banners for this specific user.
  4. Click **Save Changes**. The employee's signature is updated.
* **Deleting Users**: Click **Delete** next to the employee's name to revoke their signature. This deletes their record from the SQLite database.

---

### 6. Administrative System Controls
* **Core Update Push**: Click the profile dropdown and select **Sync Server Data** or **Force Core Refresh** to push changes to all live signatures, forcing mail client caches to refresh templates.
* **Database Backup**: Click **Download DB Backup** in the profile dropdown menu to download a ZIP/SQL dump of the current SQLite database partition.
* **Impersonation Mode**: For troubleshooting, the administrator can open an employee profile and simulate their signature view to verify rendering accuracy.
