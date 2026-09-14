import { Resend } from 'resend';

export async function sendUnlockConfirmationEmail(params: {
  toEmail: string;
  userName?: string | null;
  siteUrl?: string;
  paymentId?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const siteOrigin = process.env.SITE_URL || 'https://decayfix.com';
  const dashboardLink = `${siteOrigin}/dashboard`;
  const name = params.userName || 'there';

  if (!apiKey || apiKey.startsWith('re_dummy') || apiKey === '') {
    console.log(`[Resend Mock Email] To: ${params.toEmail} | Subject: Your Full DecayFix Report is Unlocked!`);
    return { success: true, mock: true };
  }

  try {
    const resend = new Resend(apiKey);
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'DecayFix <reports@decayfix.com>';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 24px; font-weight: 800; color: #38bdf8; margin-bottom: 24px; }
    .badge { display: inline-block; background: #065f46; color: #34d399; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
    h1 { color: #f8fafc; font-size: 22px; margin-top: 0; }
    p { color: #cbd5e1; line-height: 1.6; font-size: 15px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; }
    .footer { margin-top: 32px; font-size: 13px; color: #64748b; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">⚡ DecayFix</div>
    <div class="badge">Payment Confirmed</div>
    <h1>Your Full DecayFix Report is Unlocked!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for your purchase! Your complete content decay audit and all AI-driven action plans for <strong>${params.siteUrl || 'your website'}</strong> are now permanently unlocked.</p>
    
    <p>You can now see every decaying article, historical traffic baselines, and step-by-step AI suggestions on how to refresh and regain lost Google traffic.</p>
    
    <div style="text-align: center;">
      <a href="${dashboardLink}" class="btn">View Full Dashboard & AI Suggestions →</a>
    </div>

    <p style="font-size: 13px; color: #94a3b8;">Receipt Reference: ${params.paymentId || 'N/A'}</p>

    <div class="footer">
      DecayFix — Continuous Search Traffic Optimization<br>
      Need assistance? Reply directly to this email.
    </div>
  </div>
</body>
</html>`;

    const result = await resend.emails.send({
      from: fromAddress,
      to: params.toEmail,
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
