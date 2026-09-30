import { getStore } from "@netlify/blobs";

export const config = { path: "/api/upload" };

// POST ?id=&i=N            body = raw chunk bytes
// POST ?id=&done=1         body = JSON {name,type,size,chunkSize,count}
export default async (req) => {
  const store = getStore("videos");
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (req.method !== "POST" || !/^[a-z0-9]{6,32}$/.test(id || "")) return new Response("bad", { status: 400 });
  if (url.searchParams.get("done")) {
    const meta = await req.json();
    meta.created = Date.now();
    await store.setJSON(`meta/${id}`, meta);
    return Response.json({ ok: true });
  }
  const i = parseInt(url.searchParams.get("i"), 10);
  await store.set(`chunk/${id}/${i}`, await req.arrayBuffer());
  return Response.json({ ok: true });
};
