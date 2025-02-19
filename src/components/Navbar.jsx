import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { useEffect, useState, useRef } from 'react';
import '../styles/Navbar.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

function Navbar() {
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const { getAccountBalance } = useContractInteraction();
  const [balance, setBalance] = useState('0');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const location = useLocation();
  const [networkStatus, setNetworkStatus] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchBalance = async () => {
    if (account) {
      try {
        const balance = await getAccountBalance();
        setBalance(balance);
      } catch (err) {
        console.error('Error fetching balance:', err);
        setBalance('0');
      }
    } else {
      setBalance('0');
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);

    // Listen for balance updates
    const handleBalanceUpdate = (event) => {
      setBalance(event.detail || '0');
    };
    window.addEventListener('balanceUpdate', handleBalanceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('balanceUpdate', handleBalanceUpdate);
    };
  }, [account, getAccountBalance]);

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowDropdown(false);
  };

  // Add effect to fetch profile image
  useEffect(() => {
    const fetchProfileData = async () => {
      if (account) {
        try {
          const docRef = doc(db, 'userProfiles', account.toLowerCase());
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().profileImage) {
            setProfileImage(docSnap.data().profileImage);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      }
    };
    fetchProfileData();
  }, [account]);

  useEffect(() => {
    const checkNetwork = async () => {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setNetworkStatus(chainId === '0xa869' ? 'connected' : 'wrong-network');
      } else {
        setNetworkStatus('no-wallet');
      }
    };
    
    checkNetwork();
    window.ethereum?.on('chainChanged', checkNetwork);
    
    return () => {
      window.ethereum?.removeListener('chainChanged', checkNetwork);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            Aice Arena
          </Link>
        </div>
        <div className="navbar-links">
          <Link 
            to="/blackjack" 
            className={`nav-link ${location.pathname === '/blackjack' ? 'active' : ''}`}
          >
            Blackjack
          </Link>
          <Link 
            to="/balatro" 
            className={`nav-link ${location.pathname === '/balatro' ? 'active' : ''}`}
          >
            Balatro
          </Link>
          <Link 
            to="/roulette" 
            className={`nav-link ${location.pathname === '/roulette' ? 'active' : ''}`}

          >
            Roulette
          </Link>
          <Link 
            to="/poker" 
            className={`nav-link ${location.pathname === '/poker' ? 'active' : ''}`}
          >
            Poker
          </Link>
          <Link 
            to="/leaderboard" 
            className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
          >
            Leaderboard
          </Link>
          <Link 
            to="/account" 
            className={`nav-link ${location.pathname === '/account' ? 'active' : ''}`}
          >
            My Account
          </Link>
        </div>
      </div>
      <div className="navbar-right">
        {account && (
          <>
            {profileImage && (
              <img 
                src={profileImage} 
                alt="Profile" 
                className="navbar-profile-image"
              />
            )}
            <div className="navbar-balance">Account Balance: {balance} AVAX</div>
          </>
        )}
        {!account ? (
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-menu" ref={dropdownRef}>
            <div className="wallet-address" onClick={toggleDropdown}>
              {formatAddress(account)}
              <span className={`dropdown-arrow ${showDropdown ? 'up' : 'down'}`}>▼</span>
            </div>
            <div className={`dropdown-menu ${showDropdown ? 'show' : ''}`}>
              <button onClick={handleDisconnect}>Disconnect</button>
            </div>
          </div>
        )}
        {networkStatus === 'wrong-network' && (
          <div className="network-warning">
            Please connect to Avalanche Fuji Testnet
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;