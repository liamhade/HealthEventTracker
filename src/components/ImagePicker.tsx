import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'
import type { ImageDraft } from '../lib/api'
import { prepareImage } from '../lib/images'
import { useSignedUrls } from '../hooks/queries'
import { CameraIcon, ChevronLeftIcon, ImageIcon, XIcon } from './icons'
import { ErrorNote, Spinner } from './ui'

export function ImagePicker({
  value,
  onChange,
}: {
  value: ImageDraft[]
  onChange: Dispatch<SetStateAction<ImageDraft[]>>
}) {
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(0)
  const [error, setError] = useState<unknown>(null)

  const existingPaths = value.flatMap((d) => (d.kind === 'existing' ? [d.storage_path] : []))
  const { data: signedUrls } = useSignedUrls(existingPaths)

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setError(null)
    setProcessing((n) => n + files.length)
    for (const file of files) {
      try {
        const prepared = await prepareImage(file)
        const draft: ImageDraft = {
          kind: 'new',
          key: crypto.randomUUID(),
          prepared,
          previewUrl: URL.createObjectURL(prepared.blob),
        }
        // Functional update, so images processed concurrently don't overwrite each other.
        onChange((prev) => [...prev, draft])
      } catch (err) {
        console.error(err)
        setError(new Error(`Couldn't process ${file.name || 'that image'}.`))
      } finally {
        setProcessing((n) => n - 1)
      }
    }
  }

  const remove = (index: number) => {
    const draft = value[index]
    if (draft.kind === 'new') URL.revokeObjectURL(draft.previewUrl)
    onChange((prev) => prev.filter((_, i) => i !== index))
  }

  const moveEarlier = (index: number) => {
    if (index === 0) return
    onChange((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  return (
    <div className="space-y-3">
      {(value.length > 0 || processing > 0) && (
        <div className="flex flex-wrap gap-2">
          {value.map((draft, index) => {
            const src = draft.kind === 'new' ? draft.previewUrl : signedUrls?.[draft.storage_path]
            return (
              <div
                key={draft.kind === 'new' ? draft.key : draft.id}
                className="relative size-24 overflow-hidden rounded-xl bg-surface-2"
              >
                {src && <img src={src} alt="" className="size-full object-cover" />}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="Remove image"
                >
                  <XIcon width={16} height={16} />
                </button>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => moveEarlier(index)}
                    className="absolute bottom-1 left-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                    aria-label="Move image earlier"
                  >
                    <ChevronLeftIcon width={16} height={16} />
                  </button>
                )}
              </div>
            )
          })}
          {Array.from({ length: processing }, (_, i) => (
            <div key={`p${i}`} className="flex size-24 items-center justify-center rounded-xl bg-surface-2">
              <Spinner />
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 text-[15px] font-medium text-accent-strong"
        >
          <CameraIcon /> Camera
        </button>
        <button
          type="button"
          onClick={() => libraryInput.current?.click()}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 text-[15px] font-medium text-accent-strong"
        >
          <ImageIcon /> Library
        </button>
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} />
      <input ref={libraryInput} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={handleFiles} />
      <ErrorNote error={error} />
    </div>
  )
}
