import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

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
