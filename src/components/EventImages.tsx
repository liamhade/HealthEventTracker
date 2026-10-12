import { useState } from 'react'
import type { EventImage } from '../lib/api'
import { useSignedUrls } from '../hooks/queries'
import { XIcon } from './icons'

/** Square thumbnail strip; tapping one opens a full-screen viewer. */
export function EventImages({ images, size = 'md' }: { images: EventImage[]; size?: 'sm' | 'md' }) {
  const paths = images.map((i) => i.storage_path)
  const { data: urls } = useSignedUrls(paths)
  const [openPath, setOpenPath] = useState<string | null>(null)

  if (!images.length) return null
  const thumb = size === 'sm' ? 'size-14' : 'size-24'

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img) => {
          const url = urls?.[img.storage_path]
          return (
            <button
              key={img.id}
              type="button"
              className={`${thumb} shrink-0 overflow-hidden rounded-xl bg-surface-2`}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                setOpenPath(img.storage_path)
              }}
              aria-label="View image"
            >
              {url && <img src={url} alt="" loading="lazy" className="size-full object-cover" />}
            </button>
          )
        })}
      </div>
      {openPath && urls?.[openPath] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            setOpenPath(null)
          }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="pt-safe absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/10 text-white"
            aria-label="Close"
          >
            <XIcon />
          </button>
          <img src={urls[openPath]} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </>
  )
}
