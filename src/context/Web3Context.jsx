import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackJSON from '../contracts/Blackjack.json';
import TreasuryJSON from '../contracts/HouseTreasury.json';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
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

        // Contract addresses - make sure these match your deployment
        const blackjackAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
        const treasuryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

        console.log('Creating contract instances with addresses:', {
          blackjackAddress,
          treasuryAddress,
          signer: await signer.getAddress()
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

        // Verify contracts are deployed and accessible
        try {
          const blackjackOwner = await blackjack.owner();
          const treasuryOwner = await treasury.owner();
          
          console.log('Contract owners:', {
            blackjackOwner,
            treasuryOwner,
            currentSigner: await signer.getAddress()
          });

          // Check if contracts can interact
          const isAuthorized = await treasury.authorizedGames(blackjackAddress);
          console.log('Authorization status:', {
            blackjackAddress,
            isAuthorized
          });

          if (!isAuthorized) {
            console.warn('Blackjack contract is not authorized in Treasury');
          }

        } catch (verifyError) {
          console.error('Contract verification failed:', verifyError);
          throw new Error('Failed to verify contracts. Please check deployment and network.');
        }

        setProvider(provider);
        setSigner(signer);
        setBlackjackContract(blackjack);
        setTreasuryContract(treasury);
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
    account,
    error,
    isLoading,
    connectWallet // Expose the connect function
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