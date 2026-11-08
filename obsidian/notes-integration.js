/**
 * Pure Obsidian note-reference helpers. Descriptions stay Markdown and are
 * synchronized with the rest of the TEMPVS archive through Dropbox.
 */
const wiki = /!?\[\[([^\]\n]+)\]\]/g;
const markdown = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
export function noteLinks(description = "") {
  const found = [], seen = new Set();
  const add = (target, label) => {
    target = String(target || "").trim();
    if(!target || /^(?:https?:|javascript:|data:|file:)/i.test(target))return;
    if(target.startsWith("obsidian://open?")){
      try {
        const url = new URL(target);
        target = url.searchParams.get("file") || "";
      } catch { return; }
    } else if(target.includes("://"))return;
    if(!target)return;
    const key=target.toLowerCase();
    if(seen.has(key))return;
    seen.add(key);
    found.push({path: target, label: String(label || target).trim() || target});
  };
  for(const m of String(description).matchAll(wiki)) {
    const [path, alias] = m[1].split("|");
    add(path?.split("#")[0],alias || path);
  }
  for(const m of String(description).matchAll(markdown))add(m[2],m[1]);
  return found;
}
export function appendNoteLink(description = "", path) {
  path=String(path || "").trim();
  if(!path || path.includes("]]") || path.includes("\n"))throw Error("Percorso nota non valido.");
  if(noteLinks(description).some(link=>link.path.toLowerCase()===path.toLowerCase()))return String(description);
  return String(description).trimEnd() + (String(description).trim()? "\n" : "") + "- [[" + path + "]]";
}
