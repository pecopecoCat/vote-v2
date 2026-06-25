export const QUESTION_MAX = 80;
export const OPTION_MAX = 30;

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + i);
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
