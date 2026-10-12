import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useUser } from '../hooks/auth'
import { isSyntheticEmail } from '../lib/username'
import { useTheme, type ThemePreference } from '../hooks/theme'
import { useCreateTag, useDeleteTag, useRenameTag, useTags } from '../hooks/queries'
import { CheckIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from '../components/icons'
import { Button, CenteredSpinner, ErrorNote, ScreenHeader, Spinner } from '../components/ui'
import type { Tag } from '../lib/api'

function accountLabel(user: User): string {
  const username = user.user_metadata?.username
  if (typeof username === 'string' && username) return username
  if (user.email && !isSyntheticEmail(user.email)) return user.email
  return user.user_metadata?.full_name ?? 'Signed in'
}

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
      <div className="pb-safe mx-auto max-w-2xl space-y-9 px-5 pt-5 pb-12">
        <section className="space-y-2">
          <h2 className="px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Appearance</h2>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
            {themeOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPreference(o.value)}
                className={`min-h-11 rounded-lg text-[14px] font-medium transition ${
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
          <h2 className="px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Account</h2>
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
            <span className="truncate text-[15px]">{accountLabel(user)}</span>
            <Button variant="danger" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </section>

        {typeof user.user_metadata?.username === 'string' && <RecoveryEmail user={user} />}
      </div>
    </div>
  )
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Username accounts can attach a real email so a forgotten password can be reset. */
function RecoveryEmail({ user }: { user: User }) {
  const current = user.email && !isSyntheticEmail(user.email) ? user.email : null
  const pending = user.new_email && user.new_email !== user.email ? user.new_email : null
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const inputClass =
    'min-h-12 w-full rounded-xl border border-border bg-bg px-4 outline-none focus:border-accent-strong'

  const save = async () => {
    setError(null)
    setNotice(null)
    const next = email.trim().toLowerCase()
    if (!EMAIL_PATTERN.test(next)) return setError(new Error('Enter a valid email address.'))
    if (next !== confirm.trim().toLowerCase()) return setError(new Error("The email addresses don't match."))
    if (next === current) return setEditing(false)

    setBusy(true)
    const { data, error } = await supabase.auth.updateUser({ email: next }, { emailRedirectTo: window.location.origin })
    setBusy(false)
    if (error) {
      const taken = error.code === 'email_exists' || error.code === 'user_already_exists'
      return setError(taken ? new Error('That email already belongs to another account.') : error)
    }
    setEditing(false)
    setEmail('')
    setConfirm('')
    setNotice(
      data.user?.email === next
        ? 'Recovery email saved.'
        : `We sent a confirmation link to ${next}. It becomes your recovery email once you open it.`,
    )
  }

  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Recovery email</h2>
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4">
        {!editing ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={`truncate text-[15px] ${current ? '' : 'text-muted'}`}>{current ?? 'None added'}</p>
              {pending && <p className="truncate text-[13px] text-muted">Waiting for confirmation: {pending}</p>}
            </div>
            <Button variant="ghost" onClick={() => setEditing(true)}>
              {current ? 'Change' : 'Add'}
            </Button>
          </div>
        ) : (
          <>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              autoCapitalize="none"
              className={inputClass}
            />
            <input
              type="email"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm email address"
              autoComplete="email"
              autoCapitalize="none"
              className={inputClass}
            />
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy} className="flex-1">
                {busy ? <Spinner /> : 'Save'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditing(false)
                  setError(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </>
        )}
        <p className="text-[13px] text-muted">
          {current
            ? 'Used only to reset your password. You still sign in with your username.'
            : "Without one, a forgotten password can't be reset. It's only used for password resets."}
        </p>
        {notice && <p className="rounded-xl bg-accent-soft px-3 py-2 text-[14px]">{notice}</p>}
        <ErrorNote error={error} />
      </div>
    </section>
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
      <h2 className="px-1 text-[13px] font-semibold tracking-wide text-muted uppercase">Tags</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {isLoading && <CenteredSpinner />}
        {tags?.map((tag) => <TagRow key={tag.id} tag={tag} />)}
        <div className="flex gap-2 p-4">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a tag"
            maxLength={50}
            enterKeyHint="done"
            className="min-h-12 flex-1 rounded-xl border border-border bg-bg px-4 outline-none focus:border-accent-strong"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim() || createTag.isPending}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-strong disabled:opacity-40"
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
      <div className="flex min-h-14 items-center gap-1 px-4">
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
