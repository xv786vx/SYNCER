# SYNCER Chrome Extension - Deployment Roadmap

## 🔧 PHASE 1: Polish & Prep Your Backend (1–2 Days)

- [x] Ensure it's deployed with production settings
- [ ] Add proper CORS settings for the final extension origin
  - [ ] Update to use chrome-extension://<extension_id> after publishing
- [ ] Add basic user authentication or rate-limiting if you expect multiple users
- [ ] Double-check YouTube & Spotify token handling (secure, persistent, user-bound)

### Backend Checklist

- [ ] CORS allows production extension
- [ ] Secure session/token management
- [ ] Add rate limiting if needed
- [ ] Use .env.production for secure config

## 🎨 PHASE 2: Polish the UI (1–2 Days)

Use your current code as a base, and improve:

- [ ] Layout spacing, alignment, padding
- [ ] Font and visual hierarchy
- [ ] Color contrast and hover/focus states
- [ ] Add icon consistency (Lucide or FontAwesome)
- [x] Optional: Draw inspiration from Cobalt Tools, apply glassmorphism, shadows, bold typography

### UI Checklist

- [ ] Responsive layout
- [ ] Hover/focus feedback
- [ ] Better fonts & iconography
- [ ] Use Tailwind (or SCSS) for design consistency

## 📦 PHASE 3: Finalize Extension Manifest (1 Day)

Update manifest.json:

- [x] host_permissions: include your backend URL (https://syncer-26vh.onrender.com)
- [x] Proper icons (16px, 48px, 128px)
- [x] Description, name, version
- [ ] Remove dev-only permissions

Then build:

```bash
npm run build
```

This generates your dist/ folder to upload to the Chrome Web Store.

## 📝 PHASE 4: Write Legal & Marketing Docs (1–2 Days)

Required for Google API OAuth Verification and Chrome Web Store:

- [x] Privacy Policy & Terms of Service

  - [x] Create documentation (PRIVACY_POLICY.md, TERMS_OF_SERVICE.md)
  - [ ] Host them via:
    - [ ] GitHub Pages
    - [ ] Netlify
    - [ ] Vercel
    - [ ] Your own domain (if you have one)

- [ ] Screenshots & Banner

  - [ ] Screenshots of the extension in use
  - [ ] Banner image (1280x800)
  - [ ] Show key flows: Spotify playlist entry → sync → success

- [ ] Chrome Web Store Description
  - [ ] What does it do?
  - [ ] Why is it useful?
  - [ ] Any data collected? (be honest here)

## 🔐 PHASE 5: Google OAuth App Verification (Takes Time)

YouTube API requires app verification.

- [ ] Go to Google Cloud Console > OAuth consent screen
- [ ] Change from "Testing" to "Production"
- [ ] Submit for review

### Required for Verification

- [ ] Privacy Policy URL
- [ ] ToS URL
- [ ] Scopes justification (why you need youtube.force-ssl, etc.)
- [ ] Possibly a YouTube demo video

### Tips

- Be clear and concise about your use of the API
- Make sure your branding matches (name, description, etc.)
- Verification can take 2–6 weeks

**Note:** This step can run in parallel with publishing your Chrome extension. You'll still be limited to 100 test users until verified.

## 🚀 PHASE 6: Upload & Submit to Chrome Web Store (1 Day)

- [ ] Go to Chrome Web Store Developer Dashboard
- [ ] Pay the $5 one-time fee (if not done)
- [ ] Click "New Item"
- [ ] Upload ZIP from dist/
- [ ] Fill out:
  - [ ] Name
  - [ ] Description
  - [ ] At least 1 screenshot
  - [ ] Banner (optional)
  - [ ] Category (Productivity)
  - [ ] Permissions summary
- [ ] Submit for review (takes 1–3 business days)

## 📊 PHASE 7: Post-Launch Maintenance (Optional)

- [ ] Add user feedback support (simple form/email)
- [ ] Monitor YouTube quota usage
- [ ] Add analytics (optional)
- [ ] Iterate on UI/UX based on feedback

## ✅ Final TL;DR Checklist

| Task                          | Status |
| ----------------------------- | ------ |
| 🔧 Backend CORS/Auth Settings | ❌     |
| 🎨 UI Polished                | ❌     |
| 📦 Manifest Updated & Built   | ✅     |
| 📝 Legal & Marketing Assets   | ❌     |
| 🔐 Google OAuth Verification  | ❌     |
| 🚀 Chrome Store Submission    | ❌     |
| 📊 Optional Post-Launch Work  | ❌     |
