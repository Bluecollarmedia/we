import { getStore } from "@netlify/blobs";

export const config = { path: "/api/list" };

export default async () => {
  const store = getStore("videos");
  const { blobs } = await store.list({ prefix: "meta/" });
  const items = (await Promise.all(blobs.map(async (b) => ({ id: b.key.slice(5), ...(await store.get(b.key, { type: "json" })) }))))
    .sort((a, b) => b.created - a.created);
  return Response.json(items, { headers: { "cache-control": "no-store" } });
};
