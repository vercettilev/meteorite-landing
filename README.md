# Meteorite

The landing page of Meteorite, as it runs at https://meteorite.finance. Next.js 16, React 19, TypeScript and Tailwind CSS.

This is a copy of the site's code, taken on 15 November 2026 from the repository it is built from, and published to be read. It is not updated with every change, and it is not open source: there is no licence, so all rights are reserved.

```bash
npm install
npm run dev
```

The site runs at http://localhost:3417. `npm run lint` checks the types; `npm run build` builds what Vercel builds.

## The stone

`components/HeroStone.tsx` draws the hero stone in WebGL: a lunar meteorite, a breccia of the Moon's crust cut and polished to a sphere, on a brass stand, and inside it, once it is cut, the same breccia with veins of glass across it. (Such spheres exist: in July 2025 Sotheby's sold a 120 mm sphere of the lunar meteorite Tisserlitine 006, the largest known. A lunar breccia is neither an iron nor a chondrite, and has no Widmanstätten pattern inside; its cut face is polished, never etched.) The pointer moves the lamp and dragging turns the stone. On a phone, tilting it moves the lamp. An iPhone has to be asked first, so there the hint is a button ("Tap to tilt the light."). On a phone the hint sits at the end of the hero's last line, because the stone runs below the first screen; on wider screens it is under the stone. Browsers only give tilt readings to pages served over HTTPS, so this cannot be tried on a phone from the local dev server. Its place and size are set by the `--R`, `--cx` and `--cy` variables on `.stage` in `app/globals.css`: the stone's right edge sits on the right edge of the page's column (`--wrap`, 1320px, growing with a wide screen), its radius is never more than 0.3 of the column, and `--room` is what is left beside it for words, which the headline, the lines of the cut and the email field never exceed, whatever the screen. Up to 1920px wide the type is as set; beyond that the root font size grows with the column (to 2200px), so a large screen shows the same page larger. On a short screen, such as a phone on its side, the hero's words fade as the cut begins, so they are gone before its first line shows.

