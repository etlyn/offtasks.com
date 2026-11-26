// Small building blocks shared by the planner's screens.
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import type { LucideIcon } from "lucide-react";
import { priorities, priorityColors } from "./model";

/** The rounded-square checkbox used for every task. */
export function Checkbox({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="ot-check"
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
    >
      <i>
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 7.4 5.9 10.2 11 4.4" />
        </svg>
      </i>
    </button>
  );
}

export function Switch({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="ot-switch"
      onClick={() => onChange(!checked)}
    />
  );
}

/**
 * A text area that is always as tall as its text. A hidden copy of the text
 * gives the box its height, so nothing has to be measured in script.
 */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
>(function AutoTextarea({ className = "", value, ...props }, ref) {
  return (
    <div className={`ot-autogrow ${className}`} data-value={`${value}\n`}>
      <textarea ref={ref} value={value} rows={1} {...props} />
    </div>
  );
});

/** Two or three choices with a thumb that slides to the chosen one. */
export function Segmented<Value extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: Value; label: string }[];
  value: Value;
  onChange: (value: Value) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const active = host.current?.querySelector<HTMLElement>('[aria-checked="true"]');
      if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, [value, options.length]);
  return (
    <div
      ref={host}
      className="ot-segments"
      role="radiogroup"
      aria-label={label}
      onKeyDown={(event) => {
        // As with any group of radio buttons, the arrow keys move the choice.
        const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
        if (!step) return;
        event.preventDefault();
        const index = options.findIndex((option) => option.value === value);
        const next = options[(index + step + options.length) % options.length];
        onChange(next.value);
        requestAnimationFrame(() => host.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus());
      }}
    >
      {thumb ? <span aria-hidden="true" style={{ width: thumb.width, translate: `${thumb.left - 2}px 0` }} /> : null}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A floating sheet: the planner's composer, editors and pickers all sit in one. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  size = "regular",
  className = "",
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "regular" | "wide" | "small";
  className?: string;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="ot-scrim" />
        <Dialog.Content
          className={`ot-sheet ot-sheet--${size} ${className}`}
          aria-describedby={undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <Dialog.Title className="ot-visually-hidden">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Only explicit, destructive choices open a confirmation. */
export function Confirm({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = true,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="ot-scrim ot-scrim--strong" />
        <AlertDialog.Content className="ot-confirm">
          <AlertDialog.Title>{title}</AlertDialog.Title>
          <AlertDialog.Description>{message}</AlertDialog.Description>
          <div>
            <AlertDialog.Cancel asChild>
              <button type="button" className="ot-button ot-button--soft" disabled={busy}>
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              className={`ot-button ${danger ? "ot-button--destructive" : ""}`}
              disabled={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Empty({ icon: Icon, children, card }: { icon: LucideIcon; children: ReactNode; card?: boolean }) {
  return (
    <div className={`ot-empty ${card ? "ot-empty--card" : ""}`}>
      <Icon size={24} strokeWidth={1.4} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** The wordmark's letters settle one by one while something loads. */
export function Loader({ label = "Loading" }: { label?: string }) {
  return (
    <span className="ot-loader" role="status" aria-label={label}>
      {Array.from("offtasks.").map((letter, index) => (
        <span key={index} aria-hidden="true" style={{ "--i": index } as React.CSSProperties}>
          {letter}
        </span>
      ))}
    </span>
  );
}

/** One to three small bars, as in the mobile app's goal lists. */
export function PriorityMark({ value }: { value: number }) {
  const level = Math.min(3, Math.max(0, value));
  const label = priorities[level].label;
  return (
    <svg className="ot-priority" viewBox="0 0 14 14" width="14" height="14" role="img" aria-label={`Priority: ${label}`}>
      {[0, 1, 2].map((bar) => (
        <rect
          key={bar}
          x={2 + bar * 4}
          y={9 - bar * 3}
          width="2.4"
          height={3 + bar * 3}
          rx="1"
          fill={bar < level ? priorityColors[level] : "currentColor"}
          opacity={bar < level ? 1 : 0.22}
        />
      ))}
    </svg>
  );
}

/** The four destinations, outlined at rest and filled when chosen. */
export function NavIcon({ name, selected }: { name: "board" | "calendar" | "tags" | "goals"; selected: boolean }) {
  const cut = "var(--nav-cut, var(--ot-surface))";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "tags" ? (
        <>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h6l8.2 8.2a2 2 0 0 1 0 2.8L15 19.7a2 2 0 0 1-2.8 0L4 11.5Z" fill={selected ? "currentColor" : "none"} />
          <circle cx="8.25" cy="8.25" r="1" fill={selected ? cut : "currentColor"} stroke="none" />
        </>
      ) : name === "goals" ? (
        <>
          <path d="M5 21V4" />
          <path d="M5 4c4-3 8 3 14 0v10c-6 3-10-3-14 0Z" fill={selected ? "currentColor" : "none"} />
        </>
      ) : name === "board" ? (
        <>
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" fill={selected ? "currentColor" : "none"} />
          <path d="M9 5v14m6-14v14" stroke={selected ? cut : "currentColor"} />
        </>
      ) : (
        <>
          <rect x="3" y="4.5" width="18" height="17" rx="2.5" fill={selected ? "currentColor" : "none"} />
          <path d="M7.5 2.5v4M16.5 2.5v4" />
          <path d="M4 9.5h16" stroke={selected ? cut : "currentColor"} />
          {[7, 11, 15].map((x) =>
            [12.5, 16.5].map((y) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="2" height="2" rx="0.4" fill={selected ? cut : "currentColor"} stroke="none" />
            )),
          )}
        </>
      )}
    </svg>
  );
}

/** Runs `handler` when Escape is pressed, for layers that are not dialogs. */
export function useEscape(active: boolean, handler: () => void) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") latest.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
