import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';
import RouletteJSON from '../contracts/Roulette.json';
import { FUJI_CONFIG } from '../config/networks';
import getEnvironmentConfig from '../config/environment';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
  const [rouletteContract, setRouletteContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameResult, setGameResult] = useState(null);
  const [transactionError, setTransactionError] = useState(null);
  const [networkStatus, setNetworkStatus] = useState('disconnected');

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

      const config = getEnvironmentConfig();
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Get contract addresses from environment config
      const treasuryAddress = config.contracts.treasury;
      const blackjackAddress = config.contracts.blackjack;
      const rouletteAddress = config.contracts.roulette;

      console.log('Contract addresses:', {
        blackjack: blackjackAddress,
        treasury: treasuryAddress,
        roulette: rouletteAddress,
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
        ) : null
      };

      setProvider(provider);
      setSigner(signer);
      setBlackjackContract(contracts.blackjack);
      setTreasuryContract(contracts.treasury);
      setRouletteContract(contracts.roulette);
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
    setError(null);
  };

  const switchToFuji = async () => {
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('Current Chain ID:', currentChainId);
      
      if (currentChainId === FUJI_CONFIG.chainId) {
        console.log('Already on Fuji network');
        return;
      }

      console.log('Attempting to add Fuji network...');
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [FUJI_CONFIG],
      });
      
      console.log('Attempting to switch to Fuji network...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FUJI_CONFIG.chainId }],
      });

    } catch (error) {
      console.error('Detailed switch error:', {
        message: error.message,
        code: error.code,
        data: error.data
      });
      throw new Error('Failed to switch to Fuji network. Please add Fuji network to MetaMask manually.');
    }
  };

  const handleSpinWheel = async () => {
    try {
      setTransactionError(null);
      
      if (!rouletteContract) {
        throw new Error('Failed to initialize contract');
      }

      console.log('Spinning wheel...');
      const tx = await rouletteContract.spinWheel({
        gasLimit: 500000
      });
      console.log('Spin transaction hash:', tx.hash);
      
      const receipt = await tx.wait();
      
      // Parse events from receipt
      for (const log of receipt.logs) {
        try {
          const parsedLog = rouletteContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === 'GameResult') {
            setGameResult({
              number: parsedLog.args.result,
              won: parsedLog.args.won,
              payout: ethers.formatEther(parsedLog.args.payout)
            });
          }
        } catch (e) {
          console.log('Could not parse log:', log);
        }
      }

    } catch (error) {
      console.error('Error spinning wheel:', error);
      setTransactionError(error.message);
    }
  };

  const getRouletteContract = () => {
    if (!provider) return null;
    return new ethers.Contract(
      process.env.REACT_APP_ROULETTE_ADDRESS,
      RouletteJSON.abi,
      provider.getSigner()
    );
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
    account,
    error,
    isLoading,
    connectWallet,
    disconnectWallet,
    switchToFuji,
    gameResult,
    transactionError,
    handleSpinWheel,
    networkStatus
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
