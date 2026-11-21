// Resolve links against the old location while Obsidian already exposes the new one.
export function movedTarget(target, oldPath, newPath, sourcePath, resolve) {
  const match = /^([^#]+)(#.*)?$/.exec(target);
  if (!match) return target;
  const [, raw, fragment = ''] = match;
  let local = raw;
  if (/^\.{1,2}\//.test(raw) && sourcePath) {
    const parts = sourcePath.split('/').slice(0, -1);
    for (const part of raw.split('/')) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    }
    local = parts.join('/');
  }
  const path = local.replace(/^\//, '');
  const withoutMd = value => value.replace(/\.md$/i, '');
  let destination;
  if (withoutMd(path) === withoutMd(oldPath)) {
    destination = newPath;
  } else if (path.startsWith(oldPath + '/')) {
    destination = newPath + path.slice(oldPath.length);
  } else if (withoutMd(oldPath).endsWith('/' + withoutMd(path))) {
    const other = resolve?.(path, sourcePath);
    if (other && other.path !== newPath) return target;
    destination = newPath;
  } else {
    return target;
  }
  return (raw.startsWith('/') ? '/' : '') + (/\.md$/i.test(path) ? destination : withoutMd(destination)) + fragment;
}

export function moveBlockLinks(source, move) {
  return source.replace(/\[\[([^\]|\n]+)(\|[^\]\n]*)?\]\]/g, (original, path, alias = '') => {
    const next = move(path.trim());
    return next === path.trim() ? original : '[[' + next + alias + ']]';
  });
}

export function archivedLinkResolver(files, estimates, vaultName) {
  const key = path => path.replace(/^\//, '').replace(/\.md$/i, '');
  const basename = path => path.split('/').pop();
  const paths = new Set(files.map(file => key(file.path)));
  const candidates = new Map();
  const add = (from, to) => {
    if (!candidates.has(from)) candidates.set(from, new Set());
    candidates.get(from).add(to);
  };
  // Include other folders here so an ambiguous basename never identifies an archive note.
  for (const file of files) add(basename(key(file.path)), file.path);
  const archiveOnly = path => /^(?:archive|archivio)\//i.test(path);
  const prefix = 'note:' + encodeURIComponent(vaultName) + '/';
  for (const note of estimates) {
    if (!archiveOnly(note.path) || !paths.has(key(note.path)) || !note.id.startsWith(prefix)) continue;
    const encoded = note.id.slice(prefix.length);
    if (encoded.includes('/')) continue;
    let original;
    try { original = key(decodeURIComponent(encoded)); } catch { continue; }
    add(original, note.path);
    add(basename(original), note.path);
  }
  return target => {
    const [, raw, fragment = ''] = /^([^#]*)(#.*)?$/.exec(target);
    const path = key(raw);
    if (!path || paths.has(path) || (raw.includes('.') && !/\.md$/i.test(raw) && !candidates.has(basename(path)))) return target;
    const matches = candidates.get(path) || candidates.get(basename(path));
    if (matches?.size !== 1) return target;
    const [destination] = matches;
    if (!archiveOnly(destination)) return target;
    return (/\.md$/i.test(raw) ? destination : key(destination)) + fragment;
  };
}
