import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { useEffect, useState, useRef } from 'react';
import '../styles/Navbar.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ethers } from 'ethers';

function Navbar() {
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const { getPlayerBalance, checkTreasuryAccount } = useContractInteraction();
  const [balance, setBalance] = useState('0');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [profileImage, setProfileImage] = useState(null);
  const [hasAccount, setHasAccount] = useState(false);

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
    try {
      // First check if the account exists
      const accountExists = await checkTreasuryAccount();
      setHasAccount(accountExists);

      if (accountExists && account) {
        const balance = await getPlayerBalance(account);
        setBalance(ethers.formatEther(balance));
      } else {
        setBalance('0');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
    }
  };

  useEffect(() => {
    if (account) {
      fetchBalance();
    } else {
      setBalance('0');
      setHasAccount(false);
    }
  }, [account]);

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

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo">
            Casino
          </Link>
        </div>
        <div className="navbar-links">
          <Link to="/blackjack" className="nav-link">
            Blackjack
          </Link>
          <Link to="/roulette" className="nav-link">
            Roulette
          </Link>
          <Link to="/poker" className="nav-link">
            Poker
          </Link>
          <Link to="/leaderboard" className="nav-link">
            Leaderboard
          </Link>
          <Link to="/account" className="nav-link">
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
            <div className="navbar-balance">Account Balance: {balance} ETH</div>
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
      </div>
    </nav>
  );
}

export default Navbar;