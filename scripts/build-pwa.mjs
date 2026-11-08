import { readFileSync, readdirSync, mkdirSync, copyFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
const root=resolve(".");
const output=join(root,"dist","pwa");
const skip=new Set([".git",".github",".obsidian","node_modules","obsidian","tests","docs","scripts","dist","coverage",".DS_Store"]);
const excludes=new Set(["package.json","package-lock.json","versions.json","manifest.json","README.md",".gitignore"]);
const validExtensions=new Set([".html",".js",".css",".json",".webmanifest",".svg",".png",".jpg",".jpeg",".webp",".ico",".woff",".woff2",".mp3",".wav",".ogg",".txt"]);
function copyFolder(from,to){
  mkdirSync(to,{recursive:true});
  for(const entry of readdirSync(from,{withFileTypes:true})){
    if(skip.has(entry.name)||entry.name.startsWith("."))continue;
    const a=join(from,entry.name), b=join(to,entry.name);
    if(entry.isDirectory())copyFolder(a,b);
    else if(entry.isFile() && !excludes.has(entry.name) && validExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase()))
      copyFileSync(a,b);
  }
}
copyFolder(root,output);
for(const name of ["index.html","simple.js","sw.js","manifest.webmanifest"])
  if(!statSync(join(output,name)).isFile())throw Error("Missing PWA asset: "+name);
console.log("PWA bundle staged in "+relative(root,output));
