import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const dynamic = "force-static";
export async function GET() { return new Response(await readFile(join(process.cwd(), "public/icons/fire-512.png")), { headers: { "Content-Type": "image/png" } }); }
