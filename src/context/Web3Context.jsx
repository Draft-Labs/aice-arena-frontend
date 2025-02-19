import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import PokerJSON from '../contracts/Poker.json';
import BalatroJSON from '../contracts/Balatro.json';

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

      // Add delay to handle pending requests
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Check if we're on the right network
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // If not on Hardhat, prompt to switch
        if (currentChainId !== HARDHAT_CONFIG.chainId) {
          try {
            // Try to switch to Hardhat
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: HARDHAT_CONFIG.chainId }],
            });
            
            // Add delay after network switch
            await new Promise(resolve => setTimeout(resolve, 1500));
            
          } catch (switchError) {
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [HARDHAT_CONFIG],
                });
              } catch (addError) {
                console.error('Add network error:', addError);
                throw new Error('Failed to add Hardhat network. Please add it manually to your wallet.');
              }
            } else {
              console.error('Switch network error:', switchError);
              throw new Error('Failed to switch to Hardhat network. Please switch manually in your wallet.');
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

        // Verify we're on Hardhat
        const network = await provider.getNetwork();
        console.log('Current network:', {
          chainId: network.chainId,
          name: network.name
        });

        // Get contract addresses
        const blackjackAddress = process.env.REACT_APP_BLACKJACK_ADDRESS;
        const treasuryAddress = process.env.REACT_APP_TREASURY_ADDRESS;
        const rouletteAddress = process.env.REACT_APP_ROULETTE_ADDRESS;
        const pokerAddress = process.env.REACT_APP_POKER_ADDRESS;
        const balatroAddress = process.env.REACT_APP_BALATRO_ADDRESS;

        // Log contract addresses for debugging
        console.log('Contract addresses:', {
          blackjack: blackjackAddress,
          treasury: treasuryAddress,
          roulette: rouletteAddress,
          poker: pokerAddress,
          balatro: balatroAddress
        });

        // Only create contract instances if addresses are available
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
