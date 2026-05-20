import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";

export async function GET() {
  const body = await readFile(path.join(process.cwd(), "dcd.html"), "utf8");
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
