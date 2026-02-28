import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || 'Metal Gear <noreply@metal-gear.app>'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!resend) {
    console.log(`[Email Skipped] No RESEND_API_KEY set. To: ${to}, Subject: ${subject}`)
    return { success: false, error: 'Email not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Email send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false, error: 'Failed to send email' }
  }
}

// ─── Email Templates ─────────────────────────────────────────

const BRAND_COLOR = '#FF6B2B'
const BG_COLOR = '#0A0A0F'

function baseTemplate(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:${BRAND_COLOR};font-size:24px;margin:0;">Metal Gear</h1>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Industrial Equipment Marketplace</p>
    </div>
    <div style="background:#15151F;border-radius:12px;padding:32px;border:1px solid #2a2a3a;">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666;font-size:11px;margin:0;">
        Metal Gear — Houston, TX<br/>
        <a href="https://metal-gear-five.vercel.app" style="color:${BRAND_COLOR};text-decoration:none;">metal-gear-five.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export function welcomeEmail(name: string) {
  return {
    subject: 'Welcome to Metal Gear!',
    html: baseTemplate(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Welcome, ${name}!</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Thanks for joining Metal Gear — the industrial equipment marketplace for Houston.
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Start listing your equipment, browse what&rsquo;s available, and connect with buyers and sellers in your industry.
      </p>
      <div style="text-align:center;">
        <a href="https://metal-gear-five.vercel.app/dashboard"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Go to Dashboard
        </a>
      </div>
    `),
  }
}

export function newMessageEmail(recipientName: string, senderName: string, listingTitle: string, messagePreview: string) {
  return {
    subject: `New message from ${senderName} about "${listingTitle}"`,
    html: baseTemplate(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">New Message</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Hi ${recipientName},
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        <strong style="color:#fff;">${senderName}</strong> sent you a message about
        <strong style="color:#fff;">"${listingTitle}"</strong>:
      </p>
      <div style="background:#0d0d15;border-left:3px solid ${BRAND_COLOR};padding:12px 16px;border-radius:4px;margin:0 0 24px;">
        <p style="color:#aaa;font-size:14px;line-height:1.5;margin:0;">${messagePreview}</p>
      </div>
      <div style="text-align:center;">
        <a href="https://metal-gear-five.vercel.app/messages"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Messages
        </a>
      </div>
    `),
  }
}

export function listingInquiryEmail(sellerName: string, buyerName: string, listingTitle: string) {
  return {
    subject: `${buyerName} is interested in "${listingTitle}"`,
    html: baseTemplate(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">New Inquiry</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hi ${sellerName},
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#fff;">${buyerName}</strong> started a conversation about your listing
        <strong style="color:#fff;">"${listingTitle}"</strong>. Reply to connect with them.
      </p>
      <div style="text-align:center;">
        <a href="https://metal-gear-five.vercel.app/messages"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Conversation
        </a>
      </div>
    `),
  }
}

export function subscriptionConfirmEmail(name: string, plan: string) {
  return {
    subject: `Your ${plan} subscription is active`,
    html: baseTemplate(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">Subscription Confirmed</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Hi ${name},
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">
        Your <strong style="color:${BRAND_COLOR};">${plan}</strong> plan is now active.
        You have access to all premium features.
      </p>
      <div style="text-align:center;">
        <a href="https://metal-gear-five.vercel.app/dashboard"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Go to Dashboard
        </a>
      </div>
    `),
  }
}
