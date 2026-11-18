import { readAsset } from "@/server/storage";

/** Serves sanitised uploads. Ids are random UUIDs; images were re-encoded on upload. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = await readAsset(id);
  if (!found) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(found.data), {
    headers: {
      "Content-Type": found.asset.mime,
      "Content-Length": String(found.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Accept-Ranges": "none",
    },
  });
}
