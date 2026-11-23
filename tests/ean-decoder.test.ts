import { describe, expect, it } from "vitest";
import { decodeEanLine, validEan } from "../src/lib/eanDecoder";

// Independent module-bit fixtures, as printed on an EAN barcode.
const left = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const even = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
const parity = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
function render(code: string, scale = 3) {
  const count = code.length === 13 ? 6 : 4;
  const digits = code.length === 13 ? code.slice(1) : code;
  const mode = code.length === 13 ? parity[Number(code[0])] : "LLLL";
  let bits = "00000000000" + "101";
  for (let i = 0; i < count; i++) bits += (mode[i] === "L" ? left : even)[Number(digits[i])];
  bits += "01010";
  for (let i = count; i < count * 2; i++) bits += [...left[Number(digits[i])]].map((bit) => bit === "1" ? "0" : "1").join("");
  bits += "10100000000000";
  return [...bits].flatMap((bit) => Array.from({ length: scale }, () => bit === "1" ? 20 : 230));
}
describe("software camera decoder", () => {
  it.each(["4006381333931", "0036000291452", "96385074"])("decodes %s at multiple camera scales", (code) => {
    expect(validEan(code)).toBe(true);
    for (const scale of [2, 3, 5]) expect(decodeEanLine(render(code, scale))).toBe(code);
  });
  it("rejects invalid checksums, blank frames and low contrast", () => {
    expect(decodeEanLine(render("4006381333932"))).toBeNull();
    expect(decodeEanLine(Array(400).fill(255))).toBeNull();
    expect(decodeEanLine(render("4006381333931").map((v) => v < 100 ? 120 : 130))).toBeNull();
  });
});
