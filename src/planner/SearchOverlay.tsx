import { useEffect, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FileText, Flag, Search, SquareCheck, X } from "lucide-react";
import { searchEverything, type SearchResult } from "./search";
import { usePlanner } from "./store";

const icons = { task: SquareCheck, note: FileText, goal: Flag } as const;

/** One search over tasks, notes and goals; it opens over the page and leaves it as it was. */
export function SearchOverlay({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (result: SearchResult) => void;
}) {
  const planner = usePlanner();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const results = useMemo(
    () => searchEverything(planner.tasks, planner.notes, planner.goals, query),
    [planner.tasks, planner.notes, planner.goals, query],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (result: SearchResult | undefined) => {
    if (!result) return;
    onClose();
    onPick(result);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ot-scrim" />
        <Dialog.Content className="search" aria-describedby={undefined}>
          <Dialog.Title className="ot-visually-hidden">Search</Dialog.Title>
          <div className="search-field ot-glass">
            <Search size={18} strokeWidth={1.8} aria-hidden="true" />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `search-${active}` : undefined}
              aria-label="Search tasks, notes and goals"
              placeholder="Search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(results.length - 1, index + 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(0, index - 1));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  pick(results[active]);
                }
              }}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  input.current?.focus();
                }}
              >
                <X size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="search-panel">
            <header>
              <h2>{query.trim() ? "Results" : "Everything"}</h2>
              {query.trim() ? <span>{results.length}</span> : null}
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            </header>
            {!query.trim() ? (
              <p className="search-hint">Tasks, notes and goals</p>
            ) : results.length ? (
              <ul ref={list} id="search-results" role="listbox" aria-label="Results">
                {results.map((result, index) => {
                  const Icon = icons[result.kind];
                  return (
                    <li
                      key={result.key}
                      id={`search-${index}`}
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => pick(result)}
                    >
                      <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                      <span>
                        <strong>{result.title}</strong>
                        <em>{result.subtitle}</em>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="search-hint">No matches</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
