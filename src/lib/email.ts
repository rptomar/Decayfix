import { Resend } from 'resend';

// Default sender using your verified domain: decayfix.sprintlabsai.com
export const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'DecayFix <notifications@decayfix.sprintlabsai.com>';
export const DEFAULT_REPLY_TO = process.env.RESEND_REPLY_TO || 'sprintlabsai@gmail.com';
export const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'sprintlabsai@gmail.com';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('re_dummy') || apiKey.trim() === '') {
    return null;
  }
  return new Resend(apiKey.trim());
}

/**
 * 1. UNLOCK / PAYMENT CONFIRMATION EMAIL
 * Triggered when a user completes Razorpay payment or gets unlocked.
 */
export async function sendUnlockConfirmationEmail(params: {
  toEmail: string;
  userName?: string | null;
  siteUrl?: string;
  paymentId?: string;
}) {
  const resend = getResendClient();
  const siteOrigin = process.env.SITE_URL || 'https://decayfix.sprintlabsai.com';
  const dashboardLink = `${siteOrigin}/dashboard`;
  const name = params.userName || 'there';

  if (!resend) {
    console.log(`[Resend Mock Email] To: ${params.toEmail} | Subject: Your Full DecayFix Report is Unlocked!`);
    return { success: true, mock: true };
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 36px; border: 1px solid #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .logo { font-size: 22px; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 24px; margin-top: 0; font-weight: 800; line-height: 1.3; }
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; margin: 12px 0; }
    .card { background: #1e293b; border-radius: 10px; padding: 18px 24px; margin: 24px 0; border: 1px solid #334155; }
    .card-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
    .card-label { color: #64748b; }
    .card-val { color: #f8fafc; font-weight: 600; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; text-align: center; }
    .footer { margin-top: 32px; font-size: 12px; color: #475569; border-top: 1px solid #1e293b; padding-top: 20px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ DecayFix</div>
    <div class="badge">Payment Confirmed</div>
    <h1>Your Full DecayFix Report is Ready!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for unlocking DecayFix Pro. Your complete content decay audit and all AI-generated refresh playbooks for <strong>${params.siteUrl || 'your website'}</strong> are now permanently unlocked.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Website Monitored:</span>
        <span class="card-val">${params.siteUrl || 'Connected Property'}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Plan / Status:</span>
        <span class="card-val" style="color: #34d399;">Pro Full Access</span>
      </div>
      <div class="card-row">
        <span class="card-label">Receipt Ref:</span>
        <span class="card-val">${params.paymentId || 'N/A'}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${dashboardLink}" class="btn">Open Full Dashboard & AI Playbooks →</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
      You can now inspect all historical drop metrics, query-level losses, and instant AI update blueprints to recover lost rankings.
    </p>

    <div class="footer">
      DecayFix by SprintLabs • Continuous Search Traffic Optimization<br>
      Questions? Just reply directly to this email or write to ${DEFAULT_REPLY_TO}.
    </div>
  </div>
</body>
</html>`;

    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: params.toEmail,
      replyTo: DEFAULT_REPLY_TO,
      subject: '⚡ Your Full DecayFix Content Decay Report is Ready',
      html: htmlContent,
      text: `Hi ${name},\n\nYour full DecayFix report for ${params.siteUrl || 'your site'} is now unlocked!\n\nView your dashboard: ${dashboardLink}\n\nReceipt: ${params.paymentId || 'N/A'}`,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to send Resend email:', error?.message || error);
    return { success: false, error: error?.message };
  }
}

/**
 * 2. SUBSCRIPTION REQUEST EMAIL
 * Triggered when a user clicks "Request Pro Subscription" / submits custom plan request.
 * Sends an acknowledgement to the user and alerts the SprintLabs team.
 */
export async function sendSubscriptionRequestEmail(params: {
  toEmail: string;
  userName?: string;
  plan?: string;
  siteUrl?: string;
  requestId: string;
}) {
  const resend = getResendClient();
  const name = params.userName || 'there';
  const plan = params.plan || 'Pro Monthly Subscription (₹999/mo)';

  if (!resend) {
    console.log(`[Resend Mock Email] Subscription Request Received from: ${params.toEmail}`);
    return { success: true, mock: true };
  }

  try {
    // 1. Email to Customer
    const userHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 36px; border: 1px solid #1e293b; }
    .logo { font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 24px; }
    .badge { display: inline-block; background: #1e1b4b; color: #818cf8; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 22px; margin-top: 0; }
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
    .card { background: #1e293b; border-radius: 10px; padding: 18px 24px; margin: 20px 0; border: 1px solid #334155; }
    .footer { margin-top: 32px; font-size: 12px; color: #475569; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ DecayFix</div>
    <div class="badge">Request Received</div>
    <h1>We've Received Your Subscription Request!</h1>
    <p>Hi ${name},</p>
    <p>Thanks for requesting the <strong>${plan}</strong> on DecayFix. Our internal team has received your details and is preparing your account activation.</p>
    
    <div class="card">
      <p style="margin: 0; color: #f8fafc; font-weight: 600;">Request Reference: #${params.requestId}</p>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">Target Website: ${params.siteUrl || 'Connected Property'}</p>
    </div>

    <p>A member of our team will contact you directly via this email shortly to assist with payment setup and ensure all your decaying blog posts and AI playbooks are unlocked.</p>
    
    <p>If you have any urgent questions, feel free to reply directly to this email.</p>

    <div class="footer">
      DecayFix by SprintLabs • Continuous Search Traffic Optimization
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: params.toEmail,
      replyTo: DEFAULT_REPLY_TO,
      subject: '⚡ We received your DecayFix Pro Subscription Request',
      html: userHtml,
    });

    // 2. Alert to Admin
    if (ADMIN_NOTIFICATION_EMAIL) {
      await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        replyTo: params.toEmail,
        subject: `🔔 [New Subscription Request] ${params.toEmail} requested ${plan}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; color: #0f172a;">
            <h2>New Subscription Request Received</h2>
            <p><strong>Customer:</strong> ${name} (${params.toEmail})</p>
            <p><strong>Plan:</strong> ${plan}</p>
            <p><strong>Site:</strong> ${params.siteUrl || 'N/A'}</p>
            <p><strong>Request ID:</strong> ${params.requestId}</p>
            <p><a href="${process.env.SITE_URL || 'http://localhost:4321'}/admin/login" style="background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;">Open Admin Dashboard to Activate</a></p>
          </div>
        `,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send Subscription Request email:', error?.message || error);
    return { success: false, error: error?.message };
  }
}

/**
 * 3. SUBSCRIPTION ACTIVATED EMAIL
 * Triggered when an admin approves/activates a user's subscription from the admin dashboard.
 */
export async function sendSubscriptionActivatedEmail(params: {
  toEmail: string;
  userName?: string;
  siteUrl?: string;
}) {
  const resend = getResendClient();
  const siteOrigin = process.env.SITE_URL || 'https://decayfix.sprintlabsai.com';
  const dashboardLink = `${siteOrigin}/dashboard`;
  const name = params.userName || 'there';

  if (!resend) {
    console.log(`[Resend Mock Email] Subscription Activated for: ${params.toEmail}`);
    return { success: true, mock: true };
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 36px; border: 1px solid #1e293b; }
    .logo { font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 24px; }
    .badge { display: inline-block; background: #064e3b; color: #34d399; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 24px; margin-top: 0; }
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; margin: 20px 0; text-align: center; }
    .footer { margin-top: 32px; font-size: 12px; color: #475569; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ DecayFix</div>
    <div class="badge">Account Activated</div>
    <h1>Your DecayFix Pro Subscription is Live! 🚀</h1>
    <p>Hi ${name},</p>
    <p>Great news! Your DecayFix Pro subscription has been activated. All decaying blog posts, AI refresh action plans, and continuous weekly search monitoring are now unlocked on your account.</p>

    <div style="text-align: center;">
      <a href="${dashboardLink}" class="btn">Go to DecayFix Dashboard →</a>
    </div>

    <div class="footer">
      DecayFix by SprintLabs • Continuous Search Traffic Optimization<br>
      Need assistance? Reply directly to this email.
    </div>
  </div>
</body>
</html>`;

    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: params.toEmail,
      replyTo: DEFAULT_REPLY_TO,
      subject: '🎉 Your DecayFix Pro Subscription is Activated!',
      html: htmlContent,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to send Subscription Activated email:', error?.message || error);
    return { success: false, error: error?.message };
  }
}

/**
 * 4. SUPPORT TICKET EMAIL
 * Triggered when a user submits an inquiry via the Support Modal.
 */
export async function sendSupportTicketEmail(params: {
  ticketId: string;
  toEmail: string;
  userName?: string;
  subject: string;
  category: string;
  message: string;
  siteUrl?: string;
}) {
  const resend = getResendClient();
  const name = params.userName || 'there';

  if (!resend) {
    console.log(`[Resend Mock Email] Support ticket received: ${params.ticketId}`);
    return { success: true, mock: true };
  }

  try {
    // 1. Customer confirmation
    const userHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 16px; padding: 36px; border: 1px solid #1e293b; }
    .logo { font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 24px; }
    .badge { display: inline-block; background: #1e293b; color: #94a3b8; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 9999px; margin-bottom: 16px; }
    h1 { color: #ffffff; font-size: 22px; margin-top: 0; }
    p { color: #94a3b8; line-height: 1.6; font-size: 15px; }
    .card { background: #1e293b; border-radius: 10px; padding: 18px 24px; margin: 20px 0; border: 1px solid #334155; }
    .footer { margin-top: 32px; font-size: 12px; color: #475569; border-top: 1px solid #1e293b; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ DecayFix Support</div>
    <div class="badge">Ticket #${params.ticketId}</div>
    <h1>We've Received Your Support Request</h1>
    <p>Hi ${name},</p>
    <p>Thank you for reaching out. We have logged your support inquiry, and our engineering team will get back to you within 24 hours.</p>

    <div class="card">
      <p style="margin: 0; color: #f8fafc; font-weight: 600;">Subject: ${params.subject}</p>
      <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 14px;">Category: ${params.category}</p>
      <p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 14px; font-style: italic;">"${params.message.slice(0, 300)}"</p>
    </div>

    <p>You can also reply directly to this email to add more details or screenshots to your ticket.</p>

    <div class="footer">
      DecayFix Support Team • sprintlabsai@gmail.com
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: params.toEmail,
      replyTo: DEFAULT_REPLY_TO,
      subject: `[DecayFix Support] Ticket #${params.ticketId}: ${params.subject}`,
      html: userHtml,
    });

    // 2. Alert Admin
    if (ADMIN_NOTIFICATION_EMAIL) {
      await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: ADMIN_NOTIFICATION_EMAIL,
        replyTo: params.toEmail,
        subject: `🆘 [Support Ticket #${params.ticketId}] from ${params.toEmail}: ${params.subject}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; color: #0f172a;">
            <h2>New Support Ticket Submitted</h2>
            <p><strong>From:</strong> ${name} (${params.toEmail})</p>
            <p><strong>Category:</strong> ${params.category}</p>
            <p><strong>Site URL:</strong> ${params.siteUrl || 'N/A'}</p>
            <p><strong>Subject:</strong> ${params.subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote style="background:#e2e8f0;padding:12px;border-left:4px solid #3b82f6;">${params.message}</blockquote>
          </div>
        `,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send Support Ticket email:', error?.message || error);
    return { success: false, error: error?.message };
  }
}

/**
 * 5. GENERIC EMAIL HELPER
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const resend = getResendClient();

  if (!resend) {
    console.log(`[Resend Mock Email] To: ${params.to} | Subject: ${params.subject}`);
    return { success: true, mock: true };
  }

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: params.to,
      replyTo: params.replyTo || DEFAULT_REPLY_TO,
      subject: params.subject,
      html: params.html,
      text: params.text || params.subject,
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to send Resend email:', error?.message || error);
    return { success: false, error: error?.message };
  }
}
