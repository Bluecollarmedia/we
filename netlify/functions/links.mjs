import { getStore } from "@netlify/blobs";

export const config = { path: "/api/links" };

// GET -> list, POST {url,title?} -> save, DELETE ?id= -> remove
export default async (req) => {
  const store = getStore("links");
  const url = new URL(req.url);
  if (req.method === "POST") {
    const { url: link, title } = await req.json();
    if (!/^https?:\/\//.test(link || "")) return new Response("bad link", { status: 400 });
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await store.setJSON(id, { url: link, title: title || "", created: Date.now() });
    return Response.json({ ok: true, id });
  }
  if (req.method === "DELETE") {
    await store.delete(url.searchParams.get("id"));
    return Response.json({ ok: true });
  }
  const { blobs } = await store.list();
  const items = (await Promise.all(blobs.map(async (b) => ({ id: b.key, ...(await store.get(b.key, { type: "json" })) }))))
    .sort((a, b) => b.created - a.created);
  return Response.json(items, { headers: { "cache-control": "no-store" } });
};
