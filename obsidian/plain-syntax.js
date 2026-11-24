// Adapt the short forms at the input boundary so IDs, credits and write-back
// still use the same planners as existing notes.
const activity = /^([^\[\]]+?)\s+(\d+(?:[.,]\d+)?[hms])(?:\s+x(\d+))?(?:\s+(\d\d:\d\d))?\s+((?:\[\[[^\[\]]+\]\](?:\s+|$))+)$/i;
const range = /^([^\[\]]+?)\s+(\d\d:\d\d\s*-\s*\d\d:\d\d)\s+(\d+(?:[.,]\d+)?[hm])(?=\s|$)/i;

// The area may have spaces. Wikilinks delimit the end of its name.
const timeRange = /^(\d\d:\d\d\s*-\s*\d\d:\d\d)\s+(\d+(?:[.,]\d+)?[hm])\s+([^\[\]]+?)(\s+\[\[.*)?$/i;
const timedActivity = /^(?:(\d\d:\d\d)\s+)?(\d+(?:[.,]\d+)?[hms])(?:\s+x(\d+))?\s+([^\[\]]+?)\s+((?:\[\[[^\[\]]+\]\](?:\s+|$))+)$/i;

export function usesTimeRange(line) {
  return timeRange.test(line.trim());
}

export function timeFirstArea(line) {
  const text = line.trim();
  const match = timeRange.exec(text) || timedActivity.exec(text);
  if (!match) return null;
  const name = match.length === 5 ? match[3] : match[4];
  const prefix = text.slice(0, text.indexOf('[[') < 0 ? text.length : text.indexOf('[[')).trimEnd();
  const end = line.indexOf(text) + prefix.length;
  return {from: end - name.length, to: end};
}

export function expandRange(line) {
  if (usesTimeRange(line)) return line.replace(timeRange, '$3 +$1 -$2$4');
  return line.replace(range, '$1 +$2 -$3');
}

export function expandDailyLine(line) {
  const expanded = expandRange(line);
  if (expanded !== line) return expanded;
  const timed = timedActivity.exec(line);
  if (timed) {
    const [, start, duration, count, area, links] = timed;
    line = area + ' ' + duration + (count ? ' x' + count : '') +
      (start ? ' ' + start : '') + ' ' + links;
  }
  const match = activity.exec(line);
  if (!match) return line;
  const [, area, duration, count, start, links] = match;
  return '- ' + links.trim() + ' ' + duration + (count ? ' = ' + count : '') +
    (start ? ' +' + start : '') + ' @' + area;
}
