import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/auth'
import { useTheme, type ThemePreference } from '../hooks/theme'
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from '../hooks/queries'
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons'
import { Button, CenteredSpinner, ErrorNote, ScreenHeader, Spinner } from '../components/ui'
import type { Tag } from '../lib/api'

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

export function SettingsPage() {
  const user = useUser()
  const qc = useQueryClient()
  const { preference, setPreference } = useTheme()

  const signOut = async () => {
    await supabase.auth.signOut()
    qc.clear()
  }

  return (
    <div className="min-h-dvh">
      <ScreenHeader title="Settings" />
      <div className="pb-safe mx-auto max-w-2xl space-y-8 px-4 pt-4 pb-12">
        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">Appearance</h2>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {themeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPreference(o.value)}
                className={`min-h-9 rounded-lg text-[14px] font-medium transition ${
                  preference === o.value ? 'bg-bg text-fg shadow-soft' : 'text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        <TagManager />

        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">Account</h2>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-3">
            <span className="truncate text-[15px]">{user.email ?? user.user_metadata?.full_name ?? 'Signed in'}</span>
            <Button variant="danger" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}

function TagManager() {
  const { data: tags, isLoading, error } = useTags()
  const createTag = useCreateTag()
  const [draft, setDraft] = useState('')

  const add = () => {
    if (!draft.trim()) return
    createTag.mutate(draft, { onSuccess: () => setDraft('') })
  }

  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">Tags</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {isLoading && <CenteredSpinner />}
        {tags?.map((tag) => <TagRow key={tag.id} tag={tag} />)}
        <div className="flex gap-2 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a tag"
            maxLength={50}
            enterKeyHint="done"
            className="min-h-11 flex-1 rounded-xl border border-border bg-bg px-3 outline-none focus:border-accent-strong"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || createTag.isPending}
            className="flex size-11 items-center justify-center rounded-xl bg-surface-2 text-accent-strong disabled:opacity-40"
            aria-label="Add tag"
          >
            {createTag.isPending ? <Spinner /> : <PlusIcon />}
          </button>
        </div>
      </div>
      <ErrorNote error={error ?? createTag.error} />
    </section>
  )
}

function TagRow({ tag }: { tag: Tag }) {
  const rename = useRenameTag()
  const remove = useDeleteTag()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)

  const commit = () => {
    if (!name.trim() || name.trim() === tag.name) {
      setName(tag.name)
      setEditing(false)
      return
    }
    rename.mutate({ id: tag.id, name }, { onSuccess: () => setEditing(false) })
  }

  const onDelete = () => {
    if (window.confirm(`Delete the tag "${tag.name}"? It will be removed from all events.`)) remove.mutate(tag.id)
  }

  const iconButton = 'flex size-10 items-center justify-center rounded-full hover:bg-surface-2'

  return (
    <div className="border-b border-border">
      <div className="flex min-h-14 items-center gap-1 px-3">
        {editing ? (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') {
                  setName(tag.name)
                  setEditing(false)
                }
              }}
              autoFocus
              maxLength={50}
              className="min-h-10 flex-1 rounded-lg border border-border bg-bg px-2 outline-none focus:border-accent-strong"
            />
            <button type="button" onClick={commit} className={`${iconButton} text-accent-strong`} aria-label="Save">
              {rename.isPending ? <Spinner /> : <CheckIcon />}
            </button>
            <button
              type="button"
              onClick={() => {
                setName(tag.name)
                setEditing(false)
              }}
              className={`${iconButton} text-muted`}
              aria-label="Cancel"
            >
              <XIcon />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 truncate text-[15px]">{tag.name}</span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={`${iconButton} text-accent-strong`}
              aria-label={`Rename ${tag.name}`}
            >
              <PencilIcon width={18} height={18} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={remove.isPending}
              className={`${iconButton} text-danger`}
              aria-label={`Delete ${tag.name}`}
            >
              {remove.isPending ? <Spinner /> : <TrashIcon width={18} height={18} />}
            </button>
          </>
        )}
      </div>
      {(rename.error || remove.error) && (
        <div className="px-3 pb-3">
          <ErrorNote error={rename.error ?? remove.error} />
        </div>
      )}
    </div>
  )
}
