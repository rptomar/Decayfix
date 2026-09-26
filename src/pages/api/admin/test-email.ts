import type { APIRoute } from 'astro';
import { sendEmail, DEFAULT_FROM_EMAIL, DEFAULT_REPLY_TO } from '@/lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const targetEmail = (body.email as string)?.trim() || 'sprintlabsai@gmail.com';

    const apiKey = process.env.RESEND_API_KEY;
    const isMock = !apiKey || apiKey.startsWith('re_dummy') || apiKey.trim() === '';

    const result = await sendEmail({
      to: targetEmail,
      subject: '⚡ DecayFix Email Gateway Test (Resend Verified)',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #030712; color: #f8fafc; padding: 32px; border-radius: 16px; max-width: 550px; margin: 0 auto; border: 1px solid #1e293b;">
          <h2 style="color: #38bdf8; margin-top: 0;">⚡ DecayFix Gateway Connected!</h2>
          <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
            This is a verification test email sent from <strong>${DEFAULT_FROM_EMAIL}</strong> via your verified domain <code>decayfix.sprintlabsai.com</code>.
          </p>
          <div style="background: #0f172a; padding: 16px; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; font-size: 14px;">
            <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #34d399;">Connected & Active</span></p>
            <p style="margin: 4px 0;"><strong>Sender:</strong> ${DEFAULT_FROM_EMAIL}</p>
            <p style="margin: 4px 0;"><strong>Reply-To:</strong> ${DEFAULT_REPLY_TO}</p>
            <p style="margin: 4px 0;"><strong>Recipient:</strong> ${targetEmail}</p>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 12px;">
            DecayFix • Continuous Search Traffic Optimization
          </p>
        </div>
      `,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        isMock,
        sentTo: targetEmail,
        fromEmail: DEFAULT_FROM_EMAIL,
        replyTo: DEFAULT_REPLY_TO,
        data: (result as any).data,
        error: (result as any).error,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to send test email' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
