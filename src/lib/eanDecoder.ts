/** Small EAN-13 / EAN-8 scanline decoder for browsers without BarcodeDetector.
 * Reads module run lengths, validates guards, parity, quiet zones and checksum.
 * UPC-A uses the EAN-13 representation with a leading zero.
 */
const L = ["3211", "2221", "2122", "1411", "1132", "1231", "1114", "1312", "1213", "3112"];
const PARITY = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
export function validEan(code: string) {
  if (!/^(?:\d{8}|\d{13})$/.test(code)) return false;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = 4 - weight) sum += Number(code[i]) * weight;
  return (10 - sum % 10) % 10 === Number(code.at(-1));
}
function digit(runs: number[], allowG: boolean): { digit: number; parity: string } | null {
  const moduleWidth = runs.reduce((a, b) => a + b, 0) / 7;
  let best = .65, found: { digit: number; parity: string } | null = null;
  for (const parity of allowG ? ["L", "G"] : ["L"]) for (let d = 0; d < 10; d++) {
    const pattern = parity === "G" ? [...L[d]].reverse() : [...L[d]];
    const differences = pattern.map((value, i) => Math.abs(runs[i] / moduleWidth - Number(value)));
    const error = differences.reduce((a, b) => a + b, 0) / 4;
    if (Math.max(...differences) < .85 && error < best) { best = error; found = { digit: d, parity }; }
  }
  return found;
}
export function decodeEanLine(pixels: Uint8ClampedArray | number[]): string | null {
  let min = 255, max = 0;
  for (const value of pixels) { min = Math.min(min, value); max = Math.max(max, value); }
  if (max - min < 55) return null;
  const threshold = (min + max) / 2;
  const runs: { black: boolean; width: number }[] = [];
  for (const value of pixels) {
    const black = value < threshold, last = runs.at(-1);
    if (last?.black === black) last.width++; else runs.push({ black, width: 1 });
  }
  for (let start = 1; start < runs.length; start++) {
    if (!runs[start].black) continue;
    for (const count of [6, 4]) {
      const total = count * 8 + 11;
      if (start + total >= runs.length) continue;
      const widths = runs.slice(start, start + total).map((run) => run.width);
      const moduleWidth = widths.reduce((a, b) => a + b, 0) / (count * 14 + 11);
      if (moduleWidth < 1 || runs[start - 1].width < moduleWidth * 7 || runs[start + total].width < moduleWidth * 7) continue;
      const center = 3 + count * 4;
      const guards = [...widths.slice(0, 3), ...widths.slice(center, center + 5), ...widths.slice(-3)];
      if (guards.some((width) => Math.abs(width / moduleWidth - 1) > .65)) continue;
      let left = "", right = "", parity = "";
      for (let i = 0; i < count; i++) {
        const a = digit(widths.slice(3 + i * 4, 7 + i * 4), count === 6);
        const b = digit(widths.slice(center + 5 + i * 4, center + 9 + i * 4), false);
        if (!a || !b) break;
        left += a.digit; right += b.digit; parity += a.parity;
      }
      if (left.length !== count) continue;
      const leading = count === 6 ? PARITY.indexOf(parity) : 0;
      if (leading < 0) continue;
      const code = (count === 6 ? String(leading) : "") + left + right;
      if (validEan(code)) return code;
    }
  }
  return null;
}
export function decodeEanFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  canvas.width = Math.min(video.videoWidth, 1280);
  canvas.height = Math.round(video.videoHeight * canvas.width / video.videoWidth);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  for (const fraction of [.5, .4, .6, .3, .7]) {
    const rgba = context.getImageData(0, Math.floor(canvas.height * fraction), canvas.width, 1).data;
    const line = new Uint8ClampedArray(canvas.width);
    for (let x = 0; x < canvas.width; x++) line[x] = (rgba[x * 4] + rgba[x * 4 + 1] + rgba[x * 4 + 2]) / 3;
    const code = decodeEanLine(line) || decodeEanLine(line.reverse());
    if (code) return code;
  }
  return null;
}
