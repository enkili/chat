import { initializeApp } from 'firebase/app'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'

const emulatorEnabled = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true'
const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'
const emulatorPort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_PORT || 9000)
const emulatorProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-messagesync'

const firebaseConfig = emulatorEnabled
  ? {
      projectId: emulatorProjectId,
      apiKey: 'demo-api-key',
      appId: 'demo-app-id',
      databaseURL:
        import.meta.env.VITE_FIREBASE_DATABASE_URL ||
        `https://${emulatorProjectId}-default-rtdb.firebaseio.com`,
    }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

const requiredConfig = emulatorEnabled
  ? [firebaseConfig.projectId, firebaseConfig.databaseURL]
  : [
      firebaseConfig.apiKey,
      firebaseConfig.authDomain,
      firebaseConfig.databaseURL,
      firebaseConfig.projectId,
      firebaseConfig.storageBucket,
      firebaseConfig.messagingSenderId,
      firebaseConfig.appId,
    ]

export const firebaseReady = requiredConfig.every(Boolean)
export const firebaseMode = emulatorEnabled ? 'emulator' : 'live'

let database = null

if (firebaseReady) {
  const app = initializeApp(firebaseConfig)
  database = getDatabase(app)

  if (emulatorEnabled) {
    connectDatabaseEmulator(database, emulatorHost, emulatorPort)
  }
}

export { database, firebaseConfig }