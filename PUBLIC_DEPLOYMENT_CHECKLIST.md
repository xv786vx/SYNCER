# Syncer Chrome Extension - Public Deployment Checklist

This document provides a step-by-step guide to deploy your Syncer Chrome Extension for public use.

## 1. Backend Preparation

- [ ] Ensure backend is deployed at https://syncer-26vh.onrender.com
- [ ] Update CORS settings to handle public extension requests
- [ ] Implement rate limiting to prevent abuse
- [ ] Set up monitoring for backend health and quota usage

## 2. Google Cloud Project Configuration

- [ ] Move OAuth consent screen from "Testing" to "Production"
- [ ] Create privacy policy document and host it online
- [ ] Create terms of service document and host it online
- [ ] Submit verification request to Google with required documentation
- [ ] Request YouTube API quota increase if needed

## 3. Extension Preparation

- [ ] Update manifest.json with correct host_permissions
- [ ] Update version number (e.g., from 1.0 to 1.1)
- [ ] Create screenshots for Chrome Web Store listing
- [ ] Create promotional images for Chrome Web Store listing
- [ ] Write detailed extension description
- [ ] Build extension for production with `npm run build`

## 4. Chrome Web Store Submission

- [ ] Create a Chrome Web Store developer account
- [ ] Pay the one-time $5 registration fee
- [ ] Create new item in Developer Dashboard
- [ ] Upload packaged extension
- [ ] Fill in all required metadata
- [ ] Submit for review

## 5. Post-Publication Steps

- [ ] Update backend CORS settings with the final extension ID
- [ ] Set up analytics to track usage
- [ ] Create a user feedback mechanism
- [ ] Prepare for future updates and maintenance

## 6. YouTube API Verification Requirements

### Required Documentation

- [ ] Privacy Policy must include:
  - Description of how your app collects, uses, and shares user data
  - Types of personal information collected
  - Purpose of data collection
  - How users can access or delete their data
  - Third-party access to data
- [ ] OAuth Scope Justifications:
  - [ ] youtube.readonly - "This scope is needed to read user's YouTube playlists for synchronization with Spotify"
  - [ ] youtube - "This scope is needed to create and modify playlists on the user's YouTube account"

### Verification Evidence

- [ ] Screenshots of app functionality using each sensitive scope
- [ ] Step-by-step flow demonstrating how user data is used
- [ ] Explanation of why limited scopes are insufficient

## 7. Quota Management Strategy

- [ ] Implement persistent quota tracking (already done)
- [ ] Set up alerts when approaching quota limits
- [ ] Implement graceful degradation when quota is exceeded
- [ ] Consider implementing a queue for non-urgent operations
