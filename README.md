# messageSync

Ephemeral two-person chat for the web using React, Vite, Firebase Hosting, and Firebase Realtime Database.

## What is implemented

- Room-based 1:1 chat flow
- Session rotation on join or reset so old messages disappear
- Realtime participants list
- Firebase-ready Hosting and Realtime Database config
- Demo-oriented rules and environment template

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template for either emulator mode or a real Firebase project:

   ```bash
   cp .env.example .env.local
   ```

3. For local-only development with the Firebase Emulator Suite, keep these values in `.env.local`:

   ```bash
   VITE_USE_FIREBASE_EMULATOR=true
   VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
   VITE_FIREBASE_EMULATOR_PORT=9000
   VITE_FIREBASE_PROJECT_ID=demo-messagesync
   VITE_FIREBASE_DATABASE_URL=https://demo-messagesync-default-rtdb.firebaseio.com
   ```

4. Start the Firebase Realtime Database emulator:

   ```bash
   npm run emulators
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Firebase setup

1. Enable Firebase Realtime Database.
2. Replace the demo project id in `.firebaserc` when switching away from local emulator mode.
3. Fill in the live Firebase values in `.env.local` and set `VITE_USE_FIREBASE_EMULATOR=false`.
4. Deploy rules and hosting after building the app.

## GitHub deployment

This repo includes a GitHub Actions workflow that builds the app and deploys Firebase Hosting plus Realtime Database rules to the Firebase project `aichatbox-3a719`.

Add these repository secrets in GitHub before enabling the workflow:

- `FIREBASE_SERVICE_ACCOUNT_AICHATBOX_3A719`: the full JSON for a Firebase service account with Hosting and Realtime Database deploy access
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

After those are added, pushes to `main` or a manual workflow run will deploy using `.github/workflows/firebase-deploy.yml`.

To set the service-account secret from the local JSON file in this repo, first authenticate GitHub CLI and then run:

```bash
gh auth login
./scripts/set-github-firebase-secret.sh
```

This local JSON file only covers the `FIREBASE_SERVICE_ACCOUNT_AICHATBOX_3A719` secret. The `VITE_FIREBASE_*` values must come from Firebase Console for your web app:

1. Open Project settings.
2. Open the General tab.
3. Find Your apps and select the web app.
4. Copy the SDK config values into GitHub repository secrets.

## Behavior

- Messages are transient and tied to the current room session.
- Joining the same room in a new session clears the visible thread for everyone in that room.
- This implementation is suitable for demos and private prototypes; add Auth and stronger rules before public release.