import { z } from 'zod'
import {
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
} from '@/lib/constants'

// ─── Listing ──────────────────────────────────────────────────

export const listingSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be under 200 characters')
    .trim(),
  description: z
    .string()
    .max(5000, 'Description must be under 5,000 characters')
    .optional()
    .default(''),
  category: z.enum(EQUIPMENT_CATEGORIES as unknown as [string, ...string[]], {
    message: 'Please select a category',
  }),
  industry: z.string().optional().default(''),
  condition: z.enum(
    LISTING_CONDITIONS.map((c) => c.value) as [string, ...string[]],
    { message: 'Please select a condition' }
  ),
  price_cents: z
    .string()
    .optional()
    .default('')
    .transform((val) => {
      if (!val) return null
      const num = Math.round(parseFloat(val) * 100)
      return isNaN(num) || num < 0 ? null : num
    }),
  negotiable: z.boolean().default(false),
  contact_for_price: z.boolean().default(false),
  location_city: z
    .string()
    .min(1, 'City is required')
    .max(100)
    .trim(),
  location_state: z
    .string()
    .min(1, 'State is required')
    .max(2)
    .trim()
    .toUpperCase(),
})

export type ListingFormData = z.infer<typeof listingSchema>

// ─── Profile ──────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  display_name: z
    .string()
    .max(50, 'Display name must be under 50 characters')
    .trim()
    .optional()
    .nullable(),
  company_name: z
    .string()
    .max(100, 'Company name must be under 100 characters')
    .trim()
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, 'Bio must be under 500 characters')
    .trim()
    .optional()
    .nullable(),
  phone: z
    .string()
    .max(20)
    .regex(/^[\d\s\-+()]*$/, 'Invalid phone number format')
    .optional()
    .nullable(),
  industry: z.string().optional().nullable(),
  location_city: z.string().max(100).trim().optional().nullable(),
  location_state: z.string().max(2).trim().optional().nullable(),
})

export type ProfileFormData = z.infer<typeof profileSchema>

// ─── Message ──────────────────────────────────────────────────

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message must be under 2,000 characters')
    .trim(),
})

export type MessageFormData = z.infer<typeof messageSchema>

// ─── Contact/Inquiry ──────────────────────────────────────────

export const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message must be under 2,000 characters')
    .trim(),
})
