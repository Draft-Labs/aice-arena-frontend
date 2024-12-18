import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { db, auth } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/Account.css';
import { ensureAuthenticated } from '../config/firebase';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';
import TwitterAuth from '../components/TwitterAuth';

function Account() {
  const { account, isLoading, error: web3Error, connectWallet } = useWeb3();
  const { depositToTreasury, withdrawFromTreasury, getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  const { loading: authLoading } = useFirebaseAuth();
  
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.01');
  const [transactionError, setTransactionError] = useState(null);
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [currentBalance, setCurrentBalance] = useState('0');
  
  // New state for profile
  const [displayName, setDisplayName] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (account) {
        const docRef = doc(db, 'userProfiles', account.toLowerCase());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(data);
          setDisplayName(data.displayName || '');
          setTwitterHandle(data.twitterHandle || '');
        }
      }
    };
    fetchProfile();
  }, [account]);

  const refreshAuthState = async () => {
    try {
      if (!auth.currentUser) {
        console.log('No current user, signing in anonymously...');
        const result = await signInAnonymously(auth);
        console.log('Anonymous sign in successful:', result.user.uid);
      } else {
        console.log('Current user exists:', auth.currentUser.uid);
        await auth.currentUser.getIdToken(true);
      }
      return auth.currentUser;
    } catch (error) {
      console.error('Error refreshing auth state:', error);
      throw new Error('Failed to refresh authentication');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      if (!account) {
        toast.error('No wallet connected');
        return;
      }

      // Ensure user is authenticated and log the state
      const user = await refreshAuthState();
      console.log('Current auth state:', {
        isAuthenticated: !!user,
        userId: user?.uid,
        account: account.toLowerCase()
      });

      const profileData = {
        address: account.toLowerCase(),
        displayName,
        updatedAt: new Date().toISOString()
      };

      // If this is a new profile, add createdAt
      const userProfileRef = doc(db, 'userProfiles', account.toLowerCase());
      const docSnap = await getDoc(userProfileRef);
      
      if (!docSnap.exists()) {
        profileData.createdAt = profileData.updatedAt;
      }

      // Use setDoc with merge option
      await setDoc(userProfileRef, profileData, { merge: true });

      setIsEditingProfile(false);
      setProfileData(prev => ({
        ...prev,
        displayName
      }));
      toast.success('Profile updated successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      // Log more details about the error
      console.log('Error details:', {
        code: error.code,
        message: error.message,
        auth: !!auth.currentUser,
        authId: auth.currentUser?.uid
      });
      toast.error('Failed to update profile: ' + error.message);
    }
  };

  // Add effect to check account status on load
  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        const isActive = await checkTreasuryAccount();
        setHasActiveAccount(isActive);
      }
    };
    checkAccount();
  }, [account, checkTreasuryAccount]);

  // Add effect to fetch and update balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (account && hasActiveAccount) {
        try {
          const balance = await getAccountBalance();
          setCurrentBalance(balance);
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      }
    };
    fetchBalance();
  }, [account, hasActiveAccount, getAccountBalance, transactionError]);

  const handleDeposit = async () => {
    try {
      setTransactionError(null);
      await depositToTreasury(depositAmount);
      setHasActiveAccount(true);
      // Update balance immediately after deposit
      const newBalance = await getAccountBalance();
      setCurrentBalance(newBalance);
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: newBalance }));
    } catch (err) {
      console.error('Error depositing:', err);
      setTransactionError(err.message);
    }
  };

  const handleWithdraw = async () => {
    try {
      setTransactionError(null);
      await withdrawFromTreasury(withdrawAmount);
      // Update balance immediately after withdrawal
      const newBalance = await getAccountBalance();
      setCurrentBalance(newBalance);
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: newBalance }));
    } catch (err) {
      console.error('Error withdrawing:', err);
      setTransactionError(err.message);
    }
  };

  const handleCloseAccount = async () => {
    try {
      setTransactionError(null);
      await withdrawFromTreasury(currentBalance);
      setHasActiveAccount(false);
      setCurrentBalance('0');
      // Force a balance update in the navbar
      window.dispatchEvent(new CustomEvent('balanceUpdate', { detail: '0' }));
    } catch (err) {
      console.error('Error closing account:', err);
      setTransactionError(err.message);
    }
  };

  // Add polling to update balance periodically
  useEffect(() => {
    let intervalId;
    
    if (account && hasActiveAccount) {
      intervalId = setInterval(async () => {
        try {
          const balance = await getAccountBalance();
          setCurrentBalance(balance);
        } catch (err) {
          console.error('Error updating balance:', err);
        }
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [account, hasActiveAccount, getAccountBalance]);

  // Add handler for Twitter link
  const handleTwitterLink = (twitterHandle) => {
    setTwitterHandle(twitterHandle);
    setProfileData(prev => ({
      ...prev,
      twitterHandle,
      twitterVerified: true
    }));
  };

  if (isLoading || authLoading) return <div>Loading...</div>;
  if (web3Error) return (
    <div>
      <div>Error: {web3Error}</div>
      <button onClick={connectWallet}>Retry Connection</button>
    </div>
  );

  return (
    <div className="account-container">
      <h1>My Account</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasActiveAccount ? (
        <div className="open-account">
          <p>Open a Casino Account</p>
          <div className="deposit-controls">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Initial deposit amount"
            />
            <button onClick={handleDeposit}>
              Open Account
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="profile-section">
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="profile-form">
                <h2>Edit Profile</h2>
                <div className="form-group">
                  <label>Display Name:</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={50}
                  />
                </div>
                <div className="form-group">
                  <label>Twitter Account:</label>
                  {profileData?.twitterVerified ? (
                    <div className="twitter-verified">
                      <span>@{profileData.twitterHandle}</span>
                      <span className="verified-badge">✓ Verified</span>
                    </div>
                  ) : (
                    <TwitterAuth 
                      account={account} 
                      onTwitterLink={handleTwitterLink}
                    />
                  )}
                </div>
                <div className="profile-actions">
                  <button type="submit">Save Profile</button>
                  <button type="button" onClick={() => setIsEditingProfile(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="profile-display">
                <h2>Profile</h2>
                <div className="profile-info">
                  <p><strong>Display Name:</strong> {profileData?.displayName || 'Not set'}</p>
                  <p><strong>Twitter:</strong> {profileData?.twitterHandle ? `@${profileData.twitterHandle}` : 'Not connected'}</p>
                </div>
                <button onClick={() => setIsEditingProfile(true)}>Edit Profile</button>
              </div>
            )}
          </div>

          <div className="account-controls">
            <div className="balance-display">
              <h2>Current Balance</h2>
              <p>{currentBalance} ETH</p>
            </div>

            <div className="transaction-section">
              <div className="transaction-row">
                <h2>Deposit to Account</h2>
                <div className="transaction-controls">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Deposit amount"
                  />
                  <button onClick={handleDeposit}>
                    Deposit
                  </button>
                </div>
              </div>

              <div className="transaction-row">
                <h2>Withdraw from Account</h2>
                <div className="transaction-controls">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Withdraw amount"
                  />
                  <button onClick={handleWithdraw}>
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            <div className="close-account-section">
              <button onClick={handleCloseAccount} className="close-account-button">
                Withdraw and Close Account
              </button>
            </div>
          </div>
        </>
      )}

      {transactionError && (
        <div className="error-message">
          Error: {transactionError}
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default Account; 