import { starsForAttempts, type Stars } from "@/lib/game/progression";
import type { VerdictStatus } from "@/lib/recognition/scoring";

export interface ExamState {
  order: string[];
  index: number;
  /** Counted attempts per item (silence is not counted). */
  attempts: Record<string, number>;
  itemStars: Record<string, Stars>;
  phase: "answering" | "feedback";
  last: { status: VerdictStatus; heardKey: string | null } | null;
  finished: boolean;
}

export type ExamAction =
  | { type: "verdict"; status: VerdictStatus; heardKey: string | null }
  | { type: "continue" };

export function initialExam(itemIds: string[]): ExamState {
  return { order: itemIds, index: 0, attempts: {}, itemStars: {}, phase: "answering", last: null, finished: false };
}

export function examReducer(state: ExamState, action: ExamAction): ExamState {
  const id = state.order[state.index];
  if (state.finished || id === undefined) return state;

  if (action.type === "verdict") {
    if (state.phase !== "answering") return state;
    const last = { status: action.status, heardKey: action.heardKey };
    if (action.status === "silent") return { ...state, phase: "feedback", last };
    const attempts = (state.attempts[id] ?? 0) + 1;
    const itemStars = action.status === "correct" ? { ...state.itemStars, [id]: starsForAttempts(attempts) } : state.itemStars;
    return { ...state, attempts: { ...state.attempts, [id]: attempts }, itemStars, phase: "feedback", last };
  }

  if (state.phase !== "feedback") return state;
  if (state.last?.status !== "correct") return { ...state, phase: "answering", last: null };
  const index = state.index + 1;
  return { ...state, index, phase: "answering", last: null, finished: index >= state.order.length };
}
