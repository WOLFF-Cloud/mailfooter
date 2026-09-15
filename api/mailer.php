<?php
// api/mailer.php
// MailFooter Enterprise Email Notification Subsystem
// Handles responsive HTML email generation, delivery via PHP mail(), and SQLite logging.

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Client-Impersonate');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/db.php';

// Helper to determine base portal URL dynamically
function getAppBaseUrl() {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || ($_SERVER['SERVER_PORT'] ?? 80) == 443) ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8000';
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $dir = dirname(dirname($script));
    if ($dir === '/' || $dir === '\\') $dir = '';
    return rtrim($protocol . $host . $dir, '/');
}

/**
 * Render Branded Welcome Email HTML
 */
function renderWelcomeEmail($companyName, $domain, $adminName, $adminEmail, $planName, $price, $billingCycle, $invoiceId, $baseUrl = null) {
    if (!$baseUrl) $baseUrl = getAppBaseUrl();
    $adminUrl = $baseUrl . '/admin.html';
    $appUrl = $baseUrl . '/app.html';
    $portalUrl = $baseUrl . '/index.html';
    $year = date('Y');
    $formattedPrice = number_format($price, 2);

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MailFooter - {$companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 40px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 20px; color: #60a5fa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
                      Corporate Tenant Provisioned
                    </div>
                    <h1 style="color: #ffffff; font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.5px;">Welcome to MailFooter</h1>
                    <p style="color: #94a3b8; font-size: 14px; margin: 0;">Your centralized corporate email signature platform is live.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="font-size: 16px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Hello <strong>{$adminName}</strong>,
              </p>
              <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 26px 0;">
                Thank you for registering <strong>{$companyName}</strong> on MailFooter. Your dedicated tenant environment has been configured with enterprise isolation, automated signature templates, and tracking analytics.
              </p>

              <!-- Tenant Info Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 28px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px 22px; border-bottom: 1px solid #e2e8f0;">
                    <strong style="color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Tenant Configuration Summary</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 22px;">
                    <table width="100%" border="0" cellpadding="4" cellspacing="0" style="font-size: 13.5px; color: #334155;">
                      <tr>
                        <td width="38%" style="color: #64748b; font-weight: 500;">Organization:</td>
                        <td style="font-weight: 600; color: #0f172a;">{$companyName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Authorized Domain:</td>
                        <td style="font-weight: 600; color: #2563eb;">{$domain}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Subscription Tier:</td>
                        <td style="font-weight: 600; color: #0f172a; text-transform: capitalize;">{$planName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Administrator Email:</td>
                        <td style="font-weight: 600; color: #0f172a;">{$adminEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Billing Reference:</td>
                        <td style="font-weight: 600; color: #475569;">{$invoiceId} (R{$formattedPrice}/{$billingCycle})</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="border-radius: 8px; background: #2563eb; margin-right: 10px;">
                          <a href="{$adminUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px;">
                            Launch Admin Dashboard &rarr;
                          </a>
                        </td>
                        <td width="12"></td>
                        <td align="center" style="border-radius: 8px; background: #f1f5f9; border: 1px solid #cbd5e1;">
                          <a href="{$appUrl}" target="_blank" style="display: inline-block; padding: 13px 22px; font-size: 14px; font-weight: 600; color: #334155; text-decoration: none; border-radius: 8px;">
                            Signature Builder
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 3-Step Quick Start Guide -->
              <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 16px 0; font-weight: 700;">
                🚀 Quick Start Guide for {$companyName}
              </h3>
              
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13.5px; line-height: 1.5; color: #475569;">
                <tr>
                  <td width="28" valign="top" style="padding-bottom: 14px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">1</div>
                  </td>
                  <td style="padding-bottom: 14px; padding-left: 8px;">
                    <strong>Set Brand Guidelines</strong>: Sign in to your Admin Dashboard to upload your official corporate logo, brand elements, and define compliant hex colors.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding-bottom: 14px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">2</div>
                  </td>
                  <td style="padding-bottom: 14px; padding-left: 8px;">
                    <strong>Add Team Profiles</strong>: Populate employee titles, departments, and phone numbers. Profiles are automatically locked to your @{$domain} domain.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="padding-bottom: 14px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background-color: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">3</div>
                  </td>
                  <td style="padding-bottom: 14px; padding-left: 8px;">
                    <strong>Distribute Zero-Friction Staff Portal</strong>: Share <a href="{$portalUrl}" style="color: #2563eb; text-decoration: underline;">{$portalUrl}</a> with your team. Employees simply enter their name to copy their ready-to-use HTML signature into Outlook, Apple Mail, or Gmail.
                  </td>
                </tr>
              </table>

              <!-- Direct URL Fallback -->
              <div style="margin-top: 24px; padding: 14px 18px; background-color: #f1f5f9; border-radius: 6px; font-size: 12px; color: #64748b; word-break: break-all;">
                <strong>Admin Portal URL:</strong> <a href="{$adminUrl}" style="color: #2563eb; text-decoration: none;">{$adminUrl}</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px 0;">This email was sent to <strong>{$adminEmail}</strong> for company <strong>{$companyName}</strong>.</p>
              <p style="margin: 0;">&copy; {$year} MailFooter. All rights reserved. Developed by <strong>WOLFF - Cloud Solutions</strong>.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/**
 * Render Password Reset Email HTML
 */
function renderPasswordResetEmail($adminName, $adminEmail, $resetUrl, $expiresMinutes = 60) {
    $year = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your MailFooter Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px;">
              <div style="display: inline-block; padding: 4px 12px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 20px; color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
                Security Verification
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.4px;">Password Reset Request</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Hello <strong>{$adminName}</strong>,
              </p>
              <p style="font-size: 14.5px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                We received a request to reset the administrative password for your MailFooter account (<strong>{$adminEmail}</strong>). Click the button below to choose a new, secure password.
              </p>

              <!-- Reset Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 26px;">
                <tr>
                  <td align="center">
                    <a href="{$resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14.5px; font-weight: 700; color: #ffffff; background-color: #2563eb; text-decoration: none; border-radius: 8px; letter-spacing: 0.3px; box-shadow: 0 2px 8px rgba(37,99,235,0.3);">
                      Reset My Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Notice -->
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 4px; font-size: 13px; line-height: 1.5; color: #991b1b; margin-bottom: 22px;">
                <strong>Important:</strong> This link will expire in <strong>{$expiresMinutes} minutes</strong>. If you did not request this password reset, no action is required and your account remains completely safe.
              </div>

              <!-- Direct link fallback -->
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="{$resetUrl}" style="color: #2563eb; word-break: break-all;">{$resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 36px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
              &copy; {$year} MailFooter. Security Notification.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/**
 * Render Password Changed Notification HTML
 */
function renderPasswordChangedEmail($adminName, $adminEmail, $loginUrl) {
    $year = date('Y');
    $time = date('Y-m-d H:i:s T');

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Changed Confirmation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding: 40px 10px;">
    <tr>
      <td align="center">
        <table width="560" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="background: #0f172a; padding: 28px 36px; color: #ffffff;">
              <h1 style="font-size: 20px; margin: 0;">Password Successfully Changed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 36px; font-size: 14.5px; line-height: 1.6; color: #334155;">
              <p>Hello <strong>{$adminName}</strong>,</p>
              <p>The administrative password for your MailFooter account (<strong>{$adminEmail}</strong>) was successfully changed on <strong>{$time}</strong>.</p>
              <p>If you made this change, you can sign in to your dashboard at any time:</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="{$loginUrl}" style="display: inline-block; padding: 12px 28px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">Sign In to Dashboard</a>
              </div>
              <p style="font-size: 12.5px; color: #ef4444; margin-top: 20px;">
                <strong>Did not make this change?</strong> Please contact support immediately to secure your corporate tenant account.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 36px; text-align: center; font-size: 12px; color: #94a3b8;">
              &copy; {$year} MailFooter Security.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
}

/**
 * Core Mail Dispatch & Persistent SQLite Audit Logging
 */
function sendMailNotification($pdo, $recipientEmail, $recipientName, $subject, $bodyHtml, $emailType, $clientDomain = null) {
    $recipientEmail = trim(strtolower($recipientEmail));
    
    // RFC-compliant MIME Headers
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: MailFooter Cloud <noreply@mailfooter.co.za>\r\n";
    $headers .= "Reply-To: support@mailfooter.co.za\r\n";
    $headers .= "X-Mailer: MailFooter-Notification-Engine/3.2\r\n";

    $status = 'logged';
    
    // Attempt standard PHP mail() dispatch
    try {
        $sent = @mail($recipientEmail, $subject, $bodyHtml, $headers);
        if ($sent) {
            $status = 'sent';
        }
    } catch (Exception $e) {
        $status = 'logged';
    }

    // Persist to SQLite email_logs
    $logId = null;
    try {
        $stmt = $pdo->prepare("
            INSERT INTO email_logs (recipient, recipient_name, subject, email_type, body_html, client_domain, status, headers, created_at)
            VALUES (:recipient, :recipient_name, :subject, :email_type, :body_html, :client_domain, :status, :headers, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            ':recipient' => $recipientEmail,
            ':recipient_name' => $recipientName,
            ':subject' => $subject,
            ':email_type' => $emailType,
            ':body_html' => $bodyHtml,
            ':client_domain' => $clientDomain,
            ':status' => $status,
            ':headers' => $headers
        ]);
        $logId = $pdo->lastInsertId();
    } catch (Exception $e) {
        error_log("Failed to insert email_log: " . $e->getMessage());
    }

    return [
        'success' => true,
        'status' => $status,
        'log_id' => $logId,
        'recipient' => $recipientEmail,
        'subject' => $subject,
        'body' => $bodyHtml
    ];
}

// ==========================================
// DIRECT HTTP REST ENDPOINT HANDLER
// ==========================================
if (basename($_SERVER['SCRIPT_FILENAME']) === 'mailer.php') {
    $action = $_GET['action'] ?? '';

    // Action 1: View Outbox / Email Logs
    if ($action === 'logs') {
        try {
            $domain = getActiveDomain($pdo);
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            
            if (!empty($domain) && !isCentralOrDev()) {
                $stmt = $pdo->prepare("SELECT id, recipient, recipient_name, subject, email_type, client_domain, status, created_at FROM email_logs WHERE client_domain = :domain ORDER BY created_at DESC LIMIT :lim");
                $stmt->bindValue(':domain', $domain, PDO::PARAM_STR);
                $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
                $stmt->execute();
            } else {
                $stmt = $pdo->prepare("SELECT id, recipient, recipient_name, subject, email_type, client_domain, status, created_at FROM email_logs ORDER BY created_at DESC LIMIT :lim");
                $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
                $stmt->execute();
            }
            $logs = $stmt->fetchAll();
            echo json_encode(['success' => true, 'count' => count($logs), 'logs' => $logs]);
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to fetch email logs: ' . $e->getMessage()]);
        }
        exit();
    }

    // Action 2: Inspect Single Full Email by Log ID
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        try {
            $stmt = $pdo->prepare("SELECT * FROM email_logs WHERE id = :id");
            $stmt->execute([':id' => $id]);
            $email = $stmt->fetch();
            if ($email) {
                echo json_encode(['success' => true, 'email' => $email]);
            } else {
                header('HTTP/1.1 404 Not Found');
                echo json_encode(['error' => 'Email log not found']);
            }
        } catch (PDOException $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit();
    }

    // Action 3: Live Preview HTML in Browser
    if ($action === 'preview') {
        $type = $_GET['type'] ?? 'welcome';
        if ($type === 'password_reset') {
            echo renderPasswordResetEmail('Sarah Jenkins', 'admin@wolff-tech.com', getAppBaseUrl() . '/reset-password.html?token=demo_token&email=admin@wolff-tech.com');
        } else {
            echo renderWelcomeEmail('Wolff Technologies', 'wolff-tech.com', 'Sarah Jenkins', 'admin@wolff-tech.com', 'Enterprise Plan', 4500, 'annual', 'inv_demo_101');
        }
        exit();
    }

    echo json_encode(['success' => true, 'message' => 'MailFooter Mailer API online']);
}
