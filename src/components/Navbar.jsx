import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { useEffect, useState } from 'react';
import '../styles/Navbar.css';

function Navbar() {
  const { account, connectWallet } = useWeb3();
  const { getAccountBalance } = useContractInteraction();
  const [balance, setBalance] = useState('0');

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
          <Link to="/account" className="nav-link">
            My Account
          </Link>
        </div>
      </div>
      <div className="navbar-right">
        {account && <div className="navbar-balance">Balance: {balance} ETH</div>}
        {!account ? (
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <div className="wallet-address">{formatAddress(account)}</div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;