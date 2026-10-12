import { useState, type FormEvent } from 'react'
import { useCreateTag, useTags } from '../hooks/queries'
import { PlusIcon } from './icons'
import { ErrorNote, Spinner, TagChip } from './ui'

export function TagPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: tags, isLoading } = useTags()
  const createTag = useCreateTag()
  const [draft, setDraft] = useState('')

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  const add = (e?: FormEvent) => {
    e?.preventDefault()
    const name = draft.trim()
    if (!name || isLoading) return
    const existing = tags?.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!value.includes(existing.id)) onChange([...value, existing.id])
      setDraft('')
      return
    }
    createTag.mutate(name, {
      onSuccess: (tag) => {
        onChange([...value, tag.id])
        setDraft('')
      },
    })
  }

  return (
    <div className="space-y-3">
      {isLoading ? (
        <Spinner />
      ) : (
        tags &&
        tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <TagChip key={t.id} name={t.name} selected={value.includes(t.id)} onClick={() => toggle(t.id)} />
            ))}
          </div>
        )
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add(e)
          }}
          placeholder="New tag"
          maxLength={50}
          enterKeyHint="done"
          className="min-h-12 flex-1 rounded-xl border border-border bg-bg px-4 outline-none focus:border-accent-strong"
        />
        <button
          type="button"
          onClick={() => add()}
          disabled={!draft.trim() || isLoading || createTag.isPending}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-strong disabled:opacity-40"
          aria-label="Add tag"
        >
          {createTag.isPending ? <Spinner /> : <PlusIcon />}
        </button>
      </div>
      <ErrorNote error={createTag.error} />
    </div>
  )
}
