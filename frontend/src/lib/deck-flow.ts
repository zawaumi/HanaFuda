import type { GenerateDeckInput, GenerateDeckResult } from "@/lib/api";

const DRAFT_KEY = "hanafuda:deck-draft";
const RESULT_KEY = "hanafuda:deck-result";

export function saveDeckDraft(input: GenerateDeckInput) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(input));
  sessionStorage.removeItem(RESULT_KEY);
}

export function loadDeckDraft(): GenerateDeckInput | null {
  const raw = sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as GenerateDeckInput; } catch { return null; }
}

export function saveDeckResult(result: GenerateDeckResult) {
  sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
}

export function loadDeckResult(): GenerateDeckResult | null {
  const raw = sessionStorage.getItem(RESULT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as GenerateDeckResult; } catch { return null; }
}
