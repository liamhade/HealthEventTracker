import { useTags } from '../hooks/queries'
import { TagChip } from './ui'

/** Horizontal row of tag chips; an empty selection means "all events". */
export function TagFilter({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: tags } = useTags()
  if (!tags?.length) return null
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])
  return (
    <div className="flex gap-2 overflow-x-auto px-5 pt-1 pb-3 [scrollbar-width:none]">
      <TagChip name="All" selected={value.length === 0} onClick={() => onChange([])} />
      {tags.map((t) => (
        <TagChip key={t.id} name={t.name} selected={value.includes(t.id)} onClick={() => toggle(t.id)} />
      ))}
    </div>
  )
}

