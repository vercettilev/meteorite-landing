/*
  Prints the waitlist as CSV (email, consent, date), oldest first.
  Needs BLOB_READ_WRITE_TOKEN: `vercel env pull .env.local` once, then `npm run waitlist`,
  or `npm run waitlist > waitlist.csv` for a file. Keep that file private.
*/
import { get, list } from "@vercel/blob";

let cursor;
const rows = [];
do {
  const page = await list({ prefix: "waitlist/", cursor, limit: 1000 });
  for (const blob of page.blobs) {
    const res = await get(blob.pathname, { access: "private", useCache: false });
    if (res?.stream) rows.push(JSON.parse(await new Response(res.stream).text()));
  }
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

rows.sort((a, b) => a.at.localeCompare(b.at));
console.log("email,consent,signed_up");
for (const r of rows) console.log(`${r.email},${r.consent},${r.at}`);
console.error(`${rows.length} on the list`);
