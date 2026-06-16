import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

try {
  let config: any = null;
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');

  if (fs.existsSync(firebaseConfigPath)) {
    config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  } 
  else if (process.env.FIREBASE_CONFIG) {
    try {
      config = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.error("[db.ts] Failed to parse FIREBASE_CONFIG:", e);
    }
  } 
  else if (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY) {
    config = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    };
  }

  if (config) {
    // Ensure projectId exists
    if (!config.projectId) {
      throw new Error("[db.ts] Missing Firebase projectId in config");
    }

    // Initialize Firebase App
    const app = initializeApp(config);

    // ✅ SAFE Firestore init (NO initializeFirestore)
    db = getFirestore(app);

    console.log(
      "[db.ts] Firebase initialized successfully. Project:",
      config.projectId
    );
  } 
  else {
    console.warn(
      "[db.ts] Firebase config not found. Running in offline mode."
    );
  }

} catch (err) {
  console.error("[db.ts] Failed to initialize Firebase:", err);
}
