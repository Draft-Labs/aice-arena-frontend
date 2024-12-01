import React, { createContext, useState, useContext, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackABI from '../contracts/Blackjack.json';
import TreasuryABI from '../contracts/HouseTreasury.json';

const Web3Context = createContext();

export function useWeb3() {
  return useContext(Web3Context);
}

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [ownerAccount, setOwnerAccount] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setAccount(await signer.getAddress());

      // Initialize contracts
      await initializeContracts(provider);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    }
  };

  const initializeContracts = async (provider) => {
    try {
      const signer = await provider.getSigner();
      
      // Get the owner account (first account in hardhat)
      const accounts = await provider.listAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const ownerAddress = accounts[0].address; // Get the address property
      console.log('Owner address:', ownerAddress);
      
      const ownerSigner = await provider.getSigner(ownerAddress);
      setOwnerAccount(ownerSigner);

      // Contract addresses
      const blackjackAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const treasuryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

      // Initialize contracts
      const blackjack = new ethers.Contract(
        blackjackAddress,
        BlackjackABI.abi,
        signer
      );

      const blackjackOwner = blackjack.connect(ownerSigner);
      
      const treasury = new ethers.Contract(
        treasuryAddress,
        TreasuryABI.abi,
        signer
      );

      setBlackjackContract(blackjackOwner); // Use the owner-connected contract
      setTreasuryContract(treasury);
      setIsLoading(false);
    } catch (err) {
      console.error("Error initializing contracts:", err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Handle account changes
        window.ethereum.on('accountsChanged', async (accounts) => {
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setAccount(await signer.getAddress());
            await initializeContracts(provider);
          } else {
            setAccount(null);
          }
        });

        // Initial setup
        try {
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setAccount(await signer.getAddress());
            await initializeContracts(provider);
          }
        } catch (err) {
          console.error("Error in initial setup:", err);
          setIsLoading(false);
        }
      } else {
        setError("Please install MetaMask");
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, []);

  const value = {
    account,
    ownerAccount,
    blackjackContract,
    treasuryContract,
    isLoading,
    error,
    connectWallet
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}; 