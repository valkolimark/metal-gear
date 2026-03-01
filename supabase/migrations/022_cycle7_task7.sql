-- Cycle 7, Task 7: Platform Help Center & Knowledge Base

CREATE TABLE IF NOT EXISTS help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('getting_started', 'buying', 'selling', 'payments', 'shipping', 'account', 'safety')),
  body_markdown text NOT NULL,
  sort_order integer DEFAULT 0,
  published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);

-- Seed help articles
INSERT INTO help_articles (slug, title, category, body_markdown, sort_order) VALUES
('getting-started-overview', 'Getting Started with Metal Gear', 'getting_started', '## Welcome to Metal Gear

Metal Gear is Houston''s premier marketplace for industrial equipment. Whether you''re buying or selling heavy machinery, we''ve got you covered.

### Quick Start Steps

1. **Create your account** — Sign up with email or Google
2. **Complete your profile** — Add your company name, location, and industry
3. **Browse equipment** — Use search and filters to find what you need
4. **Start buying or selling** — List your equipment or contact sellers

### Key Features

- **Secure escrow payments** — Funds are held safely until delivery is confirmed
- **Equipment condition reports** — Detailed inspection grades for transparency
- **Real-time messaging** — Communicate directly with buyers and sellers
- **Price tracking** — Watch listings and get notified of price drops', 1),

('creating-account', 'Creating Your Account', 'getting_started', '## Sign Up Options

You can create a Metal Gear account using:

- **Email & Password** — Use any valid email address
- **Google Sign-In** — Quick one-click registration
- **Apple Sign-In** — Available on supported devices

### After Signing Up

1. Check your email for a verification link
2. Complete your profile with your name and location
3. Optionally add your company name and industry
4. You''re ready to browse and list equipment!

### Account Tiers

- **Free** — 3 listings, 5 photos each, 100-mile search radius
- **Premium ($29.99/mo)** — 15 listings, 15 photos, videos, 500-mile radius
- **Boost ($79.99/mo)** — 50 listings, 25 photos, unlimited everything', 2),

('how-to-buy', 'How to Buy Equipment', 'buying', '## Finding Equipment

### Search & Browse

1. Use the **Search** page to find equipment by keyword
2. Apply filters: category, industry, condition, price range, distance
3. Sort by newest, price, or distance from Houston
4. Save searches to get notified of new matches

### Evaluating Listings

- Check the **condition report** for mechanical, cosmetic, and electrical scores
- Review the seller''s **trust score** and ratings from other buyers
- Look at all photos and videos carefully
- Read the full description and specifications

### Making Contact

1. Click **Contact Seller** to start a conversation
2. Ask questions about the equipment
3. Request an in-person viewing if the seller has availability
4. Make an offer if the listing is negotiable

### Making an Offer

- Click **Make an Offer** on negotiable listings
- Enter your offer amount and an optional message
- The seller can accept, decline, or counter your offer
- Offers expire after 72 hours', 1),

('payment-process', 'How Payments Work', 'payments', '## Secure Escrow Payments

Metal Gear uses Stripe-powered escrow payments to protect both buyers and sellers.

### Payment Flow

1. **Authorization** — When you proceed to payment, funds are authorized (held) on your card
2. **Seller Ships** — The seller marks the item as shipped and provides tracking
3. **Delivery Confirmation** — You confirm receipt of the equipment
4. **Funds Released** — Payment is captured and released to the seller

### Key Points

- Funds are **never released** until you confirm delivery
- A **5% platform fee** is applied to each transaction
- You can **cancel** the transaction before the seller ships
- If there''s a problem, you can **open a dispute**

### Accepted Payment Methods

- All major credit and debit cards via Stripe
- Payment is processed in USD', 1),

('opening-dispute', 'How to Open a Dispute', 'payments', '## When to Open a Dispute

You can open a dispute when:

- The item was **not received**
- The item is **not as described**
- The equipment was **damaged in shipping**
- You received the **wrong item**

### How to Dispute

1. Go to your **Transactions** page
2. Select the transaction
3. Click **Open a Dispute**
4. Select a reason and describe the issue
5. Upload evidence photos (up to 5)

### What Happens Next

- The transaction status changes to **disputed**
- Payment capture is blocked until resolved
- The seller can respond with counter-evidence
- An admin will review and make a decision

### Resolution

- **In favor of buyer** — Payment is refunded
- **In favor of seller** — Payment is released to the seller', 2),

('how-to-sell', 'How to Sell Equipment', 'selling', '## Listing Your Equipment

### Creating a Listing

1. Click **Create Listing** in the header
2. Fill in the details:
   - Title and description
   - Category and industry
   - Condition (new, like new, good, fair, salvage)
   - Price (or mark as "Contact for Price" / "Negotiable")
   - Location
3. Upload photos (tip: good photos sell faster!)
4. Add specifications for technical details
5. Publish your listing

### Tips for Successful Listings

- **Use clear photos** — Multiple angles, close-ups of details
- **Write detailed descriptions** — Include brand, model, year, hours
- **Price competitively** — Check similar listings for market rates
- **Add a condition report** — Buyers trust verified inspections
- **Respond quickly** — Fast responses lead to more sales

### Managing Offers

- You''ll be notified when buyers make offers
- You can accept, decline, or counter any offer
- Accepted offers create a transaction automatically', 1),

('condition-reports', 'Understanding Condition Reports', 'selling', '## Equipment Condition Reports

Condition reports provide detailed assessments of your equipment''s state.

### Grading Scale

| Grade | Rating | Description |
|-------|--------|-------------|
| **A** | Excellent | Like new, minimal wear |
| **B** | Good | Normal wear, fully functional |
| **C** | Fair | Visible wear, works with minor issues |
| **D** | Poor | Significant wear, needs repairs |
| **F** | Failing | Major issues, parts only |

### Score Categories

Each category is scored 1-10:

- **Mechanical** — Engine, hydraulics, moving parts
- **Cosmetic** — Paint, body, exterior condition
- **Electrical** — Wiring, controls, electronics

### Adding a Condition Report

1. Go to your listing''s **Edit** page
2. Scroll to the **Condition Report** section
3. Select the overall grade
4. Set scores for mechanical, cosmetic, and electrical
5. Add hours of use and last service date
6. Upload condition photos
7. Save the report

Verified sellers'' reports get a **"Verified Inspection"** badge.', 2),

('shipping-tips', 'Shipping Heavy Equipment', 'shipping', '## Shipping Industrial Equipment

### Planning Your Shipment

1. **Get dimensions and weight** — Accurate measurements are essential
2. **Choose a carrier** — Flatbed trucks for large equipment, freight for smaller items
3. **Get quotes** — Compare rates from multiple carriers
4. **Schedule pickup** — Coordinate with the buyer and carrier

### Packaging Guidelines

- **Secure all moving parts** — Lock booms, arms, and attachments
- **Drain fluids** — Required for most carriers
- **Protect control panels** — Cover displays and sensitive electronics
- **Document condition** — Photos before loading for insurance purposes

### After Shipping

1. Mark the transaction as **Shipped** on Metal Gear
2. Enter the **tracking number** and **carrier name**
3. The buyer will be notified
4. Buyer confirms delivery to release payment

### Insurance

- Always get shipping insurance for valuable equipment
- Document the equipment''s condition before shipping
- Keep all receipts and tracking information', 1),

('account-settings', 'Managing Your Account', 'account', '## Account Settings

### Profile Information

Update your profile from the **Profile** page:

- Display name and full name
- Company name
- Bio and industry
- Phone number
- Location (city and state)
- Avatar photo

### Subscription Plans

Manage your subscription from the **Pricing** page:

- **Free** — Basic features, 3 listings
- **Premium** — Enhanced features, 15 listings, $29.99/mo
- **Boost** — Full access, 50 listings, $79.99/mo

### Privacy & Security

- Use a strong, unique password
- Enable two-factor authentication when available
- Review your listing visibility settings
- Check your email notification preferences', 1),

('safety-guidelines', 'Safety Guidelines', 'safety', '## Buying & Selling Safely

### For Buyers

- **Verify the seller** — Check ratings, reviews, and trust scores
- **Inspect before paying** — Request viewings for expensive equipment
- **Use escrow payments** — Never pay outside the platform
- **Document everything** — Keep records of all communications
- **Check condition reports** — Look for verified inspections

### For Sellers

- **Verify buyer identity** — Be cautious of unusual requests
- **Use platform payments** — Escrow protects both parties
- **Ship with tracking** — Always use trackable shipping
- **Document condition** — Photos before and after shipping
- **Respond professionally** — Good communication builds trust

### Red Flags

- Requests to pay outside the platform
- Pressure to ship before payment clears
- Offers that seem too good to be true
- Requests for personal financial information
- Buyers who refuse to use escrow

### Report Issues

If you encounter suspicious activity, use the **Report** feature on any listing or profile.', 1),

('trust-scores', 'Trust Scores & Reviews', 'safety', '## How Trust Scores Work

Every user has a trust score from 0-100 based on their activity and reviews.

### Scoring Factors

- **Review ratings** — Average of all buyer and seller reviews
- **Transaction history** — Completed transactions boost your score
- **Account verification** — Verified accounts get a badge
- **Response time** — Quick responses are valued

### Leaving Reviews

After a completed transaction:

1. Go to the **Transaction Details** page
2. Rate the other party (1-5 stars)
3. Leave an optional comment
4. Your review is visible on their profile

### Review Guidelines

- Be honest and fair
- Focus on the transaction experience
- Don''t include personal information
- One review per transaction per party', 2),

('bulk-import', 'Bulk Listing Import', 'selling', '## Import Multiple Listings

If you have many items to list, use our **CSV Import** feature.

### How to Import

1. Go to **My Listings** → **Import Listings**
2. Download the CSV template
3. Fill in your equipment data
4. Upload the completed CSV file
5. Review and publish

### CSV Format

Required columns:
- `title` — Equipment name
- `category` — Must match our categories
- `condition` — new, like_new, good, fair, salvage
- `price` — Price in dollars (or leave blank for "Contact for Price")
- `description` — Equipment description
- `location_city` — City name
- `location_state` — State abbreviation

### Tips

- Keep titles concise but descriptive
- Include brand and model in the title
- Set accurate conditions to build trust
- Add photos individually after import', 3),

('collections-guide', 'Organizing with Collections', 'buying', '## Listing Collections

Collections help you organize equipment you''re interested in.

### Creating Collections

1. Go to the **Collections** page
2. Click **New Collection**
3. Name it (e.g., "CNC Machines Under $50K")
4. Add an optional description
5. Choose public or private

### Adding Listings

- On any listing page, click the **folder icon**
- Select an existing collection or create a new one
- Listings can be in multiple collections

### Public Collections

- Share your collections with anyone
- Great for team purchasing decisions
- Accessible via a shareable URL', 2),

('scheduling-viewings', 'Scheduling Equipment Viewings', 'buying', '## In-Person Equipment Viewings

### For Buyers

1. Find the **Request Viewing** button on listing pages
2. Select your preferred date and time
3. Add an optional message
4. The seller will accept or decline

### For Sellers

1. Go to the **Schedule** page
2. Set your weekly availability
3. Choose which days and hours you''re available
4. Viewing requests will appear for you to manage

### Tips

- Schedule during business hours for best response
- Include specific questions in your viewing message
- Arrive on time and be prepared with questions
- Bring someone knowledgeable about the equipment type', 3),

('pricing-plans', 'Subscription Plans Explained', 'account', '## Metal Gear Pricing Plans

### Free Plan
- 3 active listings
- 5 photos per listing
- 10 conversations
- 100-mile search radius
- Basic analytics

### Premium Plan — $29.99/month
- 15 active listings
- 15 photos per listing
- 3 videos per listing
- Unlimited conversations
- 500-mile search radius
- Advanced analytics

### Boost Plan — $79.99/month
- 50 active listings
- 25 photos per listing
- 5 videos per listing
- Unlimited everything
- Priority support
- Featured listings

### How to Upgrade

1. Go to the **Pricing** page
2. Select your preferred plan
3. Complete payment via Stripe
4. Your plan activates immediately', 2),

('contact-support', 'Getting Help & Support', 'getting_started', '## Need Help?

### Self-Service

- Browse this **Help Center** for answers
- Search articles by keyword
- Check the FAQ section below

### Contact Us

If you can''t find what you need:

1. Use the **Contact Support** form on this page
2. Select a category for your issue
3. Describe your problem in detail
4. We''ll respond within 24-48 hours

### Emergency Issues

For urgent payment or safety concerns:
- Open a dispute on the transaction page
- Report suspicious listings or users
- Email support directly for time-sensitive issues

### Feedback

We''re always improving! Let us know:
- What features you''d like to see
- Issues you''ve encountered
- Suggestions for improvement', 3)

ON CONFLICT (slug) DO NOTHING;
