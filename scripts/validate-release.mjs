import {readFileSync,existsSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=path=>JSON.parse(readFileSync(path,"utf8"));
const root=read("manifest.json");
const plugin=read("obsidian/manifest.json");
const versions=read("versions.json");
const tag=process.env.GITHUB_REF_TYPE==="tag" ? process.env.GITHUB_REF_NAME : process.argv[2];
if(root.id!==plugin.id||root.version!==plugin.version||root.minAppVersion!==plugin.minAppVersion)
 throw Error("Obsidian root and source manifests differ");
if(!/^\d+\.\d+\.\d+$/.test(root.version))throw Error("Version must be semantic (X.Y.Z)");
if(versions[root.version]!==root.minAppVersion)throw Error("versions.json does not match the plugin version");
if(tag && tag!=="v"+root.version)throw Error("Git tag "+tag+" does not match v"+root.version);
if(!existsSync("obsidian/dist/main.js"))throw Error("Obsidian bundle missing");
if(!existsSync("dist/pwa/index.html"))throw Error("PWA bundle missing");
if(tag){
  const main=execFileSync("git",["rev-parse","origin/main"],{encoding:"utf8"}).trim();
  execFileSync("git",["merge-base","--is-ancestor","HEAD",main],{stdio:"pipe"});
}
console.log("Release validation passed for "+root.version);
