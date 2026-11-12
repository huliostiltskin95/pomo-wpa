import {copyFile} from "node:fs/promises";
import {build} from 'esbuild';
await build({entryPoints:['obsidian/main.js'],bundle:true,platform:'browser',format:'cjs',target:'es2020',external:['obsidian','electron','@codemirror/*','@lezer/*'],outfile:'obsidian/dist/main.js',logLevel:'info'});

for (const file of ["styles.css", "manifest.json"]) await copyFile("obsidian/"+file,"obsidian/dist/"+file);
