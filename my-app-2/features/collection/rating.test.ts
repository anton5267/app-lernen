import { getPersonalRatingErrorMessage, parsePersonalRatingInput } from './rating';

describe('collection rating utils', () => {
  it('returns null value for empty input', () => {
    expect(parsePersonalRatingInput('   ')).toEqual({ value: null, error: null });
  });

  it('parses dot and comma decimal values', () => {
    expect(parsePersonalRatingInput('7.5')).toEqual({ value: 7.5, error: null });
    expect(parsePersonalRatingInput('8,2')).toEqual({ value: 8.2, error: null });
  });

  it('rejects out-of-range values', () => {
    const error = getPersonalRatingErrorMessage();
    expect(parsePersonalRatingInput('-1')).toEqual({ value: null, error });
    expect(parsePersonalRatingInput('11')).toEqual({ value: null, error });
  });

  it('rejects non-numeric values', () => {
    const error = getPersonalRatingErrorMessage();
    expect(parsePersonalRatingInput('abc')).toEqual({ value: null, error });
  });
});
