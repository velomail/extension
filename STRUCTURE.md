# VeloMail project structure

---

```
velomail/
├── .cursorrules
├── .gitignore
├── .nojekyll
├── .prettierrc.mjs
├── DEPLOY.md
├── index.html              # Redirect to landing/
├── manifest.json
├── package.json
├── package-lock.json
├── README.md
├── vercel.json
│
├── .github/
│   └── workflows/
│       └── submit.yml
│
├── api/
│   └── verify-session.js   # Vercel serverless (post-purchase)
│
├── assets/
│   ├── images/             # Extension icons (16, 48, 128)
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   ├── icon128.png
│   │   └── ...
│   └── store/              # Store assets (screenshots, mockups, promo)
│       ├── mockup-promo-tile.html
│       ├── mockup-screenshot1.html
│       ├── mockup-screenshot2.html
│       ├── promo-tile-440x280.png
│       ├── screenshot-1-1280x800.png
│       ├── screenshot-2-1280x800.png
│       └── ...
│
├── docs/
│   ├── README.md           # Docs index
│   ├── PRE-SUBMIT-CHECKLIST.md
│   ├── PERMISSIONS-JUSTIFICATION.txt
│   ├── CHROME-WEB-STORE-LISTING.md
│   ├── CHROME-STORE-SECURITY-AUDIT.md
│   ├── PRIVACY-POLICY.md
│   ├── POST-PURCHASE-UNLOCK.md
│   ├── ARCHITECTURE.md
│   └── DEVELOPER-GUIDE.md
│
├── landing/
│   ├── index.html
│   ├── privacy.html
│   ├── success.html
│   ├── style.css
│   ├── landing.js
│   └── ...
│
├── scripts/
│   ├── package-for-store.js
│   ├── build-landing.js
│   ├── create-store-icons.js
│   └── build-icons-from-logo.js
│
└── src/                    # Extension source
    ├── background/
    │   └── worker-simple.js
    ├── content/
    │   ├── content.js
    │   ├── styles.css
    │   └── success-unlock.js
    ├── lib/
    │   ├── first-compose-guide.js
    │   └── theme.js
    ├── popup/
    │   ├── index.html
    │   ├── popup.js
    │   └── style.css
    └── welcome/
        ├── welcome.html
        ├── welcome.js
        └── welcome.css
```

**Not in repo (gitignored):** `node_modules/`, `public/`, `*.zip`, `.chrome-store-staging/`, `.env*`

**Removed:** `netlify/` (using Vercel), `public/` (build output), `docs/DONE-AND-WORKING-CHECKLIST.md` (redundant)
