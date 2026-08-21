# Phase 12: Future Roadmap
## Strategic Goals & Engineering Milestones

This document details the planned features, database scaling goals, directory sync integrations, and AI design assistant roadmap for MailFooter, organized into short, medium, and long-term milestones.

---

### 1. Short-Term Milestones (1 - 3 Months)
*Focus: Resolving current functional gaps, UI polish, and automating tenant billing pipelines.*

* **CSV Directory Sync UI**: Implement the CSV directory importer in the Admin Staff Directory tab. The parser will read headers (`email`, `name`, `title`, `department`, `phone`) and batch insert them into the `users` table.
* **Production Paystack Webhook Integration**: Transition from simulated webhook endpoints (`simulate_paystack_webhook`) to real-time Paystack webhooks to automate card charging, renewals, and invoice generation.
* **Database Backup Automation**: Implement scheduled server-side cron jobs on GoDaddy to backup `database.sqlite` daily and push copies to external cloud storage (e.g., AWS S3).
* **Self-Service Password Recovery**: Add a secure "Forgot Password" mailer workflow for tenant administrators.

---

### 2. Medium-Term Milestones (3 - 6 Months)
*Focus: Eliminating user installation friction and enhancing marketing campaign analytics.*

* **Directory Synchronization (Microsoft 365 & Google Workspace)**: Integrate with Azure AD and Google Workspace APIs. When a new employee is added to the client's corporate directory, their signature details are automatically generated in MailFooter, removing the need for manual profile entry.
* **Outlook & Gmail Auto-Injection Add-ins**: Build MailFooter add-ins for Microsoft Outlook (Office Add-in manifest) and Google Workspace. This injects the signature directly into the user's composer window, removing the manual "Copy Rich Signature" installation step.
* **Multi-Brand Tenant Portals**: Allow a single client administrator to manage multiple sub-brands or domain configurations under a unified login.
* **Scheduled Analytics Email Reports**: Automate weekly or monthly PDF report mailers sent directly to tenant marketing teams, showing impressions, CTR, and top campaign ROI.

---

### 3. Long-Term Milestones (6 - 12 Months)
*Focus: Global infrastructure scaling and AI design tools.*

* **VPS Hosting & Database Migration**: Migrate the platform from GoDaddy Shared Hosting to an independent GoDaddy VPS Server. Transition the database engine from SQLite to a multi-write **PostgreSQL** cluster. This resolves SQLite file-locking concurrency risks during high-traffic email campaigns.
* **AI-Powered Campaign Banner Generator**: Integrate AI engines (e.g. OpenAI DALL-E) directly into the campaign manager. Administrators can write text prompts (e.g. *"Create a modern blue-themed banner for a Sage seminar"*) to generate, crop, and deploy banner graphics in seconds.
* **Mobile Campaign Control App**: Develop a mobile dashboard for administrators to change active campaign banners, monitor CTRs, and check live logs on the go.
