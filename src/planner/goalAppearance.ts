// A goal's colour and emoji, as in the mobile app: chosen per device, with the
// same default colour everywhere because it is derived from the goal's name.
import { goalKey } from "./model";

export const goalColors = [
  { name: "Forest", light: "#DCECE1", dark: "#243F32", ink: "#264E3A" },
  { name: "Peach", light: "#F8E2D3", dark: "#4A332B", ink: "#945838" },
  { name: "Lilac", light: "#EAE2F5", dark: "#3B304C", ink: "#765A94" },
  { name: "Honey", light: "#F5ECCB", dark: "#433C25", ink: "#84702D" },
  { name: "Rose", light: "#F5DFE5", dark: "#482F3A", ink: "#96556D" },
  { name: "Ocean", light: "#DCECEF", dark: "#253D45", ink: "#376B7B" },
] as const;

export const goalEmoji = ["🌱", "✨", "🏃", "🌎", "🎨", "📚", "🏡", "🚀", "🎸", "🧘", "💛", "⛰️", "🐻", "🌊", "🍃", "🎯", "🦋", "☀️"];

export interface GoalAppearance {
  color: number;
  emoji: string | null;
}
export type GoalAppearances = Record<string, GoalAppearance>;

export function defaultGoalAppearance(name: string): GoalAppearance {
  const hash = Array.from(name).reduce((value, char) => (value * 31 + char.codePointAt(0)!) >>> 0, 0);
  return { color: hash % goalColors.length, emoji: null };
}

export function surpriseGoalAppearance(previous: GoalAppearance): GoalAppearance {
  return {
    color: (previous.color + 1 + Math.floor(Math.random() * (goalColors.length - 1))) % goalColors.length,
    emoji: goalEmoji[Math.floor(Math.random() * goalEmoji.length)],
  };
}

const storageKey = (owner: string) => `offtasks-goal-appearance:${owner}`;

export function readGoalAppearances(owner: string): GoalAppearances {
  try {
    const data = JSON.parse(window.localStorage.getItem(storageKey(owner)) ?? "{}");
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    const valid: GoalAppearances = {};
    for (const [id, value] of Object.entries(data as Record<string, GoalAppearance>)) {
      if (
        value &&
        Number.isInteger(value.color) &&
        value.color >= 0 &&
        value.color < goalColors.length &&
        (value.emoji === null || goalEmoji.includes(value.emoji))
      )
        valid[id] = { color: value.color, emoji: value.emoji };
    }
    return valid;
  } catch {
    return {};
  }
}

export function writeGoalAppearance(owner: string, name: string, appearance: GoalAppearance | null) {
  const next = { ...readGoalAppearances(owner) };
  if (appearance) next[goalKey(name)] = appearance;
  else delete next[goalKey(name)];
  window.localStorage.setItem(storageKey(owner), JSON.stringify(next));
  return next;
}

export const goalInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase() || "G";
