import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import PokerJSON from '../contracts/Poker.json';
import BalatroJSON from '../contracts/Balatro.json';
import { FUJI_CONFIG } from '../config/networks';

const Web3Context = createContext();

const HARDHAT_CONFIG = {
  chainId: '0x7A69', // 31337 in hex
  chainName: 'Hardhat Network',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['http://127.0.0.1:8545'],
};

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
  const [rouletteContract, setRouletteContract] = useState(null);
  const [pokerContract, setPokerContract] = useState(null);
  const [balatroContract, setBalatroContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      setIsLoading(true);

      // Switch to Fuji network
      await switchToFuji();

      // Add delay to handle pending requests
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const account = accounts[0];
      setAccount(account);

      // Add delay before creating provider
      await new Promise(resolve => setTimeout(resolve, 1000));

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get contract addresses
      const blackjackAddress = process.env.REACT_APP_FUJI_BLACKJACK_ADDRESS;
      const treasuryAddress = process.env.REACT_APP_FUJI_TREASURY_ADDRESS;
      const rouletteAddress = process.env.REACT_APP_FUJI_ROULETTE_ADDRESS;
      const pokerAddress = process.env.REACT_APP_FUJI_POKER_ADDRESS;
      const balatroAddress = process.env.REACT_APP_FUJI_BALATRO_ADDRESS;

      console.log('Contract addresses:', {
        blackjack: process.env.REACT_APP_FUJI_BLACKJACK_ADDRESS,
        treasury: process.env.REACT_APP_FUJI_TREASURY_ADDRESS,
        roulette: process.env.REACT_APP_FUJI_ROULETTE_ADDRESS,
        poker: process.env.REACT_APP_FUJI_POKER_ADDRESS,
        balatro: process.env.REACT_APP_FUJI_BALATRO_ADDRESS
      });

      // Create contract instances
      const contracts = {
        blackjack: blackjackAddress ? new ethers.Contract(
          blackjackAddress,
          BlackjackJSON.abi,
          signer
        ) : null,
        treasury: treasuryAddress ? new ethers.Contract(
          treasuryAddress,
          TreasuryJSON.abi,
          signer
        ) : null,
        roulette: rouletteAddress ? new ethers.Contract(
          rouletteAddress,
          RouletteJSON.abi,
          signer
        ) : null,
        poker: pokerAddress ? new ethers.Contract(
          pokerAddress,
          PokerJSON.abi,
          signer
        ) : null,
        balatro: balatroAddress ? new ethers.Contract(
          balatroAddress,
          BalatroJSON.abi,
          signer
        ) : null
      };

      setProvider(provider);
      setSigner(signer);
      setBlackjackContract(contracts.blackjack);
      setTreasuryContract(contracts.treasury);
      setRouletteContract(contracts.roulette);
      setPokerContract(contracts.poker);
      setBalatroContract(contracts.balatro);
      setError(null);

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
    setBalatroContract(null);
    setError(null);
  };

  const switchToFuji = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [FUJI_CONFIG],
      });
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_CONFIG.chainId }],
      });

    } catch (error) {
      console.error('Error switching to Fuji:', error);
      throw new Error('Failed to switch to Fuji network. Please add Fuji network to MetaMask manually.');
    }
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
          setBalatroContract(null);
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
    balatroContract,
    account,
    error,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchToFuji
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
