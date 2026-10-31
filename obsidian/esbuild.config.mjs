import esbuild from "esbuild";
import process from "process";

const production = process.argv[2] === "production";
const context = await esbuild.context({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian"],
  format: "cjs",
  target: "es2018",
  outfile: "main.js",
  sourcemap: production ? false : "inline",
  treeShaking: true,
  logLevel: "info"
});
if (production) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
  console.log("Tempo Obsidian: modalità sviluppo attiva.");
}
