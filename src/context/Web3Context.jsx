import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import PokerJSON from '../contracts/Poker.json';

const Web3Context = createContext();

const AVALANCHE_FUJI_CONFIG = {
  chainId: '0xA869', // 43113 in hex
  chainName: 'Avalanche Fuji Testnet',
  nativeCurrency: {
    name: 'AVAX',
    symbol: 'AVAX',
    decimals: 18
  },
  rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
  blockExplorerUrls: ['https://testnet.snowtrace.io/']
};

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

      // Check if we're on the right network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // If not on Fuji, prompt to switch
      if (currentChainId !== AVALANCHE_FUJI_CONFIG.chainId) {
        try {
          // Try to switch to Fuji
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: AVALANCHE_FUJI_CONFIG.chainId }],
          });
        } catch (switchError) {
          // If the network doesn't exist in MetaMask, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [AVALANCHE_FUJI_CONFIG],
              });
            } catch (addError) {
              throw new Error('Failed to add Avalanche network to MetaMask');
            }
          } else {
            throw new Error('Failed to switch to Avalanche network');
          }
        }
      }

      // Request account access
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

      // Verify we're on Fuji
      const network = await provider.getNetwork();
      if (network.chainId !== 43113) { // Fuji chainId
        throw new Error('Please connect to Avalanche Fuji Testnet');
      }

      // Use your deployed contract addresses
      const blackjackAddress = process.env.REACT_APP_BLACKJACK_ADDRESS;
      const treasuryAddress = process.env.REACT_APP_TREASURY_ADDRESS;
      const rouletteAddress = process.env.REACT_APP_ROULETTE_ADDRESS;
      const pokerAddress = process.env.REACT_APP_POKER_ADDRESS;

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
