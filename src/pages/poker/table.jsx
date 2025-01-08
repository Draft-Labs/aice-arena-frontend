import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/Poker.css';
import { getTableName } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Helper function to convert game state number to string
const getGamePhaseString = (gameState) => {
  const phases = ['Waiting', 'Dealing', 'PreFlop', 'Flop', 'Turn', 'River', 'Showdown', 'Complete'];
  return phases[gameState] || 'Waiting';
};

// Add this helper function at the top of the file
const getCardDisplay = (cardNumber) => {
  if (!cardNumber || cardNumber <= 0) return { value: '', suit: '', color: 'black' };
  
  // Adjust cardNumber to be 0-based for calculations
  const adjustedCard = cardNumber - 1;
  
  // Calculate suit (0-3) and rank (0-12)
  const suit = Math.floor(adjustedCard / 13);
  const rank = adjustedCard % 13;
  
  const suits = ['♠', '♣', '♥', '♦'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  return {
    value: values[rank],
    suit: suits[suit],
    color: suit === 2 || suit === 3 ? 'red' : 'black'
  };
};

// Add this memoized card display component
const MemoizedCard = React.memo(({ card }) => {
  const cardDisplay = getCardDisplay(card);
  return (
    <div 
      className="card"
      style={{ color: cardDisplay.color }}
    >
      {card > 0 ? (
        <>
          <div className="card-value">{cardDisplay.value}</div>
          <div className="card-suit">{cardDisplay.suit}</div>
        </>
      ) : (
        <div className="card-back">🂠</div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.card === nextProps.card);

function PokerTable() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { 
    account, 
    pokerTableContract, 
    pokerBettingContract,
    pokerPlayerManagerContract,
    pokerGameStateContract,
    pokerTreasuryContract,
    signer, 
    provider 
  } = useWeb3();
  const [table, setTable] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState(null);
  
  // Add new state variables
  const [raiseAmount, setRaiseAmount] = useState('0');
  const [gameState, setGameState] = useState({
    pot: '0',
    currentBet: '0',
    isPlayerTurn: false,
    canCheck: false,
    minRaise: '0',
    maxRaise: '0'
  });

  // Add new state for game information
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gamePhase, setGamePhase] = useState('Waiting');

  // Add this to your state variables at the top
  const [username, setUsername] = useState('');

  // Add username to player state
  const [usernames, setUsernames] = useState(new Map());

  // Add new state for table name
  const [tableName, setTableName] = useState('');

  // Add new state for player usernames
  const [playerUsernames, setPlayerUsernames] = useState({});

  // Add this state for game info
  const [gameInfo, setGameInfo] = useState({
    pot: '0',
    currentBet: '0',
    isPlayerTurn: false,
    canCheck: false,
    minRaise: '0',
    maxRaise: '0',
    gameState: 'Waiting'
  });

  // Add maxPlayersPerTable constant at the top of your component
  const maxPlayersPerTable = 6;

  // Simplify the username display function
  const formatAddress = (address) => {
    if (!address || address === ethers.ZeroAddress) return 'Empty Seat';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Add new useEffect to fetch table name
  useEffect(() => {
    const fetchTableName = async () => {
      if (tableId) {
        try {
          const name = await getTableName(tableId);
          setTableName(name);
        } catch (err) {
          console.error('Error fetching table name:', err);
        }
      }
    };

    fetchTableName();
  }, [tableId]);

  // Add this new effect to listen for turn events
  useEffect(() => {
    if (!pokerTableContract || !account) {
      console.log('Skipping event setup - missing dependencies:', { 
        hasContract: !!pokerTableContract, 
        hasAccount: !!account 
      });
      return;
    }

    console.log('Setting up poker event listeners');

    const handleGameStateChanged = (tableId, newState) => {
      console.log('Game state changed:', { tableId, newState });
      setGamePhase(getGamePhaseString(newState));
    };

    const handlePlayerJoined = (tableId, player, buyIn) => {
      console.log('Player joined:', { tableId, player, buyIn });
      updateGameState();
    };

    const handlePlayerLeft = (tableId, player) => {
      console.log('Player left:', { tableId, player });
      updateGameState();
    };

    const handlePotAwarded = async (tableId, winner, amount) => {
      console.log('=== PotAwarded Event Received ===');
      try {
        // Get winner's display name
        const displayName = await getPlayerDisplayName(winner);
        
        // Update last winner state
        const winnerState = {
          address: winner,
          displayName,
          potAmount: ethers.formatEther(amount)
        };
        console.log('Setting last winner state:', winnerState);
        setLastWinner(winnerState);
        
        // Show toast notification
        const toastMessage = `${displayName} won ${ethers.formatEther(amount)} ETH!`;
        console.log('Showing toast with message:', toastMessage);
        toast.success(toastMessage, {
          position: "bottom-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        });
      } catch (error) {
        console.error('Error handling PotAwarded event:', error);
      }
    };

    console.log('Registering event handlers...');
    
    try {
      pokerTableContract.on('GameStateChanged', handleGameStateChanged);
      pokerTableContract.on('PlayerJoined', handlePlayerJoined);
      pokerTableContract.on('PlayerLeft', handlePlayerLeft);
      pokerTableContract.on('PotAwarded', handlePotAwarded);
      console.log('Successfully registered all event handlers');
    } catch (error) {
      console.error('Error registering event handlers:', error);
    }

    return () => {
      console.log('Cleaning up event listeners...');
      try {
        pokerTableContract.off('GameStateChanged', handleGameStateChanged);
        pokerTableContract.off('PlayerJoined', handlePlayerJoined);
        pokerTableContract.off('PlayerLeft', handlePlayerLeft);
        pokerTableContract.off('PotAwarded', handlePotAwarded);
        console.log('Successfully removed all event listeners');
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [pokerTableContract, account]);

  // Add this helper function near the top of your component
  const isActionValid = async (action, tableId, account) => {
    try {
      const table = await pokerTableContract.tables(tableId);
      const playerInfo = await pokerPlayerManagerContract.getPlayerInfo(tableId, account);
      
      // Basic validation checks
      if (!playerInfo.isActive) {
        throw new Error('Player not active at table');
      }
      
      if (table.gameState === 0) { // Waiting
        throw new Error('Game not started');
      }
      
      // Action-specific validation
      switch (action) {
        case 'check':
          if (table.currentBet > playerInfo.currentBet) {
            throw new Error('Cannot check when there is a bet to call');
          }
          break;
        case 'call':
          if (table.currentBet === playerInfo.currentBet) {
            throw new Error('No bet to call');
          }
          break;
        case 'fold':
          // Folding is always valid for active players
          break;
        case 'raise':
          if (playerInfo.tableStake < table.currentBet * 2n) {
            throw new Error('Insufficient funds to raise');
          }
          break;
      }
      
      return true;
    } catch (err) {
      console.error('Action validation failed:', err);
      return false;
    }
  };

  // Update the handleAction function
  const handleAction = async (action, amount = '0') => {
    try {
      console.log('=== Starting action:', action, '===');
      
      // Convert amount to string if it's a number
      const amountString = amount.toString();
      
      // Validate action first
      const isValid = await isActionValid(action, tableId, account);
      if (!isValid) {
        throw new Error('Invalid action for current game state');
      }

      let tx;
      const options = { 
        gasLimit: 1000000,
        gasPrice: await provider.getFeeData().then(data => data.gasPrice)
      };
      
      switch (action) {
        case 'fold':
          tx = await pokerBettingContract.fold(tableId, options);
          break;
        case 'check':
          tx = await pokerBettingContract.check(tableId, options);
          break;
        case 'call':
          tx = await pokerBettingContract.call(tableId, options);
          break;
        case 'raise':
          if (parseFloat(amountString) <= parseFloat(currentBet) * 2) {
            toast.error('Raise must be more than double the current bet');
            return;
          }
          tx = await pokerBettingContract.raise(tableId, ethers.parseEther(amountString), options);
          break;
        default:
          throw new Error('Invalid action');
      }

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      toast.success(`Successfully ${action}ed`);
      await updateGameState();
      
    } catch (err) {
      console.error('Detailed error:', err);
      
      // Check for "Not your turn" error
      if (err.data?.data?.message?.includes('Not your turn') || 
          err.message?.includes('Not your turn')) {
        toast.error('Not your turn!');
        return;
      }

      // Handle other errors as before
      let errorMessage = err.message;
      if (err.data?.data?.includes('0x4e487b71')) {
        const panicCode = err.data.data.slice(-2);
        switch (panicCode) {
          case '11':
            errorMessage = 'Operation failed due to arithmetic overflow';
            break;
          case '21':
            errorMessage = 'Invalid player position';
            break;
          default:
            errorMessage = `Contract error: panic code 0x${panicCode}`;
        }
      } else if (err.data) {
        try {
          const revertData = err.data.replace('Reverted ', '');
          const decodedError = ethers.toUtf8String('0x' + revertData.substr(138));
          errorMessage = decodedError;
        } catch (e) {
          console.error('Error decoding revert reason:', e);
        }
      }
      toast.error(errorMessage || `Failed to ${action}`);
    }
  };

  // Update the game state function
  const updateGameState = async () => {
    if (!pokerTableContract || !account || !tableId) return;

    try {
      // Get table info and player info using the correct contract functions
      const [tableInfo, playerInfo] = await Promise.all([
        pokerTableContract.getTableInfo(tableId),
        pokerTableContract.getPlayerInfo(tableId, account)
      ]);

      // Fetch cards based on game state
      if (Number(tableInfo[8]) > 0) { // If game has started
        // Fetch player's cards
        const playerCards = await pokerTableContract.getPlayerCards(tableId, account);
        setPlayerCards(playerCards.map(card => Number(card)));

        // Fetch community cards
        const communityCards = await pokerTableContract.getCommunityCards(tableId);
        setCommunityCards(communityCards.map(card => Number(card)));
      }

      setGameState({
        pot: ethers.formatEther(tableInfo[6]),
        currentBet: ethers.formatEther(tableInfo[4]), // minBet
        isPlayerTurn: playerInfo[2] && !playerInfo[3], // isActive && !isSittingOut
        canCheck: tableInfo[4] === 0n, // minBet === 0
        minRaise: ethers.formatEther(tableInfo[4]),
        maxRaise: ethers.formatEther(tableInfo[5]),
        gamePhase: getGamePhaseString(Number(tableInfo[8])),
        playerCount: tableInfo[7].toString()
      });

    } catch (err) {
      console.error('Error updating game state:', err);
    }
  };

  // Add effect to update game state periodically
  useEffect(() => {
    if (hasJoined) {
      updateGameState();
      const interval = setInterval(updateGameState, 5000);
      return () => clearInterval(interval);
    }
  }, [hasJoined, pokerTableContract, account, tableId]);

  // Fetch table details
  useEffect(() => {
    const fetchTable = async () => {
      if (!pokerTableContract || !tableId) return;

      try {
        const tableInfo = await pokerTableContract.getTableInfo(tableId);
        setTable({
          minBuyIn: ethers.formatEther(tableInfo[0]), // minBuyIn
          maxBuyIn: ethers.formatEther(tableInfo[1]), // maxBuyIn
          smallBlind: ethers.formatEther(tableInfo[2]), // smallBlind
          bigBlind: ethers.formatEther(tableInfo[3]), // bigBlind
          playerCount: tableInfo[7].toString(), // playerCount
          isActive: true // We can assume it's active if we can get the info
        });
      } catch (err) {
        console.error('Error fetching table:', err);
        setError('Failed to load table details');
      }
    };

    fetchTable();
  }, [pokerTableContract, tableId]);

  // Check if player has already joined
  useEffect(() => {
    const checkJoinStatus = async () => {
      if (pokerTableContract && account && tableId) {
        try {
          const playerInfo = await pokerTableContract.getPlayerInfo(tableId, account);
          setHasJoined(playerInfo[2]); // isActive is the third return value
        } catch (err) {
          console.error('Error checking join status:', err);
        }
      }
    };
    
    checkJoinStatus();
  }, [pokerTableContract, account, tableId]);

  // Update the game info function
  const updateGameInfo = async () => {
    try {
      if (!tableId || !pokerTableContract || !account) return;

      // Get table info
      const tableInfo = await pokerTableContract.getTableInfo(tableId);
      
      // Get current player's info if they're at the table
      let playerInfo = null;
      try {
        playerInfo = await pokerTableContract.getPlayerInfo(tableId, account);
      } catch (err) {
        console.log('Current player not at table');
      }

      const gameStateNumber = Number(tableInfo[8]);
      setGameInfo({
        pot: ethers.formatEther(tableInfo[6] || '0'),
        currentBet: playerInfo ? ethers.formatEther(playerInfo[1]) : '0',
        isPlayerTurn: playerInfo ? playerInfo[2] && !playerInfo[3] : false,
        canCheck: tableInfo[4] === 0n,
        minRaise: ethers.formatEther(tableInfo[4] || '0'),
        maxRaise: ethers.formatEther(tableInfo[5] || '0'),
        gameState: getGamePhaseString(gameStateNumber)
      });

    } catch (err) {
      console.error('Error updating game info:', err);
    }
  };

  // Add new state for player names
  const [playerNames, setPlayerNames] = useState({});

  // Add this function to fetch player names
  const fetchPlayerName = async (address) => {
    try {
      const docRef = doc(db, 'userProfiles', address.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        // First check for verified Twitter handle
        if (userData.twitterVerified && userData.twitterHandle) {
          return `@${userData.twitterHandle}`;
        }
        // Then check for display name
        if (userData.displayName) {
          return userData.displayName;
        }
      }
      // Fall back to formatted address
      return formatAddress(address);
    } catch (err) {
      console.error('Error fetching player name:', err);
      return formatAddress(address);
    }
  };

  // Move fetchTableData outside useEffect and make it a function of the component
  const fetchTableData = async () => {
    if (tableId && pokerTableContract) {
      try {
        // Get table info
        const tableInfo = await pokerTableContract.getTableInfo(tableId);
        
        console.log('Table Info:', {
          playerCount: tableInfo[7].toString(),
          pot: ethers.formatEther(tableInfo[6]),
          gameState: tableInfo[8].toString()
        });

        // Get all players at the table
        const activePlayers = [];
        const maxPlayers = 6; // Maximum number of players at the table
        
        // Create an object to store player names
        const names = {};

        // Get all players at the table
        const playerAddresses = await pokerTableContract.getTablePlayers(tableId);
        console.log('Player addresses:', playerAddresses);

        // Process each player
        for (let i = 0; i < playerAddresses.length && i < maxPlayers; i++) {
          try {
            const playerAddress = playerAddresses[i];
            if (playerAddress && playerAddress !== ethers.ZeroAddress) {
              const playerInfo = await pokerTableContract.getPlayerInfo(tableId, playerAddress);
              const [tableStake, currentBet, isActive, isSittingOut] = playerInfo;

              if (isActive) {
                // Fetch player name with priority order
                const playerName = await fetchPlayerName(playerAddress);
                if (playerName) {
                  names[playerAddress] = playerName;
                }

                activePlayers.push({
                  address: playerAddress,
                  position: i,
                  tableStake: ethers.formatEther(tableStake),
                  currentBet: ethers.formatEther(currentBet),
                  isActive,
                  isSittingOut,
                  displayName: playerName
                });

                console.log(`Added player at position ${i}:`, {
                  address: playerAddress,
                  stake: ethers.formatEther(tableStake),
                  bet: ethers.formatEther(currentBet),
                  isActive,
                  isSittingOut
                });
              }
            }
          } catch (err) {
            console.error(`Error getting player info at position ${i}:`, err);
          }
        }

        // Update states
        setPlayerNames(names);
        setPlayers(activePlayers);
        setPlayerUsernames(
          Object.fromEntries(
            activePlayers.map(p => [p.position, p.displayName])
          )
        );

        console.log('Active Players:', activePlayers);

        setTable({
          minBuyIn: ethers.formatEther(tableInfo[0]),
          maxBuyIn: ethers.formatEther(tableInfo[1]),
          smallBlind: ethers.formatEther(tableInfo[2]),
          bigBlind: ethers.formatEther(tableInfo[3]),
          minBet: ethers.formatEther(tableInfo[4]),
          maxBet: ethers.formatEther(tableInfo[5]),
          pot: ethers.formatEther(tableInfo[6]),
          playerCount: tableInfo[7].toString(),
          gameState: tableInfo[8].toString(),
          isActive: true
        });

        // Find current player's info
        const currentPlayerInfo = activePlayers.find(p => p.address.toLowerCase() === account?.toLowerCase());

        setGameInfo({
          pot: ethers.formatEther(tableInfo[6]),
          currentBet: currentPlayerInfo?.currentBet || '0',
          isPlayerTurn: false,
          canCheck: false,
          minRaise: ethers.formatEther(tableInfo[4]),
          maxRaise: ethers.formatEther(tableInfo[5]),
          gameState: getGamePhaseString(Number(tableInfo[8]))
        });

      } catch (err) {
        console.error('Error fetching table data:', err);
        setError(err.message);
      }
    }
  };

  // Update the useEffect to use the fetchTableData function
  useEffect(() => {
    fetchTableData();
    const interval = setInterval(fetchTableData, 5000);
    return () => clearInterval(interval);
  }, [tableId, pokerTableContract, account]);

  // Update game info periodically
  useEffect(() => {
    if (hasJoined) {
      updateGameInfo();
      const interval = setInterval(updateGameInfo, 3000);
      return () => clearInterval(interval);
    }
  }, [hasJoined, pokerTableContract, tableId]);

  const handleJoinTable = async (e) => {
    e.preventDefault();
    setIsJoining(true);
    setError(null);

    try {
      const buyInWei = ethers.parseEther(buyInAmount);
      const tableIdNumber = Number(tableId);

      // First check wallet balance
      const walletBalance = await signer.provider.getBalance(account);
      console.log('Debug balance values:', {
        walletBalanceWei: walletBalance.toString(),
        walletBalanceEth: ethers.formatEther(walletBalance),
        buyInWei: buyInWei.toString(),
        buyInEth: buyInAmount
      });

      if (walletBalance < buyInWei) {
        const needed = ethers.formatEther(buyInWei - walletBalance);
        toast.error(`Insufficient wallet balance. You need ${needed} more ETH in your wallet.`);
        return;
      }

      console.log('Join table parameters:', {
        tableId: tableIdNumber,
        buyInAmount: buyInWei.toString(),
        contractAddress: await pokerPlayerManagerContract.getAddress()
      });

      const tx = await pokerPlayerManagerContract.joinTable(
        tableIdNumber,
        buyInWei,
        {
          value: buyInWei,
          gasLimit: 500000
        }
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');
      
      setHasJoined(true);
      // Immediately fetch updated table data
      await fetchTableData();
      toast.success('Successfully joined the table!');
    } catch (err) {
      console.error('Error joining table:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        data: err.data,
        transaction: err.transaction
      });
      
      // Better error messaging
      if (err.message.includes('Insufficient balance')) {
        setError('Insufficient balance. Please make sure you have enough ETH in your wallet.');
        toast.error('Insufficient balance to join table');
      } else {
        setError(err.message);
        toast.error('Failed to join table');
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Add this near your other state variables
  const [isDealer, setIsDealer] = useState(false);

  // Add this after your other useEffect hooks
  useEffect(() => {
    const checkDealerStatus = async () => {
      if (!pokerTableContract || !account) return;
      try {
        const owner = await pokerTableContract.owner();
        setIsDealer(owner.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error('Error checking dealer status:', err);
      }
    };

    checkDealerStatus();
  }, [pokerTableContract, account]);

  const handleGameAction = async (action, tableId) => {
    try {
      if (!signer) {
        throw new Error('No signer available');
      }

      const feeData = await signer.provider.getFeeData();
      
      // Increase the gas price by 50% using ethers
      const maxFeePerGas = feeData.maxFeePerGas * 150n / 100n;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 150n / 100n;

      let tx;
      const txOptions = {
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit: 500000
      };

      switch (action) {
        case 'flop':
          tx = await pokerGameStateContract.startFlop(tableId, txOptions);
          break;
        case 'turn':
          tx = await pokerGameStateContract.startTurn(tableId, txOptions);
          break;
        case 'river':
          tx = await pokerGameStateContract.startRiver(tableId, txOptions);
          break;
        case 'showdown':
          tx = await pokerGameStateContract.startShowdown(tableId, txOptions);
          break;
        default:
          throw new Error('Invalid action');
      }

      await tx.wait();
      return tx;
    } catch (err) {
      console.error(`Error executing ${action}:`, err);
      throw err;
    }
  };

  // Update the handlers to use the common function
  const handleStartFlop = async () => {
    try {
      const tx = await handleGameAction('flop', tableId);
      toast.success('Flop started successfully');
      await updateGameState();
    } catch (err) {
      console.error('Error starting flop:', err);
      toast.error('Failed to start flop');
    }
  };

  const handleStartTurn = async () => {
    try {
      const tx = await handleGameAction('turn', tableId);
      toast.success('Turn dealt successfully');
      await updateGameState();
    } catch (err) {
      console.error('Error dealing turn:', err);
      toast.error('Failed to deal turn');
    }
  };

  const handleStartRiver = async () => {
    try {
      const tx = await handleGameAction('river', tableId);
      toast.success('River dealt successfully');
      await updateGameState();
    } catch (err) {
      console.error('Error dealing river:', err);
      toast.error('Failed to deal river');
    }
  };

  // Add this helper function to get player display name
  const getPlayerDisplayName = async (address) => {
    try {
      const docRef = doc(db, 'userProfiles', address.toLowerCase());
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const userData = docSnap.data();
        // First check for verified Twitter handle
        if (userData.twitterVerified && userData.twitterHandle) {
          return `@${userData.twitterHandle}`;
        }
        // Then check for display name
        if (userData.displayName) {
          return userData.displayName;
        }
      }
      return formatAddress(address);
    } catch (err) {
      console.error('Error fetching player name:', err);
      return formatAddress(address);
    }
  };

  // Update the handleShowdown function to include player name
  const handleShowdown = async () => {
    try {
      console.log('Starting showdown for table:', tableId);
      const tx = await handleGameAction('showdown', tableId);
      
      console.log('Showdown transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Showdown transaction confirmed:', receipt);
      
      // Parse events to find HandWinner event
      const events = receipt.logs.map(log => {
        try {
          return pokerTableContract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      console.log('All parsed events:', events);
      
      // Find HandWinner event and update last winner state
      const handWinnerEvent = events.find(event => event.name === 'HandWinner');
      if (handWinnerEvent) {
        console.log('Found HandWinner event:', handWinnerEvent);
        
        const winner = handWinnerEvent.args[1];
        const handRank = Number(handWinnerEvent.args[2]);
        const potAmount = handWinnerEvent.args[3];

        // Get winner's display name
        const winnerName = await getPlayerDisplayName(winner);

        const handRanks = [
          'High Card',
          'Pair',
          'Two Pair', 
          'Three of a Kind',
          'Straight',
          'Flush',
          'Full House',
          'Four of a Kind',
          'Straight Flush',
          'Royal Flush'
        ];

        // Update last winner state with both address and display name
        setLastWinner({
          address: winner,
          displayName: winnerName,
          handRank: handRanks[handRank],
          potAmount: ethers.formatEther(potAmount)
        });
      }
      
      // Update game state to Complete
      setGameState(prevState => ({
        ...prevState,
        gamePhase: 'Complete'
      }));

      await updateGameState();
    } catch (err) {
      console.error('Error starting showdown:', err);
      toast.error('Failed to start showdown');
    }
  };

  // Add this function to handle posting blinds
  const handlePostBlinds = async () => {
    try {
      const tx = await pokerBettingContract.postBlinds(tableId);
      await tx.wait();
      toast.success('Blinds posted successfully');
      await updateGameState();
    } catch (err) {
      console.error('Error posting blinds:', err);
      toast.error('Failed to post blinds');
    }
  };

  // Add these new state variables at the top of your component
  const [playerCards, setPlayerCards] = useState([]);
  const [communityCards, setCommunityCards] = useState([]);

  // Add refs for tracking previous card values
  const prevPlayerCardsRef = useRef([]);
  const prevCommunityCardsRef = useRef([]);
  const cardUpdateTimeoutRef = useRef(null);

  // Add this helper function inside the component
  const areCardsEqual = (cards1, cards2) => {
    if (cards1.length !== cards2.length) return false;
    return cards1.every((card, index) => {
      // Deep comparison of card objects
      return card === cards2[index];
    });
  };

  // Add debounced update function
  const debouncedCardUpdate = useCallback((newPlayerCards, newCommunityCards) => {
    // Clear any pending updates
    if (cardUpdateTimeoutRef.current) {
      clearTimeout(cardUpdateTimeoutRef.current);
    }

    // Schedule new update
    cardUpdateTimeoutRef.current = setTimeout(() => {
      const playerCardsChanged = !areCardsEqual(newPlayerCards, prevPlayerCardsRef.current);
      const communityCardsChanged = !areCardsEqual(newCommunityCards, prevCommunityCardsRef.current);

      if (playerCardsChanged) {
        console.log('Updating player cards:', newPlayerCards);
        setPlayerCards(newPlayerCards);
        prevPlayerCardsRef.current = newPlayerCards;
      }

      if (communityCardsChanged) {
        console.log('Updating community cards:', newCommunityCards);
        setCommunityCards(newCommunityCards);
        prevCommunityCardsRef.current = newCommunityCards;
      }
    }, 100); // 100ms debounce
  }, []);

  // Add a ref to track the current game phase
  const lastGamePhaseRef = useRef('Waiting');

  // Add event listener for game state changes
  useEffect(() => {
    if (!pokerTableContract || !account || !tableId || !hasJoined) return;

    const handleGameStateChanged = async (tableId, newState) => {
      const currentGamePhase = getGamePhaseString(Number(newState));
      const lastPhase = lastGamePhaseRef.current;
      console.log('Game state changed:', { tableId, currentGamePhase, lastPhase });

      // Only fetch cards on specific phase transitions
      if (lastPhase === 'Waiting' && currentGamePhase === 'PreFlop') {
        await fetchPlayerCards();
      } else if (
        (lastPhase === 'PreFlop' && currentGamePhase === 'Flop') ||
        (lastPhase === 'Flop' && currentGamePhase === 'Turn') ||
        (lastPhase === 'Turn' && currentGamePhase === 'River')
      ) {
        await fetchCommunityCards();
      } else if (currentGamePhase === 'Waiting') {
        // Reset cards when game ends
        setPlayerCards([]);
        setCommunityCards([]);
      }

      lastGamePhaseRef.current = currentGamePhase;
    };

    // Add function to fetch player cards
    const fetchPlayerCards = async () => {
      try {
        const playerCardsResult = await pokerTableContract.getPlayerCards(tableId, account);
        const processedPlayerCards = playerCardsResult[0].map(card => {
          const suit = Number(card.suit);
          const rank = Number(card.rank);
          return (suit * 13) + rank + 1;
        });
        console.log('Fetched player cards:', processedPlayerCards);
        setPlayerCards(processedPlayerCards);
      } catch (err) {
        console.error('Error fetching player cards:', err);
      }
    };

    // Add function to fetch community cards
    const fetchCommunityCards = async () => {
      try {
        const communityCardsResult = await pokerTableContract.getCommunityCards(tableId);
        const processedCommunityCards = communityCardsResult.map(card => {
          const suit = Number(card.suit);
          const rank = Number(card.rank);
          return (suit * 13) + rank + 1;
        });
        console.log('Fetched community cards:', processedCommunityCards);
        setCommunityCards(processedCommunityCards);
      } catch (err) {
        console.error('Error fetching community cards:', err);
      }
    };

    // Initial fetch of cards if game is in progress
    const initializeCards = async () => {
      try {
        const tableInfo = await pokerTableContract.getTableInfo(tableId);
        const gameState = Number(tableInfo[8]);
        if (gameState > 0) {
          await fetchPlayerCards();
          if (gameState >= 2) { // Flop or later
            await fetchCommunityCards();
          }
        }
      } catch (err) {
        console.error('Error initializing cards:', err);
      }
    };

    // Set up event listener
    pokerTableContract.on('GameStateChanged', handleGameStateChanged);
    
    // Initialize cards
    initializeCards();

    // Cleanup
    return () => {
      pokerTableContract.off('GameStateChanged', handleGameStateChanged);
    };
  }, [pokerTableContract, account, tableId, hasJoined]);

  // Add these state variables
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentBet, setCurrentBet] = useState('0');
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);

  // Update the effect that checks for turns
  useEffect(() => {
    const checkTurn = async () => {
      if (!pokerTableContract || !account || !tableId) return;
      
      try {
        const isPlayerTurn = await pokerTableContract.isPlayerTurn(tableId, account);
        setIsPlayerTurn(isPlayerTurn);
        
        if (isPlayerTurn) {
          setCurrentTurn(account);
        } else {
          // Get table info to check player count and game state
          const tableInfo = await pokerTableContract.getTableInfo(tableId);
          const playerCount = Number(tableInfo[7]);
          const gameState = Number(tableInfo[8]);
          
          // Only check for current turn if game is active and has players
          if (playerCount > 0 && gameState > 0) {
            // Get all active players at the table
            const playerAddresses = await pokerTableContract.getTablePlayers(tableId);
            const activePlayers = [];

            // Check each player
            for (const playerAddress of playerAddresses) {
              if (playerAddress !== ethers.ZeroAddress) {
                const playerInfo = await pokerTableContract.getPlayerInfo(tableId, playerAddress);
                if (playerInfo[2]) { // isActive
                  activePlayers.push(playerAddress);
                }
              }
            }
            
            // Check each active player to find whose turn it is
            for (const player of activePlayers) {
              const isTurn = await pokerTableContract.isPlayerTurn(tableId, player);
              if (isTurn) {
                setCurrentTurn(player);
                break;
              }
            }
          } else {
            setCurrentTurn(null);
          }
        }
      } catch (err) {
        console.error('Error checking turn:', err);
        setCurrentTurn(null);
      }
    };

    checkTurn();
    const interval = setInterval(checkTurn, 3000);
    return () => clearInterval(interval);
  }, [pokerTableContract, account, tableId]);

  // Update the betting controls render
  const renderBettingControls = () => {
    const isMyTurn = currentTurn?.toLowerCase() === account?.toLowerCase();
    
    return (
      <div className="betting-controls">
        <button 
          onClick={() => handleAction('fold')}
          disabled={!isMyTurn}
          className={`action-button ${!isMyTurn ? 'disabled' : ''}`}
        >
          Fold
        </button>
        
        <button 
          onClick={() => handleAction('check')}
          //disabled={!isMyTurn || parseFloat(currentBet) > 0}
          className="action-button"
          //className={`action-button ${(!isMyTurn || parseFloat(currentBet) > 0) ? 'disabled' : ''}`}
        >
          Check
        </button>
        
        <button 
          onClick={() => handleAction('call')}
          disabled={!isMyTurn || parseFloat(currentBet) === 0}
          className={`action-button ${(!isMyTurn || parseFloat(currentBet) === 0) ? 'disabled' : ''}`}
        >
          Call {currentBet} ETH
        </button>
        
        <div className="raise-controls">
          <input
            type="text"
            value={raiseAmount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.]/g, '');
              setRaiseAmount(value);
            }}
            min={parseFloat(currentBet) * 2}
            step="0.001"
            disabled={!isMyTurn}
          />
          <button 
            onClick={() => handleAction('raise', raiseAmount)}
            disabled={!isMyTurn || parseFloat(raiseAmount) <= parseFloat(currentBet) * 2}
            className={`action-button ${(!isMyTurn || parseFloat(raiseAmount) <= parseFloat(currentBet) * 2) ? 'disabled' : ''}`}
          >
            Raise to {raiseAmount} ETH
          </button>
        </div>
      </div>
    );
  };

  // Add this state variable with the other state declarations
  const [isBettingRoundComplete, setIsBettingRoundComplete] = useState(false);

  // Add this effect to check if betting round is complete
  useEffect(() => {
    const checkBettingRound = async () => {
      if (!pokerTableContract || !account || !tableId) return;

      try {
        // Get table info and player info
        const [tableInfo, playerInfo] = await Promise.all([
          pokerTableContract.getTableInfo(tableId),
          pokerTableContract.getPlayerInfo(tableId, account)
        ]);

        // Update current bet and position
        setCurrentBet(ethers.formatEther(tableInfo[4])); // minBet is current bet
        setCurrentPosition(playerInfo[0]); // position is first value

        // Check if it's player's turn
        const isPlayerTurn = await pokerTableContract.isPlayerTurn(tableId, account);
        setIsPlayerTurn(isPlayerTurn);

      } catch (err) {
        console.error('Error checking betting round:', err);
      }
    };

    checkBettingRound();
    const interval = setInterval(checkBettingRound, 3000);
    return () => clearInterval(interval);
  }, [pokerTableContract, account, tableId]);

  // Update the existing HandWinner event handler to include both toast and last hand state
  const [lastWinner, setLastWinner] = useState({
    address: null,
    displayName: null,
    handRank: null,
    potAmount: '0'
  });

  // Update the handleStartNewHand function to reset the last winner
  const handleStartNewHand = async () => {
    try {
      // Reset last winner when starting a new hand
      setLastWinner({
        address: null,
        displayName: null,
        handRank: null,
        potAmount: '0'
      });
      
      // First deal initial cards
      await fetch(`${API_BASE_URL}/poker/deal-initial-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableId })
      });
      
      // Then post blinds
      await handlePostBlinds();
      
      // Update game state
      await updateGameState();
      
      toast.success('New hand started!');
    } catch (err) {
      console.error('Error starting new hand:', err);
      toast.error('Failed to start new hand');
    }
  };

  const [isLeavingTable, setIsLeavingTable] = useState(false);

  const handleLeaveTable = useCallback(async () => {
    try {
      setIsLeavingTable(true);
      
      // Add gas limit to transaction
      const tx = await pokerPlayerManagerContract.leaveTable(tableId, {
        gasLimit: 500000 // Increase gas limit
      });
      
      // Wait for transaction with timeout
      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
      ]);
      
      console.log('Leave table transaction receipt:', receipt);
      
      toast.success('Successfully left table');
      setHasJoined(false);
      navigate('/poker');
    } catch (err) {
      console.error('Error leaving table:', err);
      
      // More detailed error handling
      let errorMessage = 'Failed to leave table';
      if (err.reason) {
        errorMessage = err.reason;
      } else if (err.data?.message) {
        errorMessage = err.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLeavingTable(false);
    }
  }, [tableId, pokerPlayerManagerContract, navigate]);

  // Add a warning modal component for leaving during active hand
  const LeaveWarningModal = ({ isOpen, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    // Add stopPropagation to prevent clicks from bubbling
    const handleOverlayClick = (e) => {
      if (e.target === e.currentTarget) {
        onCancel();
      }
    };

    return (
      <div className="modal-overlay" onClick={handleOverlayClick}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3>Leave Table?</h3>
          <p>
            You are about to leave during an active hand. 
            Your current bet will remain in the pot, but your remaining stack 
            will be returned to your treasury.
          </p>
          <div className="modal-buttons">
            <button onClick={onConfirm}>Leave Table</button>
            <button onClick={onCancel}>Stay</button>
          </div>
        </div>
      </div>
    );
  };

  // Add state for the warning modal
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);

  // Update the leave button click handler
  const handleLeaveClick = () => {
    if (gameState.gamePhase !== 'Waiting' && gameState.gamePhase !== 'Complete') {
      setShowLeaveWarning(true);
    } else {
      handleLeaveTable();
    }
  };

  // Update startGame handler function
  const handleStartGame = async () => {
    try {
      console.log('Starting game for table:', tableId);
      
      // 1. Start the game
      const startTx = await pokerGameStateContract.startGame(tableId, {
        gasLimit: 500000
      });
      console.log('Start game transaction sent:', startTx.hash);
      await startTx.wait();
      console.log('Start game transaction confirmed');

      // 2. Deal hole cards
      console.log('Dealing hole cards...');
      const dealTx = await pokerGameStateContract.dealHoleCards(tableId, {
        gasLimit: 500000
      });
      console.log('Deal cards transaction sent:', dealTx.hash);
      await dealTx.wait();
      console.log('Deal cards transaction confirmed');

      // 3. Post blinds
      console.log('Posting blinds...');
      const blindsTx = await pokerBettingContract.postBlinds(tableId, {
        gasLimit: 500000
      });
      console.log('Post blinds transaction sent:', blindsTx.hash);
      await blindsTx.wait();
      console.log('Post blinds transaction confirmed');

      toast.success('Game started successfully!');
      await fetchTableData();
    } catch (err) {
      console.error('Error starting game:', err);
      toast.error(err.message || 'Failed to start game');
    }
  };

  // Add state for table owner
  const [isTableOwner, setIsTableOwner] = useState(false);

  // Update effect to check if current user is table owner
  useEffect(() => {
    const checkTableOwner = async () => {
      if (!pokerTableContract || !account || !tableId) return;
      try {
        const playerAddresses = await pokerTableContract.getTablePlayers(tableId);
        // First player (position 0) is considered the table owner
        setIsTableOwner(
          playerAddresses[0] && 
          playerAddresses[0].toLowerCase() === account.toLowerCase()
        );
      } catch (err) {
        console.error('Error checking table owner:', err);
      }
    };
    checkTableOwner();
  }, [pokerTableContract, account, tableId]);

  // Update canStartGame to include owner check and logging
  const canStartGame = useMemo(() => {
    console.log('Checking canStartGame:', {
      hasTable: !!table,
      players: players,
      isTableOwner,
      playerCount: players.length,
      gameState: table?.gameState
    });

    if (!table || !players || !isTableOwner) return false;
    const playerCount = players.length;
    const isWaiting = table.gameState === '0';
    const canStart = playerCount >= 2 && isWaiting && isTableOwner;

    console.log('canStartGame result:', {
      playerCount,
      isWaiting,
      isTableOwner,
      canStart
    });

    return canStart;
  }, [table, players, isTableOwner]);

  // Memoize the card states
  const memoizedPlayerCards = useMemo(() => playerCards, [playerCards]);
  const memoizedCommunityCards = useMemo(() => communityCards, [communityCards]);

  if (!account) {
    return <div className="poker-container">Please connect your wallet</div>;
  }

  if (!table) {
    return <div className="poker-container">Loading table details...</div>;
  }

  // Render game interface
  if (hasJoined) {
    return (
      <>
        <div className="poker-game">
          <div className="last-hand-container">
            <h3>Last Hand</h3>
            {lastWinner ? (
              <div className="last-hand-info">
                <p className="winner-address">
                  Winner: {lastWinner.displayName || formatAddress(lastWinner.address)}
                </p>
                <p className="hand-rank">
                  Hand: <span className="rank">{lastWinner.handRank}</span>
                </p>
                <p className="pot-won">
                  Won: <span className="amount">{lastWinner.potAmount} ETH</span>
                </p>
              </div>
            ) : (
              <p>None</p>
            )}
          </div>
          <div className="table-info">
            <h2>{tableName || `Poker Table #${tableId}`}</h2>
            <p>Game Phase: {gameState.gamePhase}</p>
            <p className="pot-amount">Pot: {gameState.pot} ETH</p>
            <p>Players: {gameState.playerCount}/6</p>
            
            <button 
              className={`leave-table-button ${isLeavingTable ? 'loading' : ''}`}
              onClick={handleLeaveClick}
              disabled={isLeavingTable}
            >
              {isLeavingTable ? 'Leaving...' : 'Leave Table'}
            </button>
            {hasJoined && (
              <button
                onClick={handleStartGame}
                disabled={!canStartGame}
                className={`start-game-button ${!canStartGame ? 'disabled' : ''}`}
                title={
                  !isTableOwner ? "Only the table owner can start the game" :
                  players.length < 2 ? "Need at least 2 players to start" :
                  table.gameState !== '0' ? "Game already in progress" :
                  "Start the game"
                }
              >
                Start Game
              </button>
            )}
          </div>
          <div className="poker-table">
            {/* Replace the existing SVG with this one */}
            <svg className="table-background" viewBox="0 0 300 200">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <linearGradient id="holoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#0ff', stopOpacity: 0.1}}/>
                  <stop offset="50%" style={{stopColor: '#08f', stopOpacity: 0.2}}/>
                  <stop offset="100%" style={{stopColor: '#0ff', stopOpacity: 0.1}}/>
                </linearGradient>

                <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <animate 
                    attributeName="x1" 
                    values="-100%;0%;100%" 
                    dur="3s" 
                    repeatCount="indefinite" 
                  />
                  <animate 
                    attributeName="x2" 
                    values="0%;100%;200%" 
                    dur="3s" 
                    repeatCount="indefinite" 
                  />
                  <stop offset="0%" stopColor="rgba(0,255,255,0)" />
                  <stop offset="25%" stopColor="rgba(0,255,255,0.5)" />
                  <stop offset="50%" stopColor="rgba(0,255,255,0)" />
                  <stop offset="75%" stopColor="rgba(0,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(0,255,255,0)" />
                </linearGradient>

                <clipPath id="tableClip">
                  <ellipse 
                    cx="150" 
                    cy="100" 
                    rx="135" 
                    ry="85"
                  />
                </clipPath>
              </defs>

              {/* Base table shape */}
              <ellipse 
                cx="150" 
                cy="100" 
                rx="140" 
                ry="90" 
                fill="url(#holoGradient)" 
                stroke="#0ff" 
                strokeWidth="2"
                filter="url(#glow)"
              />

              {/* Apply clip-path to the line design group */}
              <g stroke="url(#flowGradient)" strokeWidth="1.5" fill="none" clipPath="url(#tableClip)">
                {/* Curved horizontal lines spanning full width */}
                <path d="M 30,60 Q 150,30 270,60" />
                <path d="M 30,140 Q 150,170 270,140" />
                <path d="M 30,100 Q 150,70 270,100" />
                
                {/* Vertical curved lines at wider positions */}
                <path d="M 60,40 Q 60,100 60,160" />
                <path d="M 240,40 Q 240,100 240,160" />
                <path d="M 150,30 Q 150,100 150,170" />
                
                {/* Larger diamond pattern in center */}
                <path d="M 150,50 L 200,100 L 150,150 L 100,100 Z" />
                
                {/* Extended diagonal lines */}
                <path d="M 70,60 L 120,140" />
                <path d="M 230,60 L 180,140" />
                <path d="M 70,140 L 120,60" />
                <path d="M 230,140 L 180,60" />
                
                {/* Additional horizontal lines */}
                <path d="M 80,85 L 220,85" />
                <path d="M 80,115 L 220,115" />
                
                {/* Extended corner connectors */}
                <path d="M 50,70 Q 80,70 100,90" />
                <path d="M 250,70 Q 220,70 200,90" />
                <path d="M 50,130 Q 80,130 100,110" />
                <path d="M 250,130 Q 220,130 200,110" />
                
                {/* Center circle */}
                <circle cx="150" cy="100" r="20" />
                
                {/* Wider decorative arcs */}
                <path d="M 70,50 A 80,80 0 0,1 230,50" />
                <path d="M 70,150 A 80,80 0 0,0 230,150" />
                
                {/* Additional connecting lines */}
                <path d="M 40,100 L 260,100" />
                <path d="M 100,40 L 200,160" />
                <path d="M 100,160 L 200,40" />
              </g>

              {/* Keep existing corner accents */}
              <g filter="url(#glow)">
                <circle cx="30" cy="50" r="3" fill="#0ff">
                  <animate 
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
                <circle cx="270" cy="50" r="3" fill="#0ff">
                  <animate 
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                    begin="0.5s"
                  />
                </circle>
                <circle cx="30" cy="150" r="3" fill="#0ff">
                  <animate 
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                    begin="1s"
                  />
                </circle>
                <circle cx="270" cy="150" r="3" fill="#0ff">
                  <animate 
                    attributeName="opacity"
                    values="0.3;1;0.3"
                    dur="2s"
                    repeatCount="indefinite"
                    begin="1.5s"
                  />
                </circle>
              </g>
            </svg>

            <div className="player-positions">
              {Array.from({ length: maxPlayersPerTable }).map((_, i) => {
                const player = players.find(p => p.position === i);
                const isCurrentTurn = player && currentTurn && 
                  player.address?.toLowerCase() === currentTurn.toLowerCase();
                
                return (
                  <div 
                    key={i} 
                    className={`player-position position-${i} ${isCurrentTurn ? 'current-turn' : ''}`}
                  >
                    {isCurrentTurn && <div className="turn-indicator">Current Turn</div>}
                    <div className="player-info">
                      <h3>{player ? player.displayName : `Seat ${i + 1}`}</h3>
                      {player && (
                        <>
                          <p className="player-stack">Stack: {player.tableStake} ETH</p>
                          <p className="player-bet">Bet: {player.currentBet} ETH</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card-display">
              <div className="community-cards">
                {memoizedCommunityCards.map((card, index) => (
                  <MemoizedCard key={index} card={card} />
                ))}
              </div>
              
              <div className="player-cards">
                <h3>Your Cards:</h3>
                {memoizedPlayerCards.map((card, index) => (
                  <MemoizedCard key={index} card={card} />
                ))}
              </div>
            </div>
          </div>
          <div className="game-controls">
            <div className="action-buttons">
              <button 
                className="fold-button" 
                onClick={() => handleAction('fold')}
                disabled={!gameState.isPlayerTurn}
              >
                Fold
              </button>
              <button 
                className="check-button" 
                onClick={() => handleAction('check')}
                //disabled={!gameState.isPlayerTurn || !gameState.canCheck}
              >
                Check
              </button>
              <button 
                className="call-button" 
                onClick={() => handleAction('call')}
                disabled={!gameState.isPlayerTurn}
              >
                Call
              </button>
              <div className="raise-controls">
                <input
                  type="text"
                  value={raiseAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.]/g, '');
                    setRaiseAmount(value);
                  }}
                  min={parseFloat(currentBet) * 2}
                  step="0.001"
                />
                <button 
                  className="raise-button"
                  onClick={() => handleAction('raise', raiseAmount)}
                  disabled={!gameState.isPlayerTurn || raiseAmount === '' || raiseAmount === '.' || 
                           parseFloat(raiseAmount) < parseFloat(gameState.minRaise) || 
                           parseFloat(raiseAmount) > parseFloat(gameState.maxRaise)}
                >
                  Raise to {raiseAmount || '0'} ETH
                </button>
              </div>
            </div>
          </div>
          <ToastContainer 
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </div>
        
        <LeaveWarningModal
          isOpen={showLeaveWarning}
          onConfirm={() => {
            setShowLeaveWarning(false);
            handleLeaveTable();
          }}
          onCancel={() => setShowLeaveWarning(false)}
        />
      </>
    );
  }

  // Show buy-in form if not joined
  return (
    <div className="poker-container">
      <h2>Join {tableName || `Poker Table #${tableId}`}</h2>
      <div className="table-info">
        <p>Buy-in Range: {table.minBuyIn} - {table.maxBuyIn} ETH</p>
        <p>Blinds: {table.smallBlind}/{table.bigBlind} ETH</p>
        <p>Players: {table.playerCount}/6</p>
      </div>
      
      <form onSubmit={handleJoinTable} className="join-form">
        <div className="form-group">
          <label>Buy-in Amount (ETH)</label>
          <input
            type="number"
            step="0.01"
            value={buyInAmount}
            onChange={(e) => setBuyInAmount(e.target.value)}
            placeholder="Enter amount"
            min={table.minBuyIn}
            max={table.maxBuyIn}
            required
            disabled={isJoining}
          />
        </div>
        <button type="submit" disabled={isJoining}>
          {isJoining ? 'Joining...' : 'Join Table'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      <ToastContainer 
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}

export default PokerTable;
