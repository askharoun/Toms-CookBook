import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const dynamic = "force-static";
export async function GET() { return new Response(await readFile(join(process.cwd(), "public/icons/tc-192.png")), { headers: { "Content-Type": "image/png" } }); }
