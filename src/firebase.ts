import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the database ID specified in the config, if present.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Initialize and export Firebase Storage
export const storage = getStorage(app);

// Validate connection as instructed in the firebase integration skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client is offline.");
    } else {
      console.log("Firebase connection status tested.", error);
    }
  }
}
testConnection();
