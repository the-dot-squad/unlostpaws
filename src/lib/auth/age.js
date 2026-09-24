/** @file Age confirmation helpers — month/year DOB and minimum-age checks. */

export const MIN_ACCOUNT_AGE = 13;
export const MIN_BIRTH_YEAR = 1900;

/**
 * Last calendar day of a month (1–12), accounting for leap years.
 * @param {number} month
 * @param {number} year
 */
export function lastDayOfMonth(month, year) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parse and validate birth month + year.
 * @param {unknown} birthMonth
 * @param {unknown} birthYear
 * @param {Date} [now]
 * @returns {{ ok: true, birthMonth: number, birthYear: number } | { ok: false, error: string }}
 */
export function parseBirthMonthYear(birthMonth, birthYear, now = new Date()) {
  const month = Number(birthMonth);
  const year = Number(birthYear);
  const currentYear = now.getUTCFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, error: "invalid_birth_month" };
  }
  if (!Number.isInteger(year) || year < MIN_BIRTH_YEAR || year > currentYear) {
    return { ok: false, error: "invalid_birth_year" };
  }
  // Reject future month/year within the current year.
  if (year === currentYear && month > now.getUTCMonth() + 1) {
    return { ok: false, error: "invalid_birth_year" };
  }

  return { ok: true, birthMonth: month, birthYear: year };
}

/**
 * Conservative age check: treat DOB as the last day of the given month so we
 * only admit users who are definitely at least `minAge`.
 *
 * @param {number} birthMonth
 * @param {number} birthYear
 * @param {number} [minAge]
 * @param {Date} [now]
 */
export function isAtLeastAge(birthMonth, birthYear, minAge = MIN_ACCOUNT_AGE, now = new Date()) {
  const day = lastDayOfMonth(birthMonth, birthYear);
  const thirteenthBirthday = new Date(Date.UTC(birthYear + minAge, birthMonth - 1, day));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return today >= thirteenthBirthday;
}

/** @param {{ ageConfirmedAt?: Date | string | null } | null | undefined} user */
export function hasConfirmedAge(user) {
  return Boolean(user?.ageConfirmedAt);
}
