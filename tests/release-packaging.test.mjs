import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,readdirSync} from "node:fs";
import {execFileSync} from "node:child_process";

const read = name => JSON.parse(readFileSync(name,"utf8"));
test("plugin manifests and BRAT version index share same identity and current version",()=>{
  const a=read("manifest.json"),b=read("obsidian/manifest.json"),v=read("versions.json");
  assert.equal(a.id,"tempo-pomodoro");
  assert.equal(a.id,b.id);
  assert.equal(a.version,b.version);
  assert.equal(a.minAppVersion,b.minAppVersion);
  assert.equal(v[a.version],a.minAppVersion);
});
test("PWA packaging includes offline shell but excludes plugin and private build files",()=>{
  execFileSync(process.execPath,["scripts/build-pwa.mjs"],{stdio:"pipe"});
  const base="dist/pwa/";
  for(const p of ["index.html","simple.js","sw.js","core/tempo-core.js","core/tempo-dropbox.js","core/tempo-archive-store.js"])
    assert.ok(existsSync(base+p),p+" missing");
  for(const p of ["obsidian","tests","scripts",".github","manifest.json","package.json","docs"])
    assert.equal(existsSync(base+p),false,p+" must not be deployed");
});
