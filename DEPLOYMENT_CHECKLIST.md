1. Finalize Extension Functionality
   - [x] Persistent user ID and token storage (done)
   - [x] Only prompt OAuth when needed (done)
   - [x] All backend/extension API flows working (done)
   - [ ] Polish UI/UX (optional but recommended)
   - [ ] Test all flows (auth, sync, merge, download) in production-like environment
2. Build & Host a Simple Website
   - [ ] Create a minimal web project (e.g., in a new web/ or landing/ folder)
     - Home page: brief about the extension, install link, screenshots
     - /privacy or /privacy-policy: Render your PRIVACY_POLICY.md
     - /terms or /terms-of-service: Render your TERMS_OF_SERVICE.md
     - (Optional) /success or /auth-complete: "You may close this tab" for OAuth redirect
   - [ ] Deploy to Vercel, Netlify, or GitHub Pages
   - [ ] Use these URLs for Privacy Policy and ToS in Google/Chrome Store
3. Prepare Legal & Marketing Assets
   - [ ] Take screenshots of the extension in use (all major flows)
   - [ ] Create a banner image (1280x800, optional)
   - [ ] Write a clear Chrome Web Store description (what it does, why it’s useful, what data is collected)
   - [ ] Justify all OAuth scopes (for Google verification)
4. Google OAuth App Verification
   - [ ] Go to Google Cloud Console > OAuth consent screen
   - [ ] Set Privacy Policy and ToS URLs to your hosted pages
   - [ ] Change status from "Testing" to "Production"
   - [ ] Fill out scope justifications (why you need each YouTube/Spotify scope)
   - [ ] (Optional but recommended) Record a demo video showing the OAuth and sync flows
   - [ ] Submit for verification (can take 2–6 weeks, but you can have up to 100 test users in the meantime)
5. Chrome Web Store Submission
   - [ ] Build your extension for production (npm run build or equivalent)
   - [ ] Zip the dist/ folder (or whatever your build output is)
   - [ ] Go to Chrome Web Store Developer Dashboard
   - [ ] Pay the $5 one-time fee (if not done)
   - [ ] Click "New Item", upload your ZIP, fill out all required fields
   - [ ] Add screenshots, banner, description, permissions summary, and category
   - [ ] Submit for review (usually 1–3 business days)
6. Post-Launch Maintenance (Optional)
   - [ ] Add user feedback support (form or email)
   - [ ] Monitor YouTube quota usage
   - [ ] Add analytics (optional)
   - [ ] Iterate on UI/UX based on user feedback
7. Final Checklist
   - [ ] All extension flows work in production
   - [ ] Privacy Policy & ToS are hosted and linked in both Google and Chrome Store
   - [ ] OAuth redirect URIs are correct and registered
   - [ ] CORS settings in backend allow your extension and website
   - [ ] All sensitive data is handled securely
   - [ ] All required assets (screenshots, banner, description) are ready
