import type { APIRoute } from 'astro';
import { getSession } from '@/lib/session';
import { createSupportTicket } from '@/lib/supportTickets';
import { trackEvent } from '@/lib/analytics';
import { sendSupportTicketEmail } from '@/lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const body = await request.json().catch(() => ({}));

    const email = (body.email as string)?.trim().toLowerCase() || session?.user?.email?.trim().toLowerCase();
    const name = (body.name as string)?.trim() || session?.user?.name || undefined;
    const subject = (body.subject as string)?.trim();
    const category = (body.category as string)?.trim() || 'general';
    const siteUrl = (body.siteUrl as string)?.trim() || undefined;
    const message = (body.message as string)?.trim();

    if (!email || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'A valid email address is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!subject || subject.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Please provide a subject for your inquiry (at least 3 characters).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!message || message.length < 5) {
      return new Response(
        JSON.stringify({ error: 'Please provide more details in your message (at least 5 characters).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ticket = await createSupportTicket({
      userId: session?.user?.id || null,
      email,
      name,
      subject,
      category,
      siteUrl,
      message,
    });

    // Track analytics event
    await trackEvent({
      eventType: 'support_ticket' as any,
      userId: session?.user?.id || null,
      userEmail: email,
      path: '/api/support/submit',
      metadata: {
        ticketId: ticket.id,
        category,
        subject,
        siteUrl,
      },
    });

    // Send confirmation email to user and alert to admin
    sendSupportTicketEmail({
      ticketId: ticket.id,
      toEmail: email,
      userName: name,
      subject,
      category,
      message,
      siteUrl,
    }).catch((emailErr) => {
      console.error('[Support] Failed to send ticket email:', emailErr);
    });

    return new Response(
      JSON.stringify({
        success: true,
        ticketId: ticket.id,
        message: 'Your support ticket has been submitted successfully! Our team will get back to you via email within 24 hours.',
        ticket,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[Support] Submit ticket error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to submit support ticket' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
