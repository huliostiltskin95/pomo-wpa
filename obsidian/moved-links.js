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
