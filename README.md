# Tom’s CookBook

A polished, mobile-first PWA for private food, calorie, activity, water, and weight tracking. It is built with Next.js, TypeScript, Tailwind CSS, Recharts, and browser local storage.

## Highlights

- Responsive iPhone bottom navigation and desktop sidebar
- Daily dashboard with eaten, active burned, net, remaining, macros, water, and weight
- Day, week, and month calorie charts plus hydration and weight trends
- Reusable food library with images, links, automatic package calories and serving cost, search, favorite, duplicate, edit, delete, and JSON sharing
- Daily food diary with serving adjustments and historical date picker
- Manual active-calorie tracking, saved workouts, steps, distance, and workout calories
- One-tap water sizes (8, 12, 16, 16.9, and 24 oz), custom amounts, history, progress, deletion, and undo latest
- Morning and bedtime weight check-ins
- Editable calorie/water goals, light and dark modes, guided empty/loading states, validation, notifications, and delete confirmation
- Installable manifest and runtime service worker cache for previously loaded content
- Complete JSON backup transfer: export on a computer, send the file to a phone, and import every record and setting

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A new installation starts with an empty private workspace. Changes are saved automatically to the current browser profile.

For production:

```bash
npm run build
npm start
```

Service worker registration is enabled only in a production build. Use HTTPS in production; `localhost` is also treated as a secure PWA context by modern browsers.

## Install on iPhone

Open the deployed app in Safari, tap **Share**, choose **Add to Home Screen**, then tap **Add**. The desktop install button uses the browser install prompt when available and otherwise shows these instructions.

The included SVG is both the install icon and the source for the in-app `TC` mark. For App Store distribution, export it to the required PNG sizes as part of the native build pipeline.

## Data and privacy

There is no server account. Each installation uses one versioned JSON record in `localStorage`; records are isolated to that device and browser profile. Clearing site data removes them, so use **Share JSON** in the food library to export saved foods when needed. The complete model is documented in [DATA_SCHEMA.md](./DATA_SCHEMA.md).

For a full device transfer, open the settings menu and choose **Export all** on the computer. Send the generated JSON file to the phone, open Tom’s CookBook there, and choose **Import all**. The app confirms before replacing the phone’s current local data.

The image upload limit is 700 KB to reduce the chance of exhausting the browser’s local storage quota. Product image URLs are also supported.

## Environment

No environment variables or secrets are required for local-only use. The sample file exposes the display version for future build customization.

```text
NEXT_PUBLIC_APP_VERSION=1
```

## Validation

```bash
npm run lint
npm test
npm run build
```

The core-flow test creates a saved food, logs servings, adds calories burned and water, verifies the net-calorie formula and macros, serializes the entire record, reloads it through the production persistence helpers, and confirms the totals remain identical after the simulated refresh.


## Barcode lookup and refreshed daily workflow

The app uses the supplied TC logo and native SVG animations from `assets/`.
Runtime copies and install icons live in `public/assets/` and `public/icons/`.
The confirmation SVG plays once per saved meal; reduced-motion users receive a
static check. Hydration always comes from saved water records, not the GIF.

`GET /api/barcode?code=0012345678905` looks up Open Food Facts server-side with
an app-identifying User-Agent and a 10-second timeout. Only 8?14 digit strings
are accepted. Product photos fall back from small to large to the TC thumbnail.
Open Food Facts is credited in the preview. Barcode queries go to the server and
Open Food Facts; the personal diary remains in browser storage.

Camera use requires HTTPS (or localhost) and browser permission. The rear camera
is preferred. Native BarcodeDetector is used when available; a local EAN-13,
EAN-8 and UPC-A scanline decoder provides a fallback. Hold the barcode horizontally
inside the frame. Two matching reads trigger one lookup. Closing the scanner,
typing a code, or hiding the page stops the stream. UPC-A is represented as EAN-13
with a leading zero by the software decoder. Manual entry remains available for
unrecognized products, missing nutrition, unavailable cameras and offline lookup.

### Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
Tests use worker threads so they also run where Windows child-process forks are
restricted. Barcode tests cover lookup errors, leading zeros, photos, portions,
missing versus zero calories, volume/mass separation, snapshots, repeated entry IDs,
and updated dashboard totals. Decoder tests cover EAN/UPC fixtures and checksums.

A real-phone acceptance pass should check rear-camera selection, permission denial,
focus in typical lighting, closing during initialization, duplicate reads, and
camera shutdown when backgrounding. Also check two successive ?Meal logged?
animations, water GIF replay, reduced-motion static states, image fallback,
keyboard/bottom-sheet layout, and installed PWA icons. Automated UI/browser checks
could not run in the implementation environment because Windows denied browser
process launch; synthetic decoding tests do not replace real-camera testing.
