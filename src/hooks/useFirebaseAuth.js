import { useState, useEffect } from 'react';
import { auth, ensureAuthenticated } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function useFirebaseAuth() {
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await ensureAuthenticated();
        } catch (error) {
          console.error('Error ensuring authentication:', error);
        }
      } else {
        setAuthUser(user);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    authUser,
    loading
  };
} 