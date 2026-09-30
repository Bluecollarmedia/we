import { getStore } from "@netlify/blobs";

export const config = { path: "/api/video" };

const MAX_SPAN = 4 * 1024 * 1024; // keep each response under the 6MB function limit

export default async (req) => {
  const store = getStore("videos");
  const id = new URL(req.url).searchParams.get("id");
  const meta = await store.get(`meta/${id}`, { type: "json" });
  if (!meta) return new Response("not found", { status: 404 });
  const { size, chunkSize, type } = meta;

  let start = 0, end = Math.min(size - 1, MAX_SPAN - 1);
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  if (m) {
    if (m[1] === "" && m[2] !== "") { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
    else { start = parseInt(m[1], 10); end = m[2] ? parseInt(m[2], 10) : size - 1; }
    if (start >= size) return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    end = Math.min(end, size - 1, start + MAX_SPAN - 1);
  }

  const first = Math.floor(start / chunkSize), last = Math.floor(end / chunkSize);
  const parts = [];
  for (let c = first; c <= last; c++) parts.push(new Uint8Array(await store.get(`chunk/${id}/${c}`, { type: "arrayBuffer" })));
  const buf = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
  const body = buf.subarray(start - first * chunkSize, end - first * chunkSize + 1);

  return new Response(body, {
    status: 206,
    headers: {
      "content-type": type || "video/mp4",
      "accept-ranges": "bytes",
      "content-range": `bytes ${start}-${end}/${size}`,
      "content-length": String(body.length),
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};
