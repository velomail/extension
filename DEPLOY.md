# VeloMail — Publishing & Deploy

## Extension (Chrome Web Store)

- **Package:** Run `node scripts/package-for-store.js` from the project root. This creates `velomail-chrome-web-store.zip` containing only `manifest.json`, `src/`, and `assets/` (no landing, api, docs, scripts, or node_modules). Upload the zip in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- **Icons:** Extension icons must be in `assets/images/` (icon16.png, icon48.png, icon128.png). Run `node scripts/create-store-icons.js` if they are missing.
- **Eligibility:** Before submitting, complete [docs/PRE-SUBMIT-CHECKLIST.md](docs/PRE-SUBMIT-CHECKLIST.md). Copy the permissions justification from [docs/PERMISSIONS-JUSTIFICATION.txt](docs/PERMISSIONS-JUSTIFICATION.txt) into the Developer Dashboard "Justification for Permissions" field.

## Landing page (GitHub Pages)

The extension points to **https://velomail.github.io/extension** for upgrade and privacy (GitHub username: `velomail`, repo: `extension`).

### 1. Push the repo to GitHub

1. Create a new repository on GitHub (e.g. `extension`). Do not add a README, .gitignore, or license.
2. Add remote and push (replace `YOUR_USERNAME` and `YOUR_REPO`):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
   If GitHub prompts for auth, use a Personal Access Token as the password.
3. **Optional – tag a release:** `git tag v1.0.1` then `git push origin v1.0.1`.

### 2. Enable GitHub Pages

1. In the repo: **Settings → Pages**.
2. **Source:** Deploy from a branch.
3. **Branch:** `main` (or your default branch). **Folder:** `/ (root)`.
4. Save. The site will be at `https://<username>.github.io/<repo>/`.

With repo root as the site root, the landing is at `/<repo>/landing/` and the root `index.html` redirects there. Privacy is at `/<repo>/landing/privacy.html`.

### 3. Set extension and Store URLs

- Chrome Web Store **Website:** `https://velomail.github.io/extension`
- Chrome Web Store **Privacy policy:** `https://velomail.github.io/extension/landing/privacy.html`

### 4. Before submit — verify URLs work

- Open **Privacy policy:** `https://velomail.github.io/extension/landing/privacy.html` in a browser and confirm it loads.
- Open **Website (landing):** `https://velomail.github.io/extension` and confirm the landing page loads.
- Enter both URLs in the Chrome Web Store Developer Dashboard (Privacy practices → Privacy policy; Store listing → Website).
