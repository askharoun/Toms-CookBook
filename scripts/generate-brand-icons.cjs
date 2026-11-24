const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

// Export the existing fire mask using the same gradients and padding as .brand-logo.
const palettes = {
  violet: { light: [[113,65,139],[89,45,112],[201,160,228]], dark: [[157,101,188],[109,62,136],[215,178,237]] },
  emerald: { light: [[5,150,105],[4,120,87],[52,211,153]], dark: [[5,150,105],[4,120,87],[52,211,153]] },
  rose: { light: [[225,29,72],[190,18,60],[251,113,133]], dark: [[225,29,72],[190,18,60],[251,113,133]] },
};
const rgb = value => `rgb(${value.join(",")})`;
function gradient(size, angle, start, end) {
  const radians = angle * Math.PI / 180, x = Math.sin(radians), y = -Math.cos(radians);
  const length = size * (Math.abs(x) + Math.abs(y));
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${size/2-x*length/2}" y1="${size/2-y*length/2}" x2="${size/2+x*length/2}" y2="${size/2+y*length/2}"><stop stop-color="${start}"/><stop offset="1" stop-color="${end}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
}
(async () => {
  const root = path.resolve(__dirname, "..");
  const iconDir = path.join(root, "public/icons/themed");
  const manifestDir = path.join(root, "public/manifests");
  await fs.mkdir(iconDir, { recursive: true }); await fs.mkdir(manifestDir, { recursive: true });
  const baseManifest = JSON.parse(await fs.readFile(path.join(root, "public/manifest.webmanifest"), "utf8"));
  for (const [color, modes] of Object.entries(palettes)) for (const [mode, [accent, deep, soft]] of Object.entries(modes)) {
    const tint = soft.map(channel => Math.round(channel * .35 + 255 * .65));
    for (const size of [180, 192, 512]) {
      const markSize = Math.round(size * 28 / 44), inset = Math.floor((size - markSize) / 2);
      const mask = await sharp(path.join(root, "assets/LOGO.png")).resize(markSize, markSize).png().toBuffer();
      const mark = await sharp(gradient(markSize, 155, "white", rgb(tint))).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
      // Opaque square artwork: iOS applies its own Home Screen corner shape.
      await sharp(gradient(size, 145, rgb(accent), rgb(deep))).composite([{ input: mark, left: inset, top: inset }]).png().toFile(path.join(iconDir, `fire-${color}-${mode}-${size}.png`));
    }
    const manifest = { ...baseManifest, id: "/", start_url: "/", scope: "/", background_color: mode === "dark" ? "#130f17" : "#f7f4f9", theme_color: "#" + accent.map(channel => channel.toString(16).padStart(2, "0")).join(""), icons: [192,512].map(size => ({ src: `/icons/themed/fire-${color}-${mode}-${size}.png`, sizes: `${size}x${size}`, type: "image/png", purpose: "any maskable" })) };
    await fs.writeFile(path.join(manifestDir, `${color}-${mode}.webmanifest`), JSON.stringify(manifest, null, 2) + "\n");
    if (color === "violet" && mode === "dark") await fs.writeFile(path.join(root, "public/manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
