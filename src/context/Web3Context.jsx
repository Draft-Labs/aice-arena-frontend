import { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [lastReceivedResult, setLastReceivedResult] = useState(null);
  
  const processedTransactions = useRef(new Set());
  
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask!");
      }

      setIsLoading(true);
      const config = getEnvironmentConfig();

      // Switch to appropriate network
      if (config.network === 'fuji') {
        await switchToFuji();
      } else {
        await switchToLocal();
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

      // Verify we're on the correct network
      const network = await provider.getNetwork();
      const expectedChainId = config.network === 'fuji' ? 43113 : 31337;
      
      // Convert both chain IDs to numbers for comparison
      const currentChainId = Number(network.chainId);
      
      if (currentChainId !== expectedChainId) {
        throw new Error(`Wrong network. Expected chainId: ${expectedChainId}, got: ${currentChainId}`);
      }

      // Get contract addresses from environment config
      const treasuryAddress = config.contracts.treasury;
      const blackjackAddress = config.contracts.blackjack;
      const rouletteAddress = config.contracts.roulette;

      console.log('Contract addresses:', {
        blackjack: blackjackAddress,
        treasury: treasuryAddress,
        roulette: rouletteAddress,
      });

      // After line 67, add these debug logs
      console.log('Environment config:', config);
      console.log('Contract addresses from config:', {
        treasury: treasuryAddress,
        blackjack: blackjackAddress,
        roulette: rouletteAddress
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

  const switchToLocal = async () => {
    try {
      const localConfig = {
        chainId: '0x7A69', // 31337 in hex
        chainName: 'Hardhat Local',
        nativeCurrency: {
          name: 'ETH',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['http://127.0.0.1:8545']
      };

      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (currentChainId === localConfig.chainId) {
        console.log('Already on local network');
        return;
      }

      console.log('Attempting to switch to local network...');
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: localConfig.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [localConfig],
          });
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Detailed switch error:', error);
      throw new Error('Failed to switch to local network');
    }
  };

  const handleSpinWheel = async () => {
    try {
      setTransactionError(null);
      
      if (!rouletteContract) {
        throw new Error('Failed to initialize contract');
      }

      // This function can't directly call spin because it requires owner permissions
      // It should be triggered through the backend API which uses the house wallet
      throw new Error("Spin function can only be called by the contract owner (house). Use the backend API to trigger spins.");

    } catch (error) {
      console.error('Error spinning wheel:', error);
      setTransactionError(error.message);
      return false;
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

  // Function to reset bet state when placing a new bet
  const resetBetState = () => {
    setGameResult(null);
    console.log('Bet state reset - ready for new bet');
  };

  // Add this new function after resetBetState
  const checkTransactionReceipt = async (txHash) => {
    try {
      console.log(`Checking receipt for transaction: ${txHash}`);
      if (!provider) {
        console.error('Provider not available to check transaction');
        return;
      }

      // Wait for the transaction receipt
      const receipt = await provider.getTransactionReceipt(txHash);
      if (!receipt) {
        console.log('Transaction not yet mined, will retry...');
        // Schedule another check in 2 seconds
        setTimeout(() => checkTransactionReceipt(txHash), 2000);
        return;
      }

      console.log('Transaction receipt:', receipt);
      
      // Check if this transaction was already processed
      if (processedTransactions.current.has(txHash)) {
        console.log('Already processed this transaction');
        return;
      }
      
      // Mark as processed
      processedTransactions.current.add(txHash);

      // Check logs for SpinResult events
      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`Found ${receipt.logs.length} logs in the transaction`);
        
        try {
          if (rouletteContract) {
            const contractInterface = rouletteContract.interface;
            
            for (const log of receipt.logs) {
              try {
                // Check if the log is from our contract
                if (log.address.toLowerCase() === rouletteContract.target.toLowerCase()) {
                  console.log('Log from our contract:', log);
                  
                  try {
                    // Attempt to parse the log
                    const parsedLog = contractInterface.parseLog(log);
                    console.log('Parsed log:', parsedLog);
                    
                    // Check if this is a SpinResult event
                    if (parsedLog && parsedLog.name === 'SpinResult') {
                      const resultNum = Number(parsedLog.args[0]);
                      
                      console.log('Found SpinResult event:', {
                        result: resultNum
                      });
                      
                      // Update the game result
                      setGameResult({
                        number: resultNum,
                        // We don't have win/loss status or payout in this event
                        won: false,
                        payout: "0.0"
                      });
                      
                      return;
                    }
                  } catch (logParseError) {
                    console.error('Error parsing log:', logParseError);
                  }
                }
              } catch (logError) {
                console.error('Error processing log:', logError);
              }
            }
          }
        } catch (parsingError) {
          console.error('Error parsing logs:', parsingError);
        }
      }
    } catch (error) {
      console.error('Error checking transaction receipt:', error);
    }
  };

  // Add a manual transaction checker function to the context
  const checkGameResultForTransaction = (txHash) => {
    if (txHash) {
      console.log(`Manual check requested for transaction: ${txHash}`);
      checkTransactionReceipt(txHash);
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

  // Update the useEffect to listen for SpinResult instead of GameResult
  useEffect(() => {
    if (rouletteContract) {
      console.log('Setting up event listeners in Web3Context');

      // Listen for both SpinResult and GameResult events
      try {
        // Setting up SpinResult listener
        rouletteContract.on('SpinResult', (result, event) => {
          console.log('SpinResult event detected:', { result, event });
          
          // Get transaction hash to track unique events
          const txHash = event.log.transactionHash;
          
          // Skip if we've already processed this transaction
          if (processedTransactions.current.has(txHash)) {
            console.log('Skipping duplicate SpinResult event from tx:', txHash);
            return;
          }
          
          // Record this transaction as processed
          processedTransactions.current.add(txHash);
          
          // Convert result to a number
          const resultNum = Number(result);
          
          // Set initial game result with just the number
          setGameResult({
            number: resultNum,
            won: false,
            payout: "0.0"
          });
        });
        
        // Setting up GameResult listener to get win/loss info
        rouletteContract.on('GameResult', (result, payout, won, event) => {
          console.log('GameResult event detected:', { result, payout, won, event });
          
          // Only update if this is for the current user
          // Note: This event doesn't have the player address indexed, so we need to check
          //       if this transaction has already been processed with a SpinResult
          const txHash = event.log.transactionHash;
          if (processedTransactions.current.has(txHash)) {
            // This is from the same transaction, so update the result with won/payout info
            if (won) {
              setGameResult(prev => ({
                ...prev,
                won: true,
                payout: ethers.formatEther(payout)
              }));
            }
          }
        });
        
        console.log('Event listeners set up successfully');
      } catch (err) {
        console.error('Error setting up event listeners:', err);
      }

      // Cleanup function 
      return () => {
        console.log('Removing event listeners');
        if (rouletteContract) {
          rouletteContract.removeAllListeners();
        }
        processedTransactions.current.clear();
      };
    }
  }, [rouletteContract]);

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
    switchToLocal,
    gameResult,
    setGameResult: (newResult) => {
      // Custom setter for gameResult
      setGameResult(newResult);
    },
    transactionError,
    handleSpinWheel,
    networkStatus,
    resetBetState,
    checkGameResultForTransaction
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
