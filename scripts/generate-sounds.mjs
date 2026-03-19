/**
 * Generate notification sound files for Metal Gear.
 * Uses raw WAV generation (no external dependencies).
 * Run: node scripts/generate-sounds.mjs
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SOUNDS_DIR = join(__dirname, '..', 'public', 'sounds')

const SAMPLE_RATE = 44100

function generateSamples(durationSec, generator) {
  const numSamples = Math.floor(SAMPLE_RATE * durationSec)
  const samples = new Float32Array(numSamples)
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    samples[i] = generator(t, durationSec)
  }
  return samples
}

function samplesToWav(samples) {
  const numSamples = samples.length
  const bytesPerSample = 2
  const dataSize = numSamples * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20)  // PCM
  buffer.writeUInt16LE(1, 22)  // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(16, 34) // bits per sample

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    const val = Math.floor(s * 32767)
    buffer.writeInt16LE(val, 44 + i * 2)
  }

  return buffer
}

// Standard notification: clean metallic ping, descending A5→A4 with harmonics
function standardNotification(t, duration) {
  const envelope = Math.exp(-t * 8) * Math.max(0, 1 - t / duration)
  const freq1 = 880 * Math.exp(-t * 2.3) // descending from A5
  const freq2 = freq1 * 2 // harmonic
  const freq3 = freq1 * 3 // metallic harmonic
  const signal =
    0.5 * Math.sin(2 * Math.PI * freq1 * t) +
    0.25 * Math.sin(2 * Math.PI * freq2 * t) +
    0.1 * Math.sin(2 * Math.PI * freq3 * t)
  return signal * envelope * 0.4
}

// High-priority alert: two-tone industrial pulse
function highPriorityAlert(t, duration) {
  // Two distinct tones: low → high
  let signal = 0
  if (t < 0.25) {
    // First tone: low E3 (165 Hz) with grit
    const env = Math.exp(-t * 4) * (1 - t / 0.25)
    const f = 165
    signal =
      0.6 * Math.sin(2 * Math.PI * f * t) +
      0.2 * Math.sin(2 * Math.PI * f * 2 * t) +
      0.15 * Math.sin(2 * Math.PI * f * 3 * t) +
      0.05 * Math.sin(2 * Math.PI * f * 5 * t) // adds grit
    signal *= env
  } else if (t >= 0.15 && t < 0.55) {
    // Second tone: higher A4 (440 Hz), attention-grabbing
    const t2 = t - 0.15
    const env = Math.exp(-t2 * 5) * Math.max(0, 1 - t2 / 0.4)
    const f = 440
    signal =
      0.5 * Math.sin(2 * Math.PI * f * t2) +
      0.3 * Math.sin(2 * Math.PI * f * 2 * t2) +
      0.1 * Math.sin(2 * Math.PI * f * 3 * t2)
    signal *= env
  }
  return signal * 0.45
}

// Generate and write WAV files
const standardSamples = generateSamples(0.4, standardNotification)
const alertSamples = generateSamples(0.6, highPriorityAlert)

writeFileSync(join(SOUNDS_DIR, 'notification.wav'), samplesToWav(standardSamples))
writeFileSync(join(SOUNDS_DIR, 'alert.wav'), samplesToWav(alertSamples))

console.log('Generated notification.wav and alert.wav in public/sounds/')
console.log('Note: WAV files are used directly — browsers support WAV natively.')
