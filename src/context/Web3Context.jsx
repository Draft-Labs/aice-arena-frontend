import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import PokerJSON from '../contracts/Poker.json';
import BalatroJSON from '../contracts/Balatro.json';

const Web3Context = createContext();

const AVALANCHE_FUJI_CONFIG = {
  chainId: '0xa869', // 43113 in hex
  chainName: 'Avalanche Testnet C-Chain',
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

      // Add delay to handle pending requests
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
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
            
            // Add delay after network switch
            await new Promise(resolve => setTimeout(resolve, 1500));
            
          } catch (switchError) {
            // Update error handling for Avalanche
            if (switchError.code === 4902 || switchError.code === -32603 || switchError.code === -32000) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [AVALANCHE_FUJI_CONFIG],
                });
              } catch (addError) {
                console.error('Add network error:', addError);
                throw new Error('Failed to add Avalanche network. Please add it manually to your wallet.');
              }
            } else {
              console.error('Switch network error:', switchError);
              throw new Error('Failed to switch to Avalanche network. Please switch manually in your wallet.');
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

        // Add delay before creating provider
        await new Promise(resolve => setTimeout(resolve, 1000));

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Verify we're on Fuji
        const network = await provider.getNetwork();
        console.log('Current network:', {
          chainId: network.chainId,
          name: network.name
        });

        // Use your deployed contract addresses
        const blackjackAddress = process.env.REACT_APP_BLACKJACK_ADDRESS;
        const treasuryAddress = process.env.REACT_APP_TREASURY_ADDRESS;
        const rouletteAddress = process.env.REACT_APP_ROULETTE_ADDRESS;
        const pokerAddress = process.env.REACT_APP_POKER_ADDRESS;

        // Log contract addresses for debugging
        console.log('Contract addresses:', {
          blackjack: blackjackAddress,
          treasury: treasuryAddress,
          roulette: rouletteAddress,
          poker: pokerAddress
        });

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

        const balatro = new ethers.Contract(
          balatroAddress,
          BalatroJSON.abi,
          signer
        );

        setProvider(provider);
        setSigner(signer);
        setBlackjackContract(blackjack);
        setTreasuryContract(treasury);
        setRouletteContract(roulette);
        setPokerContract(poker);
        setBalatroContract(balatro);
        setError(null);

      } catch (requestError) {
        console.error('Request error:', requestError);
        if (requestError.code === -32002) {
          setError('Please open your wallet and accept the connection request');
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
    setBalatroContract(null);
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
