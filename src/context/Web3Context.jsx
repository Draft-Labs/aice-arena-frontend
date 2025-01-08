import { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import BlackjackABI from '../contracts/Blackjack.json';
import RouletteABI from '../contracts/Roulette.json';
import TreasuryABI from '../contracts/HouseTreasury.json';
import PokerTableABI from '../contracts/PokerTable.json';
import PokerBettingABI from '../contracts/PokerBetting.json';
import PokerPlayerManagerABI from '../contracts/PokerPlayerManager.json';
import PokerGameStateABI from '../contracts/PokerGameState.json';
import PokerTreasuryABI from '../contracts/PokerTreasury.json';

const Web3Context = createContext();

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [blackjackContract, setBlackjackContract] = useState(null);
  const [rouletteContract, setRouletteContract] = useState(null);
  const [treasuryContract, setTreasuryContract] = useState(null);
  const [pokerTableContract, setPokerTableContract] = useState(null);
  const [pokerBettingContract, setPokerBettingContract] = useState(null);
  const [pokerPlayerManagerContract, setPokerPlayerManagerContract] = useState(null);
  const [pokerGameStateContract, setPokerGameStateContract] = useState(null);
  const [pokerTreasuryContract, setPokerTreasuryContract] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('Initializing Web3...');
        if (typeof window.ethereum === 'undefined') {
          throw new Error('Please install MetaMask');
        }
        console.log('MetaMask detected');

        const provider = new ethers.BrowserProvider(window.ethereum);
        console.log('Provider initialized');
        
        const accounts = await provider.listAccounts();
        console.log('Found accounts:', accounts);
        
        if (accounts.length === 0) {
          throw new Error('Please connect your wallet');
        }

        const signer = await provider.getSigner();
        const account = await signer.getAddress();

        // Initialize contracts
        const blackjackContract = new ethers.Contract(
          process.env.REACT_APP_BLACKJACK_ADDRESS,
          BlackjackABI.abi,
          signer
        );

        const rouletteContract = new ethers.Contract(
          process.env.REACT_APP_ROULETTE_ADDRESS,
          RouletteABI.abi,
          signer
        );

        const treasuryContract = new ethers.Contract(
          process.env.REACT_APP_TREASURY_ADDRESS,
          TreasuryABI.abi,
          signer
        );

        const pokerTableContract = new ethers.Contract(
          process.env.REACT_APP_POKER_TABLE_ADDRESS,
          PokerTableABI.abi,
          signer
        );

        const pokerBettingContract = new ethers.Contract(
          process.env.REACT_APP_POKER_BETTING_ADDRESS,
          PokerBettingABI.abi,
          signer
        );

        const pokerPlayerManagerContract = new ethers.Contract(
          process.env.REACT_APP_POKER_PLAYER_MANAGER_ADDRESS,
          PokerPlayerManagerABI.abi,
          signer
        );

        const pokerGameStateContract = new ethers.Contract(
          process.env.REACT_APP_POKER_GAME_STATE_ADDRESS,
          PokerGameStateABI.abi,
          signer
        );

        const pokerTreasuryContract = new ethers.Contract(
          process.env.REACT_APP_POKER_TREASURY_ADDRESS,
          PokerTreasuryABI.abi,
          signer
        );

        setProvider(provider);
        setSigner(signer);
        setAccount(account);
        setBlackjackContract(blackjackContract);
        setRouletteContract(rouletteContract);
        setTreasuryContract(treasuryContract);
        setPokerTableContract(pokerTableContract);
        setPokerBettingContract(pokerBettingContract);
        setPokerPlayerManagerContract(pokerPlayerManagerContract);
        setPokerGameStateContract(pokerGameStateContract);
        setPokerTreasuryContract(pokerTreasuryContract);
        setIsLoading(false);

        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
          window.location.reload();
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', (chainId) => {
          window.location.reload();
        });

      } catch (error) {
        console.error('Error initializing Web3:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      window.ethereum?.removeAllListeners('accountsChanged');
      window.ethereum?.removeAllListeners('chainChanged');
    };
  }, []);

  const connectWallet = async () => {
    try {
      console.log('Attempting to connect wallet...');
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
      }
      console.log('MetaMask is installed, requesting accounts...');
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Accounts requested successfully, reloading...');
      window.location.reload();
    } catch (error) {
      console.error('Detailed error connecting wallet:', error);
      setError(error.message);
    }
  };

  return (
    <Web3Context.Provider
      value={{
        account,
        signer,
        provider,
        blackjackContract,
        rouletteContract,
        treasuryContract,
        pokerTableContract,
        pokerBettingContract,
        pokerPlayerManagerContract,
        pokerGameStateContract,
        pokerTreasuryContract,
        isLoading,
        error,
        connectWallet
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}
