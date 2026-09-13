import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("web/vendor", { recursive: true });

await build({
  stdin: {
    contents: 'export { default } from "qrcode";\n',
    resolveDir: process.cwd(),
    sourcefile: "qrcode-entry.js"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: "web/vendor/qrcode.js"
});

await build({
  stdin: {
    contents: 'export { BrowserMultiFormatReader } from "@zxing/browser";\n',
    resolveDir: process.cwd(),
    sourcefile: "zxing-entry.js"
  },
  bundle: true,
  format: "esm",
  platform: "browser",
  outfile: "web/vendor/zxing-browser.js"
});

const appPath = "web/app.js";
let appSource = await readFile(appPath, "utf8");

appSource = appSource
  .replace(
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm',
    './vendor/qrcode.js'
  )
  .replace(
    'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm',
    './vendor/zxing-browser.js'
  );

if (appSource.includes("cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm") ||
    appSource.includes("cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm")) {
  throw new Error("Failed to replace external browser dependency imports in web/app.js");
}

await writeFile(appPath, appSource);
