export type PersonalRatingParseResult = {
  value: number | null;
  error: string | null;
};

const RATING_ERROR_MESSAGE = 'Моя оцінка має бути числом від 0 до 10.';

export function parsePersonalRatingInput(raw: string): PersonalRatingParseResult {
  const normalized = raw.trim();
  if (!normalized) {
    return { value: null, error: null };
  }

  const numericValue = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 10) {
    return { value: null, error: RATING_ERROR_MESSAGE };
  }

  return { value: numericValue, error: null };
}

export function getPersonalRatingErrorMessage() {
  return RATING_ERROR_MESSAGE;
}
