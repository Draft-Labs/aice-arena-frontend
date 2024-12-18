import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import PokerJSON from '../contracts/Poker.json';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
  const [rouletteContract, setRouletteContract] = useState(null);
  const [pokerContract, setPokerContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      setIsLoading(true);

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found');
        }

        const account = accounts[0];
        setAccount(account);

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Get network to ensure we're on the correct chain
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);

        // Contract addresses
        const blackjackAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        const treasuryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
        const rouletteAddress = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
        const pokerAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

        // Create contract instances
        const blackjack = new ethers.Contract(
          blackjackAddress,
          BlackjackJSON.abi,
          signer
        );

        const treasury = new ethers.Contract(
          treasuryAddress,
          TreasuryJSON.abi,
          signer
        );

        const roulette = new ethers.Contract(
          rouletteAddress,
          RouletteJSON.abi,
          signer
        );

        const poker = new ethers.Contract(
          pokerAddress,
          PokerJSON.abi,
          signer
        );

        setProvider(provider);
        setSigner(signer);
        setBlackjackContract(blackjack);
        setTreasuryContract(treasury);
        setRouletteContract(roulette);
        setPokerContract(poker);
        setError(null);

      } catch (requestError) {
        if (requestError.code === -32002) {
          setError('Please open MetaMask and accept the connection request');
          return;
        }
        throw requestError;
      }
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setBlackjackContract(null);
    setTreasuryContract(null);
    setRouletteContract(null);
    setPokerContract(null);
    setError(null);
  };

  useEffect(() => {
    // Initial connection attempt
    connectWallet();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet(); // Reconnect with new account
        } else {
          setAccount(null);
          setBlackjackContract(null);
          setTreasuryContract(null);
          setRouletteContract(null);
          setPokerContract(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners();
      }
    };
  }, []);

  const value = {
    provider,
    signer,
    blackjackContract,
    treasuryContract,
    rouletteContract,
    pokerContract,
    account,
    error,
    isLoading,
    connectWallet,
    disconnectWallet
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
