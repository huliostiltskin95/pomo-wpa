import {copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {build, context} from 'esbuild';

const source=fileURLToPath(new URL('./',import.meta.url));
export async function buildPlugin({watch=false}={}) {
  const options={
    absWorkingDir:resolve(source,'..'),
    entryPoints:[resolve(source,'main.js')],bundle:true,platform:'browser',format:'cjs',target:'es2020',
    external:['obsidian','electron','@codemirror/*','@lezer/*'],outfile:resolve(source,'dist/main.js'),logLevel:'info',
    plugins:[{name:'package-obsidian',setup(builder){
      builder.onEnd(async result=>{
        if(result.errors.length)return;
        for(const file of ['styles.css','manifest.json'])await copyFile(resolve(source,file),resolve(source,'dist',file));
      });
    }}]
  };
  if(watch){const builder=await context(options);await builder.watch();return builder;}
  await build(options);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await buildPlugin({watch:process.argv.includes('--watch')});
