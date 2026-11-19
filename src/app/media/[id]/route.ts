import { readAsset } from "@/server/storage";

/**
 * Serves sanitised uploads. Ids are random UUIDs; images were re-encoded on upload.
 * Supports byte ranges, which Safari needs to play video and seek audio.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await readAsset(id);
  if (!found) return new Response("Not found", { status: 404 });
  const size = found.data.length;
  const headers: Record<string, string> = {
    "Content-Type": found.asset.mime,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Accept-Ranges": "bytes",
  };
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (m && (m[1] || m[2])) {
    let start = m[1] ? Number(m[1]) : size - Number(m[2]);
    let end = m[1] && m[2] ? Number(m[2]) : size - 1;
    start = Math.max(0, start); end = Math.min(size - 1, end);
    if (start > end || start >= size) return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    return new Response(new Uint8Array(found.data.subarray(start, end + 1)), {
      status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(found.data), { headers: { ...headers, "Content-Length": String(size) } });
}
