# TODO

Things that need the owner, a real asset, or a check that could not be done from here. Nothing on the site or in the world invents a fact to fill these gaps; each one is a labelled placeholder until it is real.

## Content from Arman

- **Contact details**: confirm `CONTACT` in `lib/content.ts` (email, LinkedIn, GitHub) before launch.
- **CV check**: `/portfolio/cv` is generated from `lib/content.ts`. Read it once as a CV and say what is missing (dates, education years, anything a recruiter expects). It prints to one A4 page today.
- **Case studies**: problem, what was built and outcome for each project (`components/garage/CaseStudy.tsx`, `CaseOverlay.tsx`). Outcome rows stay "TODO" until there is a real result to state.
- **Project media**: screenshots or short loops for every project (`CaseStudy`, `CaseOverlay`, `CursorPreview`, `ImageTrail`).
- **Real flyer images**: Interaction Day, Murder Mystery and more, for the site's flyer wall (`components/radio/FlyerWall.tsx`) and the Club Literati façade in the world (`world/build/zones/radio.ts`, currently drawn placeholders labelled "FLYER PLACEHOLDER").
- **First place**: which hackathon was the win. Until then no event carries a 1st-place stamp, on the site or on the Race Log gates.
- **Telemetry descriptions**: the world shows each skill's channel and note. The skills data has no one-line description per channel, so none is shown. Add one to `CHANNELS` if wanted.
- **Driver card photo** (`components/about/DriverCard.tsx`).

## Assets

- **Portrait cut-out** for depth layering: `/public/images/arman-cutout.png` (transparent PNG matching `arman-portrait.jpg`, 1152×1536). Lets the Unmask wordmark sit behind the subject (`components/unmask/GiantWordmark.tsx`).
- **Custom GLB hooks** (optional, the world is fully procedural today):
  - the buggy body (`world/engine/car.ts`, `buildBody()`),
  - the SCARA arm and the motorcycle could be swapped for modelled versions (`world/build/zones/garage.ts`, `offTrack.ts`).
  Any model must be original or licensed, with no manufacturer branding.

## Integrations

- **Email provider** for the contact form: `app/api/contact/route.ts` (`sendEmail()`, and set `CONTACT_PROVIDER_KEY`). Until then the form validates, rate-limits and answers 503 with a pointer to the email address. It never reports a fake success.
- **Rate limiting** is per server instance (in memory). Use a shared store (KV/Redis) if the form goes live on a multi-instance host.
- **Site URL**: set `NEXT_PUBLIC_SITE_URL` to the production domain (canonical URLs, OG images, sitemap). On Vercel the production URL is picked up automatically.
- **Online leaderboard**: hook only (`lib/progress.ts`). There is deliberately no backend.

## Not verified here

- **Real phones**: the world was tested with Chrome's mobile emulation (touch, 390×844 and 844×390, low tier), not on physical devices. Frame rate on a mid-range phone is unmeasured.
- **Physical gamepads**: tested with a simulated standard-mapping pad (Start, triggers, stick, face buttons). Not tested with real hardware.
- **Safari and Firefox**: all automated checks ran in Chrome. Canvas `fontStretch` (condensed Archivo on drums and signs) is Chrome/Safari only; Firefox falls back to the regular width.
- **Clipboard on drive-in** (Pit Exit email sign): relies on the page having focus; if the browser refuses, a toast offers the email link instead.
- **Lint**: the repo has no ESLint config (Next 16 removed `next lint`), so no linter was run. TypeScript is strict and passes.
- **Library warnings** in the console that come from dependencies, not this code: Rapier's WASM init ("deprecated parameters for the initialization function") and R3F 9.7 ("THREE.Clock … deprecated").
