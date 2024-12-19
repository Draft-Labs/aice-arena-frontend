import { useState } from 'react';
import { auth } from '../config/firebase';
import { 
  TwitterAuthProvider, 
  linkWithPopup, 
  signInWithPopup,
  signInWithCredential,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-toastify';
import '../styles/TwitterAuth.css';

const TwitterAuth = ({ account, onTwitterLink }) => {
  const [isLinking, setIsLinking] = useState(false);

  const refreshAuthState = async () => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      } else {
        await auth.currentUser.getIdToken(true);
      }
    } catch (error) {
      console.error('Error refreshing auth state:', error);
      throw new Error('Failed to refresh authentication');
    }
  };

  const handleTwitterAuth = async () => {
    try {
      setIsLinking(true);
      
      await refreshAuthState();
      
      const provider = new TwitterAuthProvider();
      
      try {
        if (auth.currentUser) {
          const result = await linkWithPopup(auth.currentUser, provider);
          const twitterUser = result.user;
          await handleSuccessfulAuth(twitterUser);
        } else {
          const result = await signInWithPopup(auth, provider);
          const twitterUser = result.user;
          await handleSuccessfulAuth(twitterUser);
        }
      } catch (error) {
        if (error.code === 'auth/credential-already-in-use') {
          const credential = TwitterAuthProvider.credentialFromError(error);
          if (credential) {
            const result = await signInWithCredential(auth, credential);
            await handleSuccessfulAuth(result.user);
          } else {
            throw new Error('Failed to get Twitter credentials');
          }
        } else if (error.code === 'auth/user-token-expired') {
          await refreshAuthState();
          const result = await linkWithPopup(auth.currentUser, provider);
          await handleSuccessfulAuth(result.user);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Twitter auth error:', error);
      let errorMessage = 'Failed to connect Twitter account';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Twitter login was cancelled';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Please allow popups for Twitter login';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'This Twitter account is already linked to another user';
          break;
        case 'auth/user-token-expired':
          errorMessage = 'Your session expired. Please try again.';
          break;
        default:
          errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLinking(false);
    }
  };

  const handleSuccessfulAuth = async (twitterUser) => {
    try {
      console.log('Twitter user data:', {
        user: twitterUser,
        providerData: twitterUser.providerData,
        reloadUserInfo: twitterUser.reloadUserInfo,
        additionalUserInfo: twitterUser.additionalUserInfo
      });

      // Try to get Twitter data from the credential result
      let twitterHandle = null;

      // Method 1: Try to get from reloadUserInfo
      if (twitterUser.reloadUserInfo?.providerUserInfo?.[0]?.screenName) {
        twitterHandle = twitterUser.reloadUserInfo.providerUserInfo[0].screenName;
      }
      // Method 2: Try to get from additionalUserInfo
      else if (twitterUser.additionalUserInfo?.username) {
        twitterHandle = twitterUser.additionalUserInfo.username;
      }
      // Method 3: Try to get from provider data
      else {
        const twitterProvider = twitterUser.providerData.find(
          (p) => p.providerId === 'twitter.com'
        );
        if (twitterProvider?.screenName) {
          twitterHandle = twitterProvider.screenName;
        }
      }

      console.log('Found Twitter handle:', twitterHandle);

      if (!twitterHandle) {
        console.error('Twitter data structure:', {
          provider: twitterUser.providerData[0],
          reloadInfo: twitterUser.reloadUserInfo,
          additionalInfo: twitterUser.additionalUserInfo
        });
        throw new Error('Could not retrieve Twitter handle');
      }

      const userProfileRef = doc(db, 'userProfiles', account.toLowerCase());
      
      const docSnap = await getDoc(userProfileRef);
      
      if (!docSnap.exists()) {
        await setDoc(userProfileRef, {
          address: account.toLowerCase(),
          twitterHandle,
          twitterVerified: true,
          twitterUid: twitterUser.providerData[0]?.uid || twitterUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } else {
        await setDoc(userProfileRef, {
          ...docSnap.data(),
          twitterHandle,
          twitterVerified: true,
          twitterUid: twitterUser.providerData[0]?.uid || twitterUser.uid,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      onTwitterLink(twitterHandle);
      toast.success('Twitter account linked successfully!');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      console.error('Full error details:', {
        error,
        user: twitterUser,
        provider: twitterUser?.providerData
      });
      throw error;
    }
  };

  return (
    <div className="twitter-auth">
      <button 
        onClick={handleTwitterAuth}
        disabled={isLinking}
        className="twitter-auth-button"
      >
        <svg viewBox="0 0 24 24" className="twitter-icon">
          <path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z"/>
        </svg>
        {isLinking ? 'Connecting...' : 'Connect Twitter'}
      </button>
    </div>
  );
};

export default TwitterAuth; 