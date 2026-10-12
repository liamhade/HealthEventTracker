import imageCompression from 'browser-image-compression'

const MAX_DIMENSION = 1600
const MAX_SIZE_MB = 1

export type PreparedImage = {
  blob: Blob
  extension: 'webp' | 'jpg'
  mimeType: 'image/webp' | 'image/jpeg'
}

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  return /\.(heic|heif)$/i.test(file.name)
}

let webpSupport: boolean | undefined

// Safari historically can't encode WebP from a canvas (it silently returns PNG), so check first.
function canEncodeWebp(): boolean {
  if (webpSupport === undefined) {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      webpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp')
    } catch {
      webpSupport = false
    }
  }
  return webpSupport
}

async function heicToJpeg(file: File): Promise<File> {
  // heic2any is large, so only load it when an HEIC file actually shows up.
  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  const blob = Array.isArray(result) ? result[0] : result
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' })
}

/** Converts HEIC to JPEG if needed, then resizes and re-encodes to WebP (or JPEG fallback). */
export async function prepareImage(file: File): Promise<PreparedImage> {
  let source = file
  if (isHeic(file)) {
    try {
      source = await heicToJpeg(file)
    } catch (err) {
      // Some browsers (Safari) can decode HEIC natively; let compression try the original.
      console.warn('HEIC conversion failed, trying the original file', err)
    }
  }

  const webp = canEncodeWebp()
  const mimeType = webp ? 'image/webp' : 'image/jpeg'
  const blob = await imageCompression(source, {
    maxWidthOrHeight: MAX_DIMENSION,
    maxSizeMB: MAX_SIZE_MB,
    fileType: mimeType,
    initialQuality: 0.85,
    useWebWorker: true,
  })

  return { blob, mimeType, extension: webp ? 'webp' : 'jpg' }
}
