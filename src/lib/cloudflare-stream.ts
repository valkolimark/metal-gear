const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN!
const CUSTOMER_SUBDOMAIN = process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN!

export interface StreamUploadResult {
  videoId: string
  thumbnailUrl: string
  embedUrl: string
  hlsUrl: string
}

export interface StreamVideoDetails {
  uid: string
  status: { state: string }
  duration: number
  thumbnail: string
  playback: { hls: string }
  readyToStream: boolean
}

export async function uploadToStream(
  file: Buffer,
  filename: string
): Promise<StreamUploadResult> {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(file)]), filename)

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${STREAM_TOKEN}` },
      body: formData,
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudflare Stream upload failed: ${text}`)
  }

  const json = await res.json()
  const video = json.result

  return {
    videoId: video.uid,
    thumbnailUrl: `https://${CUSTOMER_SUBDOMAIN}/${video.uid}/thumbnails/thumbnail.jpg`,
    embedUrl: `https://iframe.videodelivery.net/${video.uid}`,
    hlsUrl: `https://${CUSTOMER_SUBDOMAIN}/${video.uid}/manifest/video.m3u8`,
  }
}

export async function getStreamVideo(videoId: string): Promise<StreamVideoDetails> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${videoId}`,
    {
      headers: { Authorization: `Bearer ${STREAM_TOKEN}` },
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to get Stream video ${videoId}`)
  }

  const json = await res.json()
  return json.result
}

export async function deleteStreamVideo(videoId: string): Promise<void> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${videoId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STREAM_TOKEN}` },
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to delete Stream video ${videoId}: ${text}`)
  }
}
