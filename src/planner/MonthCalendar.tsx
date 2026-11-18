import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  dateFor,
  dayKey,
  monthGrid,
  monthTitle,
  shiftDay,
  shiftMonth,
  spokenDate,
  today,
  weekdayInitials,
  weekIndex,
} from "./dates";

const FIRST_YEAR = 1900;
const LAST_YEAR = 2199;

/**
 * The month grid that leads the Calendar page: Monday first, a filled square
 * for the chosen day, a ring for today and a small dot under days with tasks.
 * On narrow screens it folds down to the chosen week.
 */
export function MonthCalendar({
  day,
  onChange,
  markedDays,
  expanded,
  onExpandedChange,
  collapsible,
}: {
  day: string;
  onChange: (day: string) => void;
  markedDays: Set<string>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  collapsible: boolean;
}) {
  // The month on show can differ from the chosen day while browsing.
  const [browse, setBrowse] = useState({ from: day, visible: day });
  const visible = browse.from === day ? browse.visible : day;
  const setVisible = (next: string) => setBrowse({ from: day, visible: next });
  const [picking, setPicking] = useState(false);
  const [yearPage, setYearPage] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const focusDay = useRef<string | null>(null);
  const folded = collapsible && !expanded;

  useEffect(() => {
    if (folded) {
      setBrowse({ from: day, visible: day });
      setPicking(false);
    }
  }, [folded, day]);

  useEffect(() => {
    if (!focusDay.current) return;
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusDay.current}"]`)?.focus();
    focusDay.current = null;
  });

  const shown = folded ? day : visible;
  const { start, weeks, month, year } = monthGrid(shown);
  const chosenInView = dateFor(day).getMonth() === month && dateFor(day).getFullYear() === year;
  const activeWeek = chosenInView ? weekIndex(day) : 0;
  const now = today();
  // The one day that can be reached with Tab; arrows move from there.
  const tabStop = chosenInView ? day : dayKey(new Date(year, month, 1, 12));

  const move = (next: string) => {
    focusDay.current = next;
    onChange(next);
  };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const from = (event.target as HTMLElement).dataset.day;
    if (!from) return;
    const next =
      event.key === "ArrowLeft"
        ? shiftDay(from, -1)
        : event.key === "ArrowRight"
          ? shiftDay(from, 1)
          : event.key === "ArrowUp"
            ? shiftDay(from, -7)
            : event.key === "ArrowDown"
              ? shiftDay(from, 7)
              : event.key === "PageUp"
                ? shiftMonth(from, -1)
                : event.key === "PageDown"
                  ? shiftMonth(from, 1)
                  : null;
    if (!next) return;
    event.preventDefault();
    move(next);
  };

  // A sideways swipe turns the month; an upward one folds the calendar away.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchEnd = (event: React.TouchEvent) => {
    const from = touch.current;
    touch.current = null;
    if (!from || picking) return;
    const dx = event.changedTouches[0].clientX - from.x;
    const dy = event.changedTouches[0].clientY - from.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (folded) onChange(shiftDay(day, dx < 0 ? 7 : -7));
      else setVisible(shiftMonth(visible, dx < 0 ? 1 : -1));
    } else if (collapsible && Math.abs(dy) > 32 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      onExpandedChange(dy > 0);
    }
  };

  const firstYear = Math.min(LAST_YEAR - 11, Math.max(FIRST_YEAR, year - 10 + yearPage * 12));

  return (
    <section
      className="cal ot-glass"
      aria-label="Calendar"
      data-folded={folded || undefined}
      onTouchStart={(event) => {
        touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchEnd={onTouchEnd}
    >
      <div className="cal-toolbar" aria-hidden={folded || undefined}>
        <button
          type="button"
          className="ot-round ot-round--plain"
          aria-label={picking ? "Earlier years" : "Previous month"}
          tabIndex={folded ? -1 : 0}
          disabled={picking && firstYear <= FIRST_YEAR}
          onClick={() => (picking ? setYearPage((page) => page - 1) : setVisible(shiftMonth(visible, -1)))}
        >
          <ChevronLeft size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cal-title"
          aria-expanded={picking}
          aria-label={picking ? "Close year selection" : `${monthTitle(shown)}, choose year`}
          tabIndex={folded ? -1 : 0}
          onClick={() => {
            setYearPage(0);
            setPicking((value) => !value);
          }}
        >
          {picking ? `${firstYear}–${firstYear + 11}` : monthTitle(shown)}
        </button>
        <button
          type="button"
          className="ot-round ot-round--plain"
          aria-label={picking ? "Later years" : "Next month"}
          tabIndex={folded ? -1 : 0}
          disabled={picking && firstYear + 11 >= LAST_YEAR}
          onClick={() => (picking ? setYearPage((page) => page + 1) : setVisible(shiftMonth(visible, 1)))}
        >
          <ChevronRight size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>

      {picking ? (
        <div className="cal-years" role="group" aria-label="Choose year">
          {Array.from({ length: 12 }, (_, index) => firstYear + index).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === year}
              onClick={() => {
                setVisible(shiftMonth(visible, (value - year) * 12));
                setPicking(false);
              }}
            >
              {value}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="cal-weekdays" aria-hidden="true">
            {weekdayInitials.map((name, index) => (
              <span key={index}>{name.short}</span>
            ))}
          </div>
          <div
            className="cal-weeks"
            style={{ "--rows": folded ? 1 : weeks, "--shift": folded ? activeWeek : 0 } as React.CSSProperties}
          >
            <div
              key={`${year}-${month}`}
              ref={grid}
              className="cal-grid"
              role="grid"
              aria-label={monthTitle(shown)}
              onKeyDown={onKeyDown}
            >
              {Array.from({ length: weeks }, (_, week) => (
                <div key={week} role="row" aria-hidden={(folded && week !== activeWeek) || undefined}>
                  {Array.from({ length: 7 }, (_, column) => {
                    const cell = shiftDay(start, week * 7 + column);
                    const outside = dateFor(cell).getMonth() !== month;
                    const hidden = folded && week !== activeWeek;
                    return (
                      <button
                        key={cell}
                        type="button"
                        role="gridcell"
                        data-day={cell}
                        aria-label={`${spokenDate(cell)}${markedDays.has(cell) ? ", has tasks" : ""}`}
                        aria-selected={cell === day}
                        aria-current={cell === now ? "date" : undefined}
                        data-outside={outside || undefined}
                        data-marked={markedDays.has(cell) || undefined}
                        tabIndex={!hidden && cell === tabStop ? 0 : -1}
                        onClick={() => onChange(cell)}
                      >
                        <span>{dateFor(cell).getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {collapsible ? (
        <button
          type="button"
          className="cal-grabber"
          aria-expanded={expanded}
          aria-label={expanded ? "Show one week" : "Show the whole month"}
          onClick={() => onExpandedChange(!expanded)}
        >
          <i aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
