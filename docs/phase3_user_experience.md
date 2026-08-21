# Phase 3: User Experience Documentation
## User & Tenant Onboarding Manual

This document details the user journey, login steps, signature creation interface, and installation instructions for standard employees and company administrators using MailFooter.

---

### 1. Company Registration Process (Tenant Admin)
Before employees can create signatures, the company administrator must register their organisation.

1. **Accessing Registration**: Navigate to `register.html` or click **Register Your Company** on the landing page.
2. **Company Profile**:
   * **Company Name**: The official trading name (e.g., *OS Holdings*).
   * **Corporate Email Domain**: The domain name used by employees (e.g., `osholdings.co.za`). 
     > [!IMPORTANT]
     > The corporate domain is used to auto-authorise employee access. Employees trying to build a signature with a different domain name will be blocked from using the company template.
3. **Subscription Tier Selection**: Select a plan based on active staff size:
   * **Starter**: 1-5 Users
   * **Team**: 6-20 Users
   * **Enterprise**: 21-50 Users
   * **Custom**: 51+ Users
4. **Administrator Account Details**: Enter the Administrator's Name, Work Email, and Contact Number. These credentials are used to access the Company Admin Dashboard (`admin.html`).
5. **Billing Preference**: Choose between **Request Invoice** (30-day terms) or **Credit Card Payment** (simulated via Paystack sandbox).
6. **Confirmation**: Click **Complete Registration**. The screen displays a loading animation as the tenant workspace is provisioned.

---

### 2. Login Process (Two-Role Portal)
Users access their portals by clicking **Login** in the top navigation bar of the landing page, which opens the **Glassmorphism Login Modal**.

#### Staff Member Login
1. Select the **Staff Member** tab in the login modal.
2. Enter your work email address (e.g., `samantha@os-holdings.co.za`). No password is required.
3. Click **Sign In**.
4. The system validates the email domain against active tenants. If authorized, the **Fullscreen Preloader** launches, welcoming the user with: *"Welcome to MailFooter for [Your Company Name]"*.

#### Company Administrator Login
1. Select the **Administrator** tab in the login modal.
2. Enter your administrator email and account password.
3. Click **Sign In**.
4. Upon successful validation, you are redirected to the Company Admin Dashboard (`admin.html`).

---

### 3. Staff Signature Builder Walkthrough (`app.html`)
The Signature Builder is designed to guide standard employees through creating their signatures.

```
┌───────────────────────────────────────┐
│              app.html                 │
├───────────────────┬───────────────────┤
│   Left Column     │   Right Column    │
│  (Details Form)   │ (Live Preview &   │
│                   │  Export Actions)  │
│ 1. Layout Select  │                   │
│ 2. Name & Title   │  [Live Preview]   │
│ 3. Contact Info   │   Desktop/Mobile  │
│ 4. Social Links   │                   │
│ 5. Marketing      │  [Export Buttons] │
│                   │  - Rich Copy      │
│                   │  - HTML Copy      │
│                   │                   │
│                   │  [Client Guides]  │
│                   │  - Outlook, Gmail │
└───────────────────┴───────────────────┘
```

#### Left Column: Details Form
1. **Choose Template**: Select the template design approved by your company.
2. **Personal Information**: Enter your Full Name, Job Title, and Department (Optional).
3. **Contact Details**: Enter your Phone Number and Email. 
   * *Note*: The **Website URL** field is marked **Admin Managed** and is locked/read-only for standard users.
4. **Social Networks**: Locked/read-only fields displaying pre-configured corporate social accounts (LinkedIn, Twitter, Facebook, Instagram, YouTube).
5. **Marketing Campaign**: A checkbox allows employees to toggle the corporate marketing banner. If checked, they select from the active campaigns assigned to their template.

#### Right Column: Preview & Export
* **Live Preview**: Re-renders in real-time as the user types. The **Desktop / Mobile** toggles show how the signature behaves on different screen sizes.
* **Export Options**:
   * **Copy Rich Signature**: Compiles the signature with images and links, copying it to the clipboard. *This is the recommended button for 99% of users.*
   * **Copy HTML Code**: Copies the raw compiled HTML block (useful for advanced setups or mail clients that require direct code input).

---

### 4. Client Installation Instructions
Once the signature is compiled, the employee follows the integrated guide below the export panel:

* **Outlook (Desktop)**:
  1. Click **Copy Rich Signature**.
  2. Open Outlook. Go to **File > Options > Mail > Signatures**.
  3. Click **New**, name the signature, and click inside the edit box.
  4. Press **Ctrl+V** to paste. Click **Save** and **OK**.
* **Gmail**:
  1. Click **Copy Rich Signature**.
  2. Open Gmail. Click the **Settings Cog > See all settings**.
  3. Scroll down to the **Signature** section. Click **Create new**.
  4. Paste into the signature box using **Ctrl+V**.
  5. Scroll to the bottom and click **Save Changes**.
* **Outlook Web (OWA)**:
  1. Click **Copy Rich Signature**.
  2. Log in to Outlook Web. Click **Settings Gear > View all Outlook settings**.
  3. Go to **Mail > Compose and reply > Email signature**.
  4. Paste into the editor using **Ctrl+V** and click **Save**.
* **Apple Mail**:
  1. Click **Copy Rich Signature**.
  2. Open Apple Mail. Go to **Mail > Settings > Signatures**.
  3. Select your account, click the **"+"** icon.
  4. **Uncheck** the option *"Always match my default message font"*.
  5. Paste into the edit box using **Cmd+V**.

---

### 5. Common Troubleshooting Steps

1. **"Invalid Email Domain" Error on Login**:
   * *Cause*: The user entered an email with a domain name that does not match their company's registered domain (e.g. `john@gmail.com` instead of `john@acme.com`).
   * *Solution*: The user must log in using their official corporate email address.
2. **Images Fail to Render (Red "X" or Broken Icons)**:
   * *Cause*: The email recipient's mail client blocks external images by default (standard security practice in Outlook).
   * *Solution*: The recipient must click *"Download Images"* or *"Trust Sender"*. MailFooter hosts all assets on high-bandwidth servers to ensure rapid rendering when permitted.
3. **Formatting Breaks After Pasting**:
   * *Cause*: The mail client's composer default paste setting is set to "Keep Text Only" instead of "Keep Source Formatting".
   * *Solution*: Use `Ctrl+V` and check the pop-up clipboard options to select **Keep Source Formatting** or **Merge Formatting**.
