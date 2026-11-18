/* How the site writes its numbers, in one place. */

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const count = (n: number) => whole.format(n);

/* A place on the list, as the page says it: "first" in the word the page has always used, then in figures ("2nd", "42nd", "1,204th"). */
export function ordinal(n: number) {
  if (n === 1) return "first";
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${whole.format(n)}${suffix}`;
}
