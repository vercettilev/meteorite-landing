import { ordinal } from "@/lib/format";
import type { Standing } from "@/lib/list";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site";

/*
  The one email the site sends: a few lines to a new address on the waitlist, to say it is on the
  list, where, and what its own link is. It goes through Resend, and only once RESEND_API_KEY is
  set (see .env.example): without it the address is kept and nothing is sent. The sender is
  WAITLIST_FROM, or the contact address, and its domain has to be verified with Resend. It ends
  with the link that takes the address off the list (app/leave), which is how someone who never
  asked for this gets off it; replies come to the contact address, and that works too. The place
  is the one held as the email is written; the page says where it stands since. The privacy
  notice on /legal names Resend and says what the email is for: if either changes here, it
  changes there too.
*/
const SUBJECT = "You are on the list";
/* Said only where there is no link to give: without the site's address there is nowhere for one to lead. */
const REPLY = "If you did not ask for this, reply and we will take your address off.";

/* Resend is asked once for each link's code, so it sends one email for a signup however many times it is asked. `leave` is the path of the page that takes this address off the list (lib/list.ts). */
export async function sendConfirmation(to: string, standing: Standing, leave?: string) {
  const token = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM || (CONTACT_EMAIL ? `Meteorite <${CONTACT_EMAIL}>` : undefined);
  if (!token || !from) return;

  const place = `You will be the ${ordinal(standing.place)} to know when the first specimen is revealed.`;
  /* The same words as the page's (components/JoinForm.tsx). */
  const invite = `Invite friends ${standing.place === 1 ? "to stay first" : "to move up the list"}. Your link:`;
  const link = SITE_URL ? `${SITE_URL}/list/${standing.code}` : undefined;
  const off = SITE_URL && leave ? `${SITE_URL}${leave}` : undefined;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": `list/${standing.code}` },
      body: JSON.stringify({ from, to, reply_to: CONTACT_EMAIL, subject: SUBJECT, text: text(place, invite, link, off), html: html(place, invite, link, off) }),
      signal: AbortSignal.timeout(8000),
    });
    /* The address stays out of the log: the status and Resend's own words are enough to find the fault. */
    if (!res.ok) console.error("confirmation", res.status, await res.text());
  } catch (error) {
    console.error("confirmation", error);
  }
}

function text(place: string, invite: string, link?: string, off?: string) {
  return [`${SUBJECT}.`, place, link && `${invite}\n${link}`, ["Meteorite", SITE_URL].filter(Boolean).join("\n"), off ? `Unsubscribe: ${off}` : REPLY].filter(Boolean).join("\n\n") + "\n";
}

/*
  A letter, not a leaflet. Mail programs sort what looks designed (a coloured ground, a headline,
  a picture, a row of buttons) with the advertising, and the first of these emails, which had the
  page's bone ground, went to Gmail's Promotions. This is an answer to something the reader has
  just done, so it is set as a person would write it: the reader's own ground, a few lines in
  Georgia (mail does not load IM Fell), one link, and at the foot the name and the way off the
  list. Nothing here is turned into capitals by the mail program: one set to Turkish would write
  METEORİTE.
*/
function html(place: string, invite: string, link?: string, off?: string) {
  const bring = link ? `\n<p style="margin:0 0 1em">${invite}<br><a href="${link}">${link.replace(/^https?:\/\//, "")}</a></p>` : "";
  const foot = off ? `Meteorite &middot; <a href="${off}" style="color:#777777">Unsubscribe</a>` : REPLY;
  return `<!doctype html>
<html lang="en">
<body>
<div style="max-width:34em;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6">
<p style="margin:0 0 1em">${SUBJECT}.</p>
<p style="margin:0 0 1em">${place}</p>${bring}
<p style="margin:2em 0 0;font-size:13px;color:#777777">${foot}</p>
</div>
</body>
</html>`;
}
