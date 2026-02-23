# VeloMail — Publishing & Deploy

## Extension (Chrome Web Store)

- **Package:** Use `scripts/package-for-store.js` to build a zip (or zip the project root excluding `landing/`, `node_modules/`, `.git` as needed). Upload the zip in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- **Icons:** Store assets live in `assets/images/` (icon16, icon48, icon128) and `assets/store/` (mockups). Run `node scripts/create-store-icons.js` if icons are missing.
- **Justification:** Use the 2-sentence justification in `docs/CHROME-STORE-SECURITY-AUDIT.md` in the Developer Dashboard "Justification for Permissions" field.

## Landing page (Netlify)

The extension points to **https://velomailext.netlify.app** for upgrade and privacy. Deploy the `landing/` folder to Netlify.

- **Option A — Netlify from GitHub:** New site from Git → choose repo → **Base directory:** `landing` → **Build command:** (leave empty for static) → **Publish directory:** `.` (or `landing` if base is repo root). Pushes to `main` trigger deploys.
- **Option B — Drag and drop:** Zip the contents of `landing/` (index.html, privacy.html, style.css, landing.js, assets they reference). In Netlify: Deploy manually → drag the zip.
- After deploy, confirm https://velomailext.netlify.app and that **Privacy** is at `/privacy.html`. Set the Chrome Web Store listing **Website** and **Privacy policy** URLs to match.

---

## Next steps: Upload to GitHub

**Done already:** This repo has `git init`, an initial commit, and branch `main`. Do the following next:

1. **Create the repo on GitHub:** Go to [github.com](https://github.com) → **+** → **New repository**. Name it (e.g. `email-mobility`). Do not add a README, .gitignore, or license. Click **Create repository**.

2. **Add remote and push** (replace `YOUR_USERNAME` and `YOUR_REPO`):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   If GitHub prompts for auth, use a Personal Access Token as the password.

3. **Optional – tag a release:** `git tag v1.0.1` then `git push origin v1.0.1`.

## Next steps: Deploy landing page

1. **Netlify (recommended):** Sign in at [netlify.com](https://www.netlify.com). **Add new site** → **Import an existing project** → connect your GitHub account and select the repo.
2. **Build settings:** Set **Base directory** to `landing`. Leave **Build command** empty. Set **Publish directory** to `.` (publish from the `landing` folder).
3. Deploy. Your site will be at `https://<random>.netlify.app`. Optionally set a custom subdomain (e.g. velomailext.netlify.app) under **Domain settings**.
4. Update the Chrome Web Store listing **Website** and **Privacy policy** to your live URLs (e.g. `https://velomailext.netlify.app` and `https://velomailext.netlify.app/privacy.html`).
