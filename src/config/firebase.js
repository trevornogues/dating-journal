import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configurations
const firebaseConfig = {
  apiKey: "AIzaSyDrnbr4m7ywcoe58KDLGTFkur9jyIs0RIM",
  authDomain: "dating-journal-2fc6f.firebaseapp.com",
  projectId: "dating-journal-2fc6f",
  storageBucket: "dating-journal-2fc6f.firebasestorage.app",
  messagingSenderId: "606261689883",
  appId: "1:606261689883:web:9ddddaed164a01f53282be",
  measurementId: "G-QTBS3BLVL5"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication with platform-specific persistence
export const auth = (() => {
  if (Platform.OS === 'web') {
    const webAuth = getAuth(app);
    // Ensure persistence in the browser
    try { setPersistence(webAuth, browserLocalPersistence); } catch (e) {}
    return webAuth;
  }
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
})();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
