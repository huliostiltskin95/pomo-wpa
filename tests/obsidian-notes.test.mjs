import test from "node:test";
import assert from "node:assert/strict";
import {noteLinks,appendNoteLink} from "../obsidian/notes-integration.js";

test("finds internal Obsidian references and removes duplicates",()=>{
  const links=noteLinks("## Risorse\n- [[Storia/Tucidide|Tucidide]]\n- [Appunti](Studio/Appunti.md)\n- [[Storia/Tucidide]]");
  assert.deepEqual(links,[
    {path:"Storia/Tucidide",label:"Tucidide"},
    {path:"Studio/Appunti.md",label:"Appunti"}
  ]);
});
test("adds active Markdown note once without modifying existing text",()=>{
  const original="## Materiale\n- [[Appunti/Latino.md]]";
  const updated=appendNoteLink(original,"Appunti/Greco.md");
  assert.equal(updated, original+"\n- [[Appunti/Greco.md]]");
  assert.equal(appendNoteLink(updated,"Appunti/Greco.md"),updated);
  assert.equal(appendNoteLink(original,"Appunti/Latino.md"),original);
});
test("rejects unsafe and external links",()=>{
  assert.deepEqual(noteLinks("[Web](https://example.org) [Bad](javascript:alert) [[Note/Valida]]"),[{path:"Note/Valida",label:"Note/Valida"}]);
  assert.throws(()=>appendNoteLink("","bad]]path"),/non valido/);
});
test("parses Obsidian deep links into vault-relative file targets",()=>{
  assert.deepEqual(noteLinks("[Apri](obsidian://open?vault=Archivio&file=Studio%2FGreco.md)"),[
    {path:"Studio/Greco.md",label:"Apri"}
  ]);
});
