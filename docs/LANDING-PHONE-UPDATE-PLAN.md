# Landing Page Phone UI Update — Plan & Verification

## What Was Done

The landing hero phone mockup was replaced with the same component used in onboarding (`src/welcome/welcome.html` slide 1):

- **HTML**: New structure with `phone-dark-pill`, `phone-notch` inside screen, `phone-status`, `phone-header` (Cancel / New Message / Send), `phone-email` (To/From/Subject/body), `phone-home-bar`
- **CSS**: New styles in `landing/style.css` matching onboarding phone (230×500px frame, 48px radius, notch, etc.)

## Why "Nothing Changed" Might Happen

| Cause | Fix |
|-------|-----|
| **Viewing deployed site** (velomail.vercel.app/landing/) | Deploy runs `build-landing.js` which copies `landing/` → `public/landing/`. Redeploy to see changes. |
| **Browser cache** | Hard refresh: `Ctrl+Shift+R` (Win) or `Cmd+Shift+R` (Mac) |
| **Opening `landing/index.html` via file://** | Some browsers restrict relative CSS. Use a local server instead. |
| **Wrong path** | Landing lives at `/landing/` when served (root redirects there) |

## Verification Steps

### 1. Build locally
```bash
npm run build-landing
```
Output: `public/landing/` with updated HTML and CSS.

### 2. Preview locally
```bash
npm run preview-landing
```
Opens http://localhost:3000/landing/ — same structure as production.

### 3. Deploy (Vercel)
```bash
vercel
# or push to trigger auto-deploy
```
Vercel runs `build-landing.js` and serves `public/`.

## Expected Result

- Taller phone frame (230×500px vs old 190px width)
- "Dark" pill above the screen
- Notch inside the screen
- Compose-style header: Cancel | New Message | Send
- To / From / Subject rows with character count
- Home bar at bottom
- Pre-flight check pills below unchanged
