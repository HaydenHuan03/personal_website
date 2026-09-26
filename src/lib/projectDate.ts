const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatProjectDate(yyyyMm: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(yyyyMm);
  if (!match) throw new Error(`Invalid project date "${yyyyMm}"; expected YYYY-MM`);
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}
