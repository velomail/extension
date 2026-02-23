# VeloMail — Publishing & Deploy

## Extension (Chrome Web Store)

- **Package:** Use `scripts/package-for-store.js` to build a zip (or zip the project root excluding `landing/`, `node_modules/`, `.git` as needed). Upload the zip in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
- **Icons:** Store assets live in `assets/images/` (icon16, icon48, icon128) and `assets/store/` (mockups). Run `node scripts/create-store-icons.js` if icons are missing.
- **Justification:** Use the 2-sentence justification in `docs/CHROME-STORE-SECURITY-AUDIT.md` in the Developer Dashboard "Justification for Permissions" field.

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
