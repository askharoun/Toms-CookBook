import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default async function Icon() { return new Response(await readFile(join(process.cwd(), "public/icons/tc-180.png")), { headers: { "Content-Type": "image/png" } }); }
