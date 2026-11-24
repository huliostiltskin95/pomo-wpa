// Adapt the short forms at the input boundary so IDs, credits and write-back
// still use the same planners as existing notes.
const activity = /^([^\[\]]+?)\s+(\d+(?:[.,]\d+)?[hms])(?:\s+x(\d+))?(?:\s+(\d\d:\d\d))?\s+((?:\[\[[^\[\]]+\]\](?:\s+|$))+)$/i;
const range = /^([^\[\]]+?)\s+(\d\d:\d\d\s*-\s*\d\d:\d\d)\s+(\d+(?:[.,]\d+)?[hm])(?=\s|$)/i;

export function expandRange(line) {
  return line.replace(range, '$1 +$2 -$3');
}

export function expandDailyLine(line) {
  const expanded = expandRange(line);
  if (expanded !== line) return expanded;
  const match = activity.exec(line);
  if (!match) return line;
  const [, area, duration, count, start, links] = match;
  return '- ' + links.trim() + ' ' + duration + (count ? ' = ' + count : '') +
    (start ? ' +' + start : '') + ' @' + area;
}
