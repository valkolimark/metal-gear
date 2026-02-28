export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 font-body text-sm text-muted-foreground">
        Last updated: February 28, 2026
      </p>

      <div className="mt-10 space-y-8 font-body text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="mt-2">
            By accessing or using Metal Gear (&ldquo;the Service&rdquo;),
            operated by Metal Gear LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or
            &ldquo;our&rdquo;), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            2. Description of Service
          </h2>
          <p className="mt-2">
            Metal Gear is an online marketplace that connects buyers and sellers
            of industrial equipment, machinery, and related tools. We provide the
            platform; we are not a party to any transaction between users.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            3. User Accounts
          </h2>
          <p className="mt-2">
            You must provide accurate information when creating an account. You
            are responsible for maintaining the security of your account
            credentials. You must be at least 18 years old to use the Service.
            One person or business may maintain only one account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            4. Listings & Content
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              Sellers are solely responsible for the accuracy of their listings,
              including descriptions, photos, pricing, and condition.
            </li>
            <li>
              You may not list prohibited items including stolen property,
              hazardous materials requiring special licensing, or items that
              violate any applicable law.
            </li>
            <li>
              We reserve the right to remove any listing that violates these
              terms or is flagged by the community.
            </li>
            <li>
              By posting content, you grant Metal Gear a non-exclusive,
              worldwide license to display that content on the platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            5. Transactions
          </h2>
          <p className="mt-2">
            Metal Gear facilitates connections between buyers and sellers but
            does not guarantee any transaction. All transactions are conducted
            directly between users. We are not responsible for the quality,
            safety, or legality of items listed, the truth or accuracy of
            listings, or the ability of sellers to sell or buyers to pay.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            6. Subscriptions & Payments
          </h2>
          <p className="mt-2">
            Paid subscription plans are billed monthly through Stripe.
            Subscriptions automatically renew unless canceled before the end of
            the billing period. Refunds are handled on a case-by-case basis. We
            may change subscription pricing with 30 days&rsquo; notice.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            7. Prohibited Conduct
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Creating fake listings or misrepresenting equipment</li>
            <li>Harassment, threats, or abusive messages to other users</li>
            <li>Attempting to circumvent subscription limits or fees</li>
            <li>Scraping, crawling, or automated access to the Service</li>
            <li>Impersonating another person or business</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            8. Limitation of Liability
          </h2>
          <p className="mt-2">
            To the maximum extent permitted by law, Metal Gear shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages arising from your use of the Service. Our total
            liability shall not exceed the amount you paid us in subscription
            fees during the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            9. Termination
          </h2>
          <p className="mt-2">
            We may suspend or terminate your account at any time for violation of
            these terms. You may delete your account at any time. Upon
            termination, your listings will be removed and any active
            subscription will be canceled.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            10. Changes to Terms
          </h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use of the
            Service after changes constitutes acceptance of the new terms. We
            will notify users of material changes via email or in-app notice.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            11. Governing Law
          </h2>
          <p className="mt-2">
            These terms are governed by the laws of the State of Texas. Any
            disputes shall be resolved in the courts of Harris County, Texas.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            12. Contact
          </h2>
          <p className="mt-2">
            Questions about these terms? Contact us at{' '}
            <a
              href="mailto:support@metal-gear.app"
              className="text-primary hover:underline"
            >
              support@metal-gear.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
