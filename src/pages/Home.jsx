import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import '../styles/Home.css';

function Home() {
  const { account, treasuryContract } = useWeb3();
  const { checkTreasuryAccount } = useContractInteraction();
  const [houseFunds, setHouseFunds] = useState('0');
  const [hasAccount, setHasAccount] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (treasuryContract) {
        try {
          const funds = await treasuryContract.getHouseFunds();
          setHouseFunds(ethers.formatEther(funds));
        } catch (err) {
          console.error('Error fetching house funds:', err);
        }
      }
    };

    init();
    const interval = setInterval(init, 5000);
    return () => clearInterval(interval);
  }, [treasuryContract]);

  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        const hasActiveAccount = await checkTreasuryAccount();
        setHasAccount(hasActiveAccount);
      }
    };
    checkAccount();
  }, [account, checkTreasuryAccount]);

  return (
    <div className="home-container">
      <h1>Welcome to the Casino</h1>
      
      <div className="house-info">
        <h2>House Treasury</h2>
        <div className="treasury-amount">{houseFunds} ETH</div>
      </div>

      {account && !hasAccount ? (
        <div className="account-prompt">
          <h2>Get Started</h2>
          <p>Open a casino account to start playing!</p>
          <Link to="/account" className="cta-button">
            Open Account
          </Link>
        </div>
      ) : account && hasAccount ? (
        <div className="game-selection">
          <h2>Choose Your Game</h2>
          <Link to="/blackjack" className="game-button">
            Play Blackjack
          </Link>
          <Link to="/roulette" className="game-button">
            Play Roulette
          </Link>
        </div>
      ) : (
        <div className="connect-prompt">
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to start playing!</p>
        </div>
      )}
    </div>
  );
}

export default Home; 