import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for the Metal Gear industrial equipment marketplace.',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Last updated: February 28, 2026
      </p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p className="mt-2">We collect information that you provide directly:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Account information:</strong>{' '}
              name, email address, phone number, company name, and location when
              you create an account.
            </li>
            <li>
              <strong className="text-foreground">Profile information:</strong>{' '}
              avatar photo, bio, and industry preferences.
            </li>
            <li>
              <strong className="text-foreground">Listing content:</strong>{' '}
              photos, descriptions, specifications, and pricing for equipment
              you list.
            </li>
            <li>
              <strong className="text-foreground">Messages:</strong>{' '}
              communications between buyers and sellers on the platform.
            </li>
            <li>
              <strong className="text-foreground">Payment information:</strong>{' '}
              processed securely by Stripe. We do not store credit card numbers.
            </li>
          </ul>
          <p className="mt-3">We also collect information automatically:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Device information, browser type, and IP address via standard web
              server logs.
            </li>
            <li>
              Usage data such as pages visited, listings viewed, and search
              queries.
            </li>
            <li>
              Error and performance data via Sentry for improving service
              reliability.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Operate and maintain the marketplace platform</li>
            <li>Facilitate communication between buyers and sellers</li>
            <li>Process subscription payments and manage billing</li>
            <li>
              Send transactional emails (new messages, subscription updates)
            </li>
            <li>Improve the Service through analytics and error tracking</li>
            <li>Enforce our Terms of Service and prevent fraud</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            3. Information Sharing
          </h2>
          <p className="mt-2">
            We do not sell your personal information. We share information only
            in these limited circumstances:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Other users:</strong> Your
              profile name, company, location, and listings are visible to other
              users on the platform.
            </li>
            <li>
              <strong className="text-foreground">Service providers:</strong> We
              use Supabase (database/auth), Stripe (payments), Vercel (hosting),
              Resend (email), and Sentry (error tracking) to operate the
              Service.
            </li>
            <li>
              <strong className="text-foreground">Legal requirements:</strong>{' '}
              We may disclose information if required by law, subpoena, or
              government request.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            4. Data Storage & Security
          </h2>
          <p className="mt-2">
            Your data is stored in Supabase (hosted on AWS) with encryption at
            rest and in transit. Authentication uses industry-standard protocols.
            Payment data is processed by Stripe, a PCI-DSS Level 1 certified
            provider. While we take reasonable measures to protect your data, no
            system is completely secure.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            5. Cookies & Tracking
          </h2>
          <p className="mt-2">
            We use essential cookies for authentication and session management.
            We do not use third-party advertising cookies or cross-site tracking.
            Sentry may use cookies for error tracking and performance monitoring.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            6. Your Rights
          </h2>
          <p className="mt-2">You have the right to:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Update or correct your account information at any time</li>
            <li>Delete your account and associated data</li>
            <li>
              Opt out of non-essential emails through notification preferences
            </li>
            <li>Request a copy of your data in a portable format</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{' '}
            <a
              href="mailto:support@metal-gear.app"
              className="text-primary hover:underline"
            >
              support@metal-gear.app
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            7. Data Retention
          </h2>
          <p className="mt-2">
            We retain your account data for as long as your account is active.
            After account deletion, we may retain certain data for up to 90 days
            for legal compliance and fraud prevention. Listing data and messages
            are permanently deleted with your account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            8. Children&rsquo;s Privacy
          </h2>
          <p className="mt-2">
            The Service is not intended for users under 18 years of age. We do
            not knowingly collect information from children.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            9. Changes to This Policy
          </h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. We will notify
            you of material changes via email or in-app notice. Continued use of
            the Service after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            10. Contact
          </h2>
          <p className="mt-2">
            Questions about this policy? Contact us at{' '}
            <a
              href="mailto:support@metal-gear.app"
              className="text-primary hover:underline"
            >
              support@metal-gear.app
            </a>
            .
          </p>
          <p className="mt-1">Metal Gear LLC — Houston, TX</p>
        </section>
      </div>
    </div>
  )
}
