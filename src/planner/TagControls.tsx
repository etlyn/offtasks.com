import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Search, Tag } from "lucide-react";
import { errorText } from "./notices";
import { tagKey, tagName, tagNameLimit, type TaskTag } from "./tags";

export function TagFilter({ tags, value, onChange, label = "Filter by tag", allLabel = "All tasks" }: {
  tags: TaskTag[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  allLabel?: string;
}) {
  if (!tags.length) return null;
  return (
    <label className="tag-filter" data-active={!!value || undefined}>
      <Tag size={14} strokeWidth={1.8} aria-hidden="true" />
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select>
      <ChevronDown size={13} strokeWidth={1.8} aria-hidden="true" />
    </label>
  );
}

export function TagLabels({ tags }: { tags: TaskTag[] }) {
  return tags.map((tag) => (
    <span className="task-label" key={tag.id}>
      <Tag size={11} strokeWidth={1.8} aria-hidden="true" />
      {tag.name}
    </span>
  ));
}

export function TagPicker({ id, open, disabled, tags, selected, onToggle, onCreate, label = "Task tags" }: {
  id: string;
  open: boolean;
  disabled: boolean;
  tags: TaskTag[];
  selected: string[];
  onToggle: (id: string) => void;
  onCreate: (name: string) => string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const name = tagName(query);
  const needle = tagKey(name);
  const matching = tags.filter((tag) => tagKey(tag.name).includes(needle));
  const exact = matching.find((tag) => tagKey(tag.name) === needle);

  useEffect(() => {
    if (open) field.current?.focus({ preventScroll: true });
    else {
      setQuery("");
      setError("");
    }
  }, [open]);

  const create = () => {
    try {
      onToggle(onCreate(name));
      setQuery("");
      setError("");
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  return (
    <div className="composer-tag-expand" id={id} data-open={open || undefined} aria-hidden={!open}>
      <div className="composer-tag-clip">
        <div className="tag-picker" role="group" aria-label={label}>
          <label className="tag-search">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input
              ref={field}
              type="text"
              aria-label="Find or create a tag"
              placeholder="Find or create a tag"
              maxLength={tagNameLimit}
              disabled={!open || disabled}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setError(""); }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                if (!name) return;
                if (exact) {
                  onToggle(exact.id);
                  setQuery("");
                } else create();
              }}
            />
          </label>
          <div className="tag-picker-options">
            {matching.map((tag) => (
              <button key={tag.id} type="button" aria-pressed={selected.includes(tag.id)} disabled={!open || disabled} onClick={() => onToggle(tag.id)}>
                <Tag size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{tag.name}</span>
                {selected.includes(tag.id) ? <Check size={15} strokeWidth={1.8} aria-hidden="true" /> : null}
              </button>
            ))}
            {name && !exact ? (
              <button type="button" className="tag-picker-create" disabled={!open || disabled} onClick={() => { create(); field.current?.focus(); }}>
                <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Create “{name}”</span>
              </button>
            ) : null}
          </div>
          {error ? <p className="tag-field-error" role="alert">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
