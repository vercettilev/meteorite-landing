/*
  Prints the waitlist as CSV, in the order the reveal is sent: place, email, when it joined, its
  link's code, the code of the link it came by, how many have come by its own, and the path of
  the page that takes it off the list, which every email to it has to end with (put the site's
  address before it).
  Needs BLOB_READ_WRITE_TOKEN: `vercel env pull .env.local` once, then `npm run waitlist`,
  or `npm run waitlist > waitlist.csv` for a file. Keep that file private.

  `npm run waitlist rebuild` makes the register of places again from the addresses themselves
  (lib/list.ts). Run it after deleting an address's file from the store, so its place closes up.

  It runs lib/list.ts as it is, which needs Node 22.18 or later.
*/
import { rebuild, roll } from "../lib/list.ts";

if (process.argv[2] === "rebuild") {
  const register = await rebuild();
  console.error(`register rebuilt: ${register.entries.length} on the list`);
}

const rows = await roll();
console.log("place,email,joined,link,came_by,brought,unsubscribe");
for (const r of rows) console.log(`${r.place ?? ""},${r.email},${r.at},${r.code ?? ""},${r.by ?? ""},${r.brought},${r.leave}`);
console.error(`${rows.length} on the list`);
const unplaced = rows.filter((r) => r.place === null).length;
if (unplaced) console.error(`${unplaced} without a place: run "npm run waitlist rebuild"`);
const unkeyed = rows.filter((r) => !r.leave).length;
if (unkeyed) console.error(`${unkeyed} without a link to leave by (they joined before there was one): run "npm run waitlist rebuild" before writing to them`);
