import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  checkRateLimit,
  getRequestIdentifier,
  rateLimitResponse,
} from "@/lib/security/rate-limit"
import { analyzePhotos } from "@/app/actions/snap-list"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limit keyed by user id to prevent abuse.
  const identifier = `snap_list:${user.id}`
  const rl = checkRateLimit(getRequestIdentifier(request) + identifier, "aiImageAnalysis")
  if (!rl.allowed) {
    return rateLimitResponse(rl)
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const photoUrls = (body as { photoUrls?: unknown })?.photoUrls
  if (!Array.isArray(photoUrls)) {
    return NextResponse.json({ error: "photoUrls array required" }, { status: 400 })
  }

  const result = await analyzePhotos(photoUrls as string[])
  if ("error" in result) {
    const status = result.code === "quota_exceeded" ? 402 : 400
    return NextResponse.json(result, { status })
  }

  return NextResponse.json(result, { status: 202 })
}
