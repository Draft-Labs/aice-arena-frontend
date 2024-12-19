import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { toast } from 'react-toastify';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyA938nUWEfj366te2LXD80kq28aQmVQbWg",
    authDomain: "casino-dapp-48c82.firebaseapp.com",
    projectId: "casino-dapp-48c82",
    storageBucket: "casino-dapp-48c82.firebasestorage.app",
    messagingSenderId: "131413974864",
    appId: "1:131413974864:web:28f2236e5c9e3d1229d655",
    measurementId: "G-ZQDDS6WF21"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Helper function to ensure authentication
export const ensureAuthenticated = async () => {
  try {
    if (!auth.currentUser) {
      console.log('No current user, attempting anonymous sign in...');
      const result = await signInAnonymously(auth);
      console.log('Anonymous sign in successful:', result.user.uid);
    }
    return auth.currentUser;
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.code === 'auth/configuration-not-found') {
      toast.error('Authentication not properly configured. Please contact support.');
    } else {
      toast.error(`Authentication error: ${error.message}`);
    }
    throw error;
  }
}; 