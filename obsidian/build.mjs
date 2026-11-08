import {build} from 'esbuild';
await build({entryPoints:['obsidian/main.js'],bundle:true,platform:'browser',format:'cjs',target:'es2020',external:['obsidian','electron','@codemirror/*','@lezer/*'],outfile:'obsidian/dist/main.js',logLevel:'info'});
