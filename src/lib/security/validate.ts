import { z } from 'zod'

// Strip null bytes transform — reusable
const stripNullBytes = (s: string) => s.replace(/\0/g, '')

// Common reusable schemas
export const SafeIdSchema = z.string().uuid('Invalid ID format')

export const SafeShortStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .transform(stripNullBytes)

export const SafeStringSchema = z
  .string()
  .trim()
  .min(1)
  .max(10000)
  .transform(stripNullBytes)

export const SafePriceSchema = z
  .number()
  .min(0, 'Price cannot be negative')
  .max(100_000_000, 'Price exceeds maximum')
  .finite()

// Feed post schema
export const CreateFeedPostSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .transform(stripNullBytes),
  hashtags: z.array(z.string().max(50)).max(10).optional().default([]),
  taggedUserIds: z.array(SafeIdSchema).max(10).optional().default([]),
})

// AI search schema — caps query length
export const AISearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .transform(stripNullBytes),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(10)
    .optional(),
  locationContext: z
    .object({
      lat: z.number(),
      lng: z.number(),
      city: z.string().max(100),
    })
    .optional(),
  intent_hint: z.enum(['problem']).optional(),
})

// AI copy action schema
export const AICopySchema = z.object({
  action: z.enum([
    'generate_description',
    'optimize_title',
    'score_quality',
  ]),
  listing: z.object({
    title: z.string().max(500).optional(),
    manufacturer: z.string().max(200).optional(),
    model: z.string().max(200).optional(),
    serialNumber: z.string().max(100).optional(),
    year: z.number().min(1900).max(new Date().getFullYear() + 1).optional(),
    condition: z.string().max(50).optional(),
    tier1: z.string().max(100).optional(),
    tier2: z.string().max(100).optional(),
    subcategory: z.string().max(100).optional(),
    specs: z.record(z.string(), z.string().max(500)).optional(),
    description: z.string().max(10000).optional(),
    photoCount: z.number().min(0).max(100).optional(),
    hasVideo: z.boolean().optional(),
    price: z.number().min(0).max(100_000_000).optional(),
    location: z.string().max(200).optional(),
  }),
  regenerate: z.boolean().optional(),
})

// SOS AI schema
export const SOSAISchema = z.object({
  action: z.enum(['categorize', 'rank_responses', 'predict_demand']),
  description: z.string().max(5000).optional(),
  sosRequestId: z.string().uuid().optional(),
  responses: z
    .array(
      z.object({
        id: z.string(),
        sellerId: z.string(),
        sellerTrustScore: z.number(),
        responseTime: z.number(),
        priceEstimate: z.number().optional(),
        leadTimeDays: z.number().optional(),
        condition: z.string().optional(),
        description: z.string().max(5000),
        sellerEquipmentMatch: z.boolean(),
      })
    )
    .max(50)
    .optional(),
  sosDetails: z
    .object({
      subcategory: z.string().max(200),
      urgency: z.string().max(20),
      requiredSpecs: z.record(z.string(), z.string().max(500)).optional(),
      maxBudget: z.number().optional(),
    })
    .optional(),
  subcategory: z.string().max(200).optional(),
  region: z.string().max(100).optional(),
  lookbackDays: z.number().min(1).max(3650).optional(),
})

// AI chat schemas (Ask Metal Gear + Help Chat)
export const AIChatSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .transform(stripNullBytes),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .optional(),
})

export const HelpChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .transform(stripNullBytes),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(5000),
      })
    )
    .max(20)
    .optional(),
  context: z
    .object({
      pathname: z.string().max(500).optional(),
    })
    .optional(),
})

// Analyze image schema
export const AnalyzeImageSchema = z.object({
  wideShot: z.string().max(15_000_000).optional(), // ~10MB in base64
  nameplateShot: z.string().max(15_000_000).optional(),
  nameplateImageBase64: z.string().max(15_000_000).optional(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
  nameplateMimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).optional(),
})