Both surfaces come from one photograph, so the stone looks like a stone and not like code: the cut face of the lunar meteorite NWA 10665, a feldspathic breccia, photographed by Raimond Spekking ([Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lunar_meteorite_NWA_10665,_Feldspathic_breccia-8937.jpg), CC BY-SA 4.0), kept as `scripts/sources/nwa-10665.jpg`. `node scripts/stone-textures.mjs` makes them from it: `public/assets/stone-skin.webp` is a disc of the stone with the studio light divided out, so that the page's lamp can light it afresh, and `stone-face.webp` another disc of the same photograph for the cut face, since a breccia is the same stone all the way through. The textures, the still and the share image below are adaptations of that photograph, so they are under CC BY-SA 4.0 too, and the credit the licence asks for is given on the legal page (Credits, from `STONE_PHOTO` in `lib/site.ts`); keep it wherever the stone is shown. `STONE=lunar` takes the generated picture `06_nwa_14127.png` the stone was first drawn from, and `STONE=sphere` the polished sphere of `01_meteorite_hero.png`. When the page opens, the `BAKE` shader wraps the skin round a sphere (the front as photographed, the sides and back from a smaller disc within it, each turned its own way) into a cube map, and lays the face into a flat sheet with veins of black glass drawn across it: fifteen of them are the bars of the mark (`MARK`), four are not. Both textures are 2048 texels across, made smaller from discs some 2500 of the photograph's pixels across. The generated pictures' discs are only some 500 pixels across, so for those the script draws each disc again at full size: it closes the net of fine dark lines the picture lays over every clast, brings the edges between clast and matrix back to their steepness, and lays a grain finer than its pixels over the matrix. The cube is baked with about as many texels a face as the stone has pixels across (512, 1024 or 2048), and the canvas draws at the screen's own density up to 2. After that each frame only lights them (the `SCENE` shader): behind everything a wall some way back, where the lamp leaves a faint pool of warm light and the stone throws a wide, soft shadow away from it, so the dark is a room and not a void (the canvas runs from the page's left edge so that pool dies away as a circle and is never cut by a straight line); `skin()` is the polished stone, `face()` the cut, pale and dull from the saw until the polish crosses it and brings up the clasts and the glass. A photograph of a real specimen goes in the same way: add it at the top of the script, with the centre and radius of a disc that lies within the stone.

The brass stand comes from `01_meteorite_hero.png`, by way of `npm run stand` (`scripts/prepare-stand.mjs`). The source pictures all live in `scripts/sources`, outside `public`, so they are not published with the site; `03_muonionalusta.png`, `04_allende.png` and `05_campo_del_cielo.png` are kept there for later and are not on the page. `npm run textures` runs `scripts/stone-textures.mjs`. The shaders are compiled once the type has loaded and the first frame is drawn, so the headline is never held up by them.

Without WebGL or JavaScript the page shows `public/assets/stone-still.webp` in the stone's place: one frame of the same stone, saved from the shader. It does not change by itself when the shader does. To save it again: run `npm run still` (`node scripts/save-still.mjs public/assets`), open the dev server in a browser, and in its console run `__stone.still()`. That posts `still.png` to the script; make it a WebP (quality 88) and replace the file. `window.__stone` exists only in development; `__stone.settle(seconds)` runs the scene on, and `__stone.go(0.5)` scrolls to the middle of the cut.

The share image, `public/og.jpg`, was drawn in the browser from that still with the page's own type. When the still changes, lay the new still into the card where the stone is: its centre at 903.5, 298.5 and its radius 243.5 of the card's 1200 by 630 pixels. Shared links only carry it once `NEXT_PUBLIC_SITE_URL` is set (see `.env.example`).

## The cut

Scrolling past the hero holds the stone in place and cuts it in two. The lid lifts away, the polish crosses the sawn face, the veins of glass appear, and at the last the stone goes dark and leaves the mark. The bars of the mark (`MARK`) are among those veins from the start.

- `beats()` in `HeroStone.tsx` says where each step falls along the scroll.
- `components/Cut.tsx` holds the three lines of text and when each shows, and after them the name, one line more and the email field (`JoinForm.tsx`). "One small step" in the top line (the words are Armstrong's, from the first step on the Moon) travels to that point (`lib/glide.ts`): through the cut at one pace, coming to rest as the mark forms, so the visitor sees the stone cut on the way. The logo, at the top and at the foot, travels back up the same way. After the cut come three figures (`WhyNow.tsx`) and the footer, nothing else.
- `.stage[data-cut="live"]` in `app/globals.css` holds the stone and sets how long the stretch is (`--stretch`).

With motion reduced, or without WebGL, none of this runs: the lines and the field are plain text beside the stand and the stone stays whole.

## Why now

Under the cut, `components/WhyNow.tsx` closes the page as plainly as it can: Sotheby's Natural History sale of 16 July 2025 as the heading, two of its lots as what each fetched and four words on what it is ($5.3M, a piece of Mars, NWA 16788, the most ever paid for a meteorite; $825,500, a sphere of the Moon, Tisserlitine 006, the largest known lunar sphere), one italic line (none of it has an open market), the source with both stones named and linked, and then the invitation again with its own email field, for whoever read on past the one above. The page never says "why now": it speaks like a museum label, not a pitch. When the market moves, change the figures there and keep the heading and the source line true. The sphere's price comes from press reports of the sale, not from Sotheby's own results page, which asks for a login.

## The footer and the legal page

The footer (`components/Footer.tsx`) is one line on every page and at every width: the name (on a phone, the mark alone), "Legal", and the year. The contact address joins it from 1024px wide when `NEXT_PUBLIC_CONTACT_EMAIL` is set. "Legal" leads to `/legal` (`app/legal/page.tsx`), which holds our standards, the legal notice, the privacy notice (`/legal#privacy`, linked from the waitlist's consent line) and the contact address when it is set. The privacy notice describes what the code does today: the waitlist form, no cookies, no analytics, hosting on Vercel. If the code changes, it changes too. An address that leads nowhere gets the site's own 404 (`app/not-found.tsx`); `app/robots.ts` and `app/sitemap.ts` write robots.txt and the sitemap from `lib/site.ts`. Its date ("Updated …") is changed by hand whenever any line on it changes. The links between the two pages are plain links, so leaving the home page stops its sound and its stone, and coming back loads it afresh.

The scrollbar is drawn in the page's colours (`app/globals.css`): a hairline of bone that brightens under the pointer. Firefox takes the standard `scrollbar-color`; Chrome, Edge and Safari take the `::-webkit-scrollbar` rules, which they would ignore if the standard ones were set as well. Touch screens keep their own.

## Security headers

The pages are static and carry a Content-Security-Policy set in `next.config.mjs`, which allows inline scripts because Next.js writes its own into static pages. Every page sends `X-Content-Type-Options`, `Referrer-Policy` and a `Permissions-Policy` that keeps the motion sensors for the stone's tilt; framing is refused everywhere. Vercel adds Strict-Transport-Security.

## Sound

Off unless the visitor turns it on with "Sound" in the top line, and the bed opens out at once, so the visitor hears that it is on; nothing is struck bright. Everything is made in the browser by `lib/sound.ts`, voiced above 100 Hz so that the speaker of a laptop or a phone can play it: a low bed on A with its fifth and octaves, and for the cut a soft glow as the seam lights, a grind as the lid comes off, a hiss while the polish crosses the face, and one deep note for the mark. `HeroStone.tsx` reports the cut to it every frame. It has not yet been heard on real speakers or phones, only run without errors.

## Forms

The waitlist form saves nothing until its endpoint is set. See `.env.example`: set `NEXT_PUBLIC_CONTACT_EMAIL` with it, since the privacy notice promises an address to write to (the build warns otherwise).

## Deploying

The site is built and served by Vercel. Vercel refuses to deploy a Next.js with a known vulnerability, so keep `next` on a patched release (`npm audit` is clean on 16.4.5). Next 16 needs Node 20.9 or later. `next dev` keeps `AGENTS.md`, which points coding agents at the docs of the installed Next.js. The variables in `.env.example` are set in the project's settings on Vercel.
