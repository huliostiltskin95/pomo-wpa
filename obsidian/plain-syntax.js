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

export const isReminder = line => /^\s*\[\[[^\[\]\n|]+(?:\|[^\[\]\n]+)?\]\]\s*$/.test(line);

// An explicit @area distinguishes a flexible allocation from credited time.
export function flexibleAllocation(line) {
  const links = line.match(/\[\[[^\[\]\n]+\]\]/g) || [];
  if (links.length > 1) return null;
  const fields = (links.length ? line.replace(links[0], ' ') : line).trim().split(/\s+/);
  const duration = fields.filter(field => /^\d+(?:[.,]\d+)?[hm]$/i.test(field));
  const clock = fields.filter(field => /^\+?(?:[01]\d|2[0-3]):[0-5]\d$/.test(field));
  // Keep the note-estimate form @Studio 2h available.
  if (fields[0]?.startsWith('@') && !links.length && !clock.length) return null;
  if (duration.length !== 1 || clock.length > 1) return null;
  const area = fields.filter(field => field !== duration[0] && field !== clock[0]).join(' ');
  if (!/^@[^@\s\d+\-=[\]]+(?: [^@+\-=[\]]+)*$/u.test(area)) return null;
  return ['-', ...links, '@' + duration[0], ...(clock.length ? ['+' + clock[0].replace(/^\+/, '')] : []), area].join(' ');
}

export function expandDailyLine(line) {
  const allocation = flexibleAllocation(line);
  if (allocation) return allocation;
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
