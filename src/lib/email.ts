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

const BRAND_COLOR = '#1877F2'
const BG_COLOR = '#0A0A0F'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'

export interface EmailNotificationPrefs {
  messages: boolean
  inquiries: boolean
  subscription: boolean
  marketing: boolean
}

export const DEFAULT_EMAIL_PREFS: EmailNotificationPrefs = {
  messages: true,
  inquiries: true,
  subscription: true,
  marketing: true,
}

export function getEmailPrefs(raw: unknown): EmailNotificationPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_EMAIL_PREFS }
  const prefs = raw as Record<string, unknown>
  return {
    messages: prefs.messages !== false,
    inquiries: prefs.inquiries !== false,
    subscription: prefs.subscription !== false,
    marketing: prefs.marketing !== false,
  }
}

function unsubscribeFooter(userId: string) {
  return `
    <div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid #2a2a3a;">
      <a href="${APP_URL}/api/unsubscribe?uid=${userId}" style="color:#666;font-size:11px;text-decoration:underline;">
        Manage email preferences
      </a>
    </div>`
}

function baseTemplate(content: string, userId?: string) {
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
      ${userId ? unsubscribeFooter(userId) : ''}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#666;font-size:11px;margin:0;">
        Metal Gear — Houston, TX<br/>
        <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:none;">metal-gear-five.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

export function welcomeEmail(name: string, userId?: string) {
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
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Go to Dashboard
        </a>
      </div>
    `, userId),
  }
}

export function newMessageEmail(recipientName: string, senderName: string, listingTitle: string, messagePreview: string, recipientId?: string) {
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
        <a href="${APP_URL}/messages"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Messages
        </a>
      </div>
    `, recipientId),
  }
}

export function listingInquiryEmail(sellerName: string, buyerName: string, listingTitle: string, sellerId?: string) {
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
        <a href="${APP_URL}/messages"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Conversation
        </a>
      </div>
    `, sellerId),
  }
}

export function savedSearchAlertEmail(
  name: string,
  searchName: string,
  matches: { title: string; price: string; id: string }[],
  userId?: string
) {
  const listItems = matches
    .map(
      (m) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a3a;">
          <a href="${APP_URL}/listings/${m.id}" style="color:#fff;text-decoration:none;font-size:14px;font-weight:500;">
            ${m.title}
          </a>
          <br/>
          <span style="color:${BRAND_COLOR};font-size:13px;font-weight:600;">${m.price}</span>
        </td>
      </tr>`
    )
    .join('')

  return {
    subject: `${matches.length} new listing${matches.length !== 1 ? 's' : ''} match "${searchName}"`,
    html: baseTemplate(`
      <h2 style="color:#fff;font-size:20px;margin:0 0 16px;">New Matches Found</h2>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Hi ${name},
      </p>
      <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 16px;">
        We found <strong style="color:#fff;">${matches.length} new listing${matches.length !== 1 ? 's' : ''}</strong> matching your saved search
        <strong style="color:${BRAND_COLOR};">"${searchName}"</strong>:
      </p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        ${listItems}
      </table>
      <div style="text-align:center;">
        <a href="${APP_URL}/search"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View All Matches
        </a>
      </div>
    `, userId),
  }
}

export function subscriptionConfirmEmail(name: string, plan: string, userId?: string) {
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
        <a href="${APP_URL}/dashboard"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          Go to Dashboard
        </a>
      </div>
    `, userId),
  }
}
