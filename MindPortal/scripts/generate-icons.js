/**
 * Renders src/assets/logo.svg (logo-small.svg for 16px) to the extension's PNG icons with headless Chrome.
 * Not part of the build: the PNGs are kept in src/assets/icons. Run after editing the logo:
 *   node scripts/generate-icons.js
 */
const { execFileSync } = require("child_process");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const { pathToFileURL } = require("url");
const os = require("os");
const path = require("path");

const chrome = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const assets = path.join(__dirname, "../src/assets");
const dataUri = (file) => "data:image/svg+xml;base64," + readFileSync(path.join(assets, file)).toString("base64");

// headless screenshots misbehave at icon-sized windows, so draw onto a canvas and dump the PNG as text
const html = path.join(os.tmpdir(), "mp-icons.html");
writeFileSync(html, `<script>
  const jobs = ${JSON.stringify([16, 32, 48, 128].map((size) => ({ size, src: dataUri(size === 16 ? "logo-small.svg" : "logo.svg") })))};
  Promise.all(jobs.map(({ size, src }) => new Promise((done) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      c.getContext("2d").drawImage(img, 0, 0, size, size);
      done(size + "=" + c.toDataURL("image/png"));
    };
    img.src = src;
  }))).then((out) => { document.body.textContent = out.join(" "); });
</script>`);

const dom = execFileSync(chrome, ["--headless", "--disable-gpu", "--virtual-time-budget=5000", "--dump-dom", pathToFileURL(html).href], { encoding: "utf8" });
unlinkSync(html);
for (const [, size, b64] of dom.matchAll(/(\d+)=data:image\/png;base64,([A-Za-z0-9+/=]+)/g)) {
  const out = path.join(assets, "icons", `icon${size}.png`);
  writeFileSync(out, Buffer.from(b64, "base64"));
  console.log(`✓ ${out}`);
}
