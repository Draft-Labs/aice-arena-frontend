import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/Poker.css';
import { getTableName, updateCurrentTurn, subscribeTurnUpdates, getCurrentTurnData } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MdKeyboardDoubleArrowRight, MdKeyboardDoubleArrowUp, MdKeyboardDoubleArrowDown } from "react-icons/md";
import tableBackground from '../../assets/table.svg';
import { useContractInteraction } from '../../hooks/useContractInteraction';

function PokerTable() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { account, pokerContract, treasuryContract, signer, provider } = useWeb3();
  const { getPlayerTreasuryBalance, joinPokerTable, leavePokerTable } = useContractInteraction();
  const [table, setTable] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState(null);
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  
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

  // Move getPlayerDisplayName here to ensure it's defined before being used
  const getPlayerDisplayName = useCallback(async (address) => {
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
      
      // If no name found in database, return formatted address
      return formatAddress(address);
    } catch (error) {
      console.error('Error getting player display name:', error);
      return formatAddress(address);
    }
  }, []);  // No dependencies needed as formatAddress is defined within the component

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

  // Add this to your state variables at the top
  const [dealtCards, setDealtCards] = useState({
    community: [],
    player: [],
    // Track which cards have been animated
    animatedCommunity: new Set(),
    animatedPlayer: new Set()
  });

  // Add this constant for animation timing
  const ANIMATION_DURATION = 500; // Base animation duration in ms
  const CARD_DELAY = 200; // Delay between each card

  // Update the animateCards function to only animate new cards
  const animateCards = (cards, type) => {
    return new Promise(resolve => {
      const newCards = cards.filter((_, index) => {
        // Only animate cards that haven't been animated before
        return !dealtCards[`animated${type.charAt(0).toUpperCase() + type.slice(1)}`].has(index);
      });

      if (newCards.length === 0) {
        resolve();
        return;
      }

      newCards.forEach((_, index) => {
        setTimeout(() => {
          setDealtCards(prev => ({
            ...prev,
            [type]: [...prev[type], index],
            [`animated${type.charAt(0).toUpperCase() + type.slice(1)}`]: 
              new Set([...prev[`animated${type.charAt(0).toUpperCase() + type.slice(1)}`], index])
          }));
        }, index * CARD_DELAY);
      });

      // Resolve after all new cards are dealt and animated
      const totalDuration = (newCards.length - 1) * CARD_DELAY + ANIMATION_DURATION;
      setTimeout(resolve, totalDuration);
    });
  };

  // Simplify the username display function
  const formatAddress = (address) => {
    if (!address || address === ethers.ZeroAddress) return 'None';
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
    if (!pokerContract || !account) {
      console.log('Skipping event setup - missing dependencies:', { 
        hasContract: !!pokerContract, 
        hasAccount: !!account 
      });
      return;
    }

    console.log('Setting up poker event listeners');
    
    // Create a single listener for all events
    // This approach works better in ethers.js v6
    const handleAllEvents = (log) => {
      // Make sure we have a proper log object
      if (!log) {
        console.warn('Received empty log in event handler');
        return;
      }
      
      console.log('Event received:', log);
      
      // Try to determine the event type
      try {
        // Check if we have a fragment property that tells us the event name
        if (log.fragment && log.fragment.name) {
          const eventName = log.fragment.name;
          console.log('Detected event:', eventName);
          
          // Handle based on event name
          switch (eventName) {
            case 'TurnStarted':
              console.log('Turn started event detected');
              if (log.args && log.args.length >= 2) {
                const [eventTableId, player] = log.args;
                console.log('Turn started:', { tableId: Number(eventTableId), player });
                
                // Only update if this event is for our table
                if (Number(eventTableId) === Number(tableId)) {
                  setCurrentTurn(player);
                  
                  // Get game state to include in the Firebase update
                  pokerContract.getTableInfo(tableId).then(tableInfo => {
                    const gameStateNum = Number(tableInfo[8]);
                    const gamePhaseStr = getGameStateString(gameStateNum);
                    
                    // Update Firebase with current turn info
                    updateCurrentTurn(tableId, {
                      address: player,
                      position: -1, // We don't have this info from the event
                      gameState: gameStateNum,
                      gamePhase: gamePhaseStr
                    }).catch(err => {
                      console.error('Error updating Firebase with turn data:', err);
                    });
                  }).catch(err => {
                    console.error('Error getting table info for Firebase update:', err);
                  });
                }
              }
              break;
              
            case 'TurnEnded':
              console.log('Turn ended event detected');
              if (log.args && log.args.length >= 3) {
                const [tableId, player, action] = log.args;
                console.log('Turn ended:', { tableId: Number(tableId), player, action });
              }
              break;
              
            case 'RoundComplete':
              console.log('Round complete event detected');
              if (log.args && log.args.length >= 1) {
                const [tableId] = log.args;
                console.log('Round complete:', Number(tableId));
              }
              break;
              
            case 'HandWinner':
              console.log('Hand winner event detected');
              handleHandWinnerEvent(log);
              break;
              
            default:
              console.log('Other event detected:', eventName);
          }
        } else {
          // If we don't have fragment info, try to identify by topics
          console.log('No fragment info, log details:', log);
        }
      } catch (error) {
        console.error('Error processing event:', error);
      }
    };
    
    // Separate handler for HandWinner to keep code clean
    const handleHandWinnerEvent = async (log) => {
      try {
        if (!log.args || log.args.length < 4) {
          console.error('Invalid HandWinner event data');
          return;
        }
        
        const [tableId, winner, handRank, potAmount] = log.args;
        
        console.log('HandWinner event details:', {
          tableId: Number(tableId),
          winner,
          handRank: Number(handRank),
          potAmount
        });
        
        // Get winner's display name
        const winnerName = await getPlayerDisplayName(winner);
        console.log('Got display name:', winnerName);
        
        // Convert hand rank number to string
        const handRanks = [
          'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
          'Straight', 'Flush', 'Full House', 'Four of a Kind',
          'Straight Flush', 'Royal Flush'
        ];
        
        const handRankNum = Number(handRank);
        const handRankString = handRanks[handRankNum] || `Unknown Rank (${handRankNum})`;
        
        // Update last winner state
        const winnerState = {
          address: winner,
          displayName: winnerName,
          handRank: handRankString,
          potAmount: ethers.formatEther(potAmount)
        };
        
        setLastWinner(winnerState);
        
        // Show toast notification
        const toastMessage = `${winnerName} won with ${handRankString}!`;
        toast.success(toastMessage, {
          position: "bottom-right",
          autoClose: 5000
        });
      } catch (error) {
        console.error('Error handling HandWinner event:', error);
      }
    };

    // Set up a direct listener that doesn't rely on specific event names
    try {
      console.log('Setting up generic event listener');
      pokerContract.on('*', handleAllEvents);
      console.log('Successfully set up event listener');
    } catch (error) {
      console.error('Error setting up event listener:', error);
      
      // Fallback approach - try setting up polling for events
      console.log('Trying fallback approach with polling');
      
      // Set up a polling interval to check for events
      const pollInterval = setInterval(async () => {
        try {
          // This approach doesn't rely on event listeners but checks for events manually
          console.log('Polling for poker events...');
          
          // Can add specific polling logic here if needed
          
        } catch (pollError) {
          console.error('Error polling for events:', pollError);
        }
      }, 5000); // Poll every 5 seconds
      
      // Return cleanup function for the interval
      return () => {
        console.log('Cleaning up poll interval');
        clearInterval(pollInterval);
      };
    }

    return () => {
      console.log('Cleaning up event listeners...');
      try {
        // Remove all listeners
        pokerContract.removeAllListeners();
        console.log('Successfully removed all event listeners');
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [pokerContract, account, getPlayerDisplayName]);

  // Add this helper function near the top of your component
  const isActionValid = async (action, tableId, account) => {
    try {
      // Get table info using getTableInfo
      const tableInfo = await pokerContract.getTableInfo(tableId);
      
      // Parse the table data
      const table = {
        minBuyIn: tableInfo[0],
        maxBuyIn: tableInfo[1],
        smallBlind: tableInfo[2],
        bigBlind: tableInfo[3],
        minBet: tableInfo[4],
        maxBet: tableInfo[5],
        pot: tableInfo[6],
        playerCount: tableInfo[7],
        gameState: tableInfo[8],
        isActive: tableInfo[9],
        // These properties may not be directly available from getTableInfo
        // Since we can't get the current bet and position directly, 
        // we'll use minBet and a default position
        currentBet: tableInfo[4], // Using minBet as a substitute for currentBet
        currentPosition: 0 // Default value
      };
      
      console.log('Action validation table data:', table);
      
      const playerInfo = await pokerContract.getPlayerInfo(tableId, account);
      console.log('Player info for validation:', playerInfo);
      
      // Basic validation checks
      if (!playerInfo[2]) { // isActive should be at index 2
        throw new Error('Player not active at table');
      }
      
      if (Number(table.gameState) === 0) { // Waiting
        throw new Error('Game not started');
      }
      
      // Action-specific validation
      switch (action) {
        case 'check':
          if (table.currentBet > playerInfo[1]) { // currentBet should be at index 1
            throw new Error('Cannot check when there is a bet to call');
          }
          break;
        case 'call':
          if (table.currentBet === playerInfo[1]) {
            throw new Error('No bet to call');
          }
          break;
        case 'fold':
          // Folding is always valid for active players
          break;
        case 'raise':
          if (playerInfo[0] < table.currentBet * 2n) { // tableStake should be at index 0
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
      if (!pokerContract || !account || !tableId) {
        toast.error("Missing required connection info");
        return;
      }

      console.log(`Performing action: ${action}${amount !== '0' ? ` with amount ${amount}` : ''}`);

      let tx;
      switch (action.toLowerCase()) {
        case 'fold':
          tx = await pokerContract.fold(tableId);
          break;
        case 'check':
          tx = await pokerContract.check(tableId);
          break;
        case 'call':
          tx = await pokerContract.call(tableId);
          break;
        case 'raise':
          if (amount === '0') {
            toast.error("Please enter a valid raise amount");
            return;
          }
          tx = await pokerContract.raise(tableId, ethers.parseEther(amount));
          break;
        default:
          toast.error("Unknown action");
          return;
      }

      toast.info(`${action.toUpperCase()} transaction sent!`);
      
      // Wait for transaction to confirm
      const receipt = await tx.wait();
      console.log(`${action} transaction confirmed:`, receipt);
      
      // Force fetch table data to get the latest state
      await fetchTableData();
      
      // Fetch the players at the table after the action
      const players = await pokerContract.getTablePlayers(tableId);
      
      if (!players || players.length < 2) {
        console.warn("Not enough players to determine next turn");
        return;
      }
      
      console.log("Players after action:", players.map(p => p.slice(0, 8) + '...'));
      
      // Find the current player's index
      const currentPlayerIndex = players.findIndex(
        player => player.toLowerCase() === account.toLowerCase()
      );
      
      if (currentPlayerIndex === -1) {
        console.warn("Current player not found in player list");
        return;
      }
      
      console.log("Current player index:", currentPlayerIndex);
      
      // Determine the next player (simple round-robin)
      // In a real poker game, this would need to account for folded players, etc.
      const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
      const nextPlayerAddress = players[nextPlayerIndex];
      
      console.log("Next player index:", nextPlayerIndex);
      console.log("Next player address:", nextPlayerAddress.slice(0, 8) + '...');
      
      // Get the current game state
      const tableInfo = await pokerContract.getTableInfo(tableId);
      const gameStateNum = Number(tableInfo[8]);
      const gamePhaseStr = getGameStateString(gameStateNum);
      
      // Update Firebase with the next player's turn
      await updateCurrentTurn(tableId, {
        address: nextPlayerAddress,
        position: nextPlayerIndex,
        gameState: gameStateNum,
        gamePhase: gamePhaseStr
      });
      
      // Also update the local turn indicator
      setCurrentTurn(nextPlayerAddress);
      
      // Update game state to reflect turn status
      setGameState(prev => ({
        ...prev,
        isPlayerTurn: false, // No longer current player's turn
        gamePhase: gamePhaseStr
      }));
      
      console.log("Turn updated after action:", {
        from: account.slice(0, 8) + '...',
        to: nextPlayerAddress.slice(0, 8) + '...',
        action: action
      });
      
      toast.success(`${action.toUpperCase()} successful!`);
      
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      toast.error(`${action.toUpperCase()} failed: ${error.message}`);
    }
  };

  // Add game state update function
  const updateGameState = async () => {
    if (!pokerContract || !tableId) return;
    
    try {
      // Get table info using getTableInfo instead of tables
      const tableInfo = await pokerContract.getTableInfo(tableId);
      
      // Extract game state directly from tableInfo (at index 8)
      const gameState = tableInfo[8];
      
      console.log('Current game state:', {
        raw: gameState,
        asString: getGameStateString(Number(gameState))
      });
      
      // Create a table data object from the array response
      const tableData = {
        minBuyIn: tableInfo[0],
        maxBuyIn: tableInfo[1],
        smallBlind: tableInfo[2],
        bigBlind: tableInfo[3],
        minBet: tableInfo[4],
        maxBet: tableInfo[5],
        pot: tableInfo[6],
        playerCount: tableInfo[7],
        gameState: tableInfo[8],
        isActive: tableInfo[9]
      };
      
      // Update state with table data
      setGameInfo(prevInfo => ({
        ...prevInfo,
        pot: ethers.formatEther(tableData.pot),
        gameState: getGameStateString(Number(gameState))
      }));
      
      // More logic for different game states...

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
  }, [hasJoined, pokerContract, account, tableId]);

  // Fetch table details
  useEffect(() => {
    const fetchTable = async () => {
      if (!pokerContract || !tableId) return;

      try {
        const tableInfo = await pokerContract.getTableInfo(tableId);
        setTable({
          minBuyIn: ethers.formatEther(tableInfo[0]),
          maxBuyIn: ethers.formatEther(tableInfo[1]),
          smallBlind: ethers.formatEther(tableInfo[2]),
          bigBlind: ethers.formatEther(tableInfo[3]),
          playerCount: tableInfo[7],
          isActive: tableInfo[9]
        });
      } catch (err) {
        console.error('Error fetching table:', err);
        setError('Failed to load table details');
      }
    };

    fetchTable();
  }, [pokerContract, tableId]);

  // Check if player has already joined
  useEffect(() => {
    const checkJoinStatus = async () => {
      if (pokerContract && account && tableId) {
        try {
          const playerInfo = await pokerContract.getPlayerInfo(tableId, account);
          setHasJoined(playerInfo.isActive);
        } catch (err) {
          console.error('Error checking join status:', err);
        }
      }
    };
    
    checkJoinStatus();
  }, [pokerContract, account, tableId]);

  // Update the game info function
  const updateGameInfo = async () => {
    try {
      if (!tableId || !pokerContract || !account) return;

      // Get table info
      const tableInfoArray = await pokerContract.getTableInfo(tableId);
      
      // Parse table info from the returned array
      const tableInfo = {
        minBuyIn: tableInfoArray[0],
        maxBuyIn: tableInfoArray[1],
        smallBlind: tableInfoArray[2],
        bigBlind: tableInfoArray[3],
        minBet: tableInfoArray[4],
        maxBet: tableInfoArray[5],
        pot: tableInfoArray[6],
        playerCount: tableInfoArray[7],
        gameState: tableInfoArray[8],
        isActive: tableInfoArray[9]
      };
      
      console.log('Update Game Info - Table Info:', tableInfo);
      
      // Get current player's info if they're at the table
      let playerInfo = null;
      try {
        const playerInfoArray = await pokerContract.getPlayerInfo(tableId, account);
        // Parse player info from array
        playerInfo = {
          tableStake: playerInfoArray[0],
          currentBet: playerInfoArray[1],
          isActive: playerInfoArray[2],
          isSittingOut: playerInfoArray[3],
          position: playerInfoArray[4]
        };
        console.log('Update Game Info - Player Info:', playerInfo);
      } catch (err) {
        console.log('Current player not at table');
      }

      // Get the current bet from the table or a default bet amount for small blind/big blind
      const tableBet = tableInfo.minBet || 0n;
      const playerBet = playerInfo?.currentBet || 0n;
      
      // Calculate the amount needed to call (table bet - player's current bet)
      const amountToCall = playerInfo ? tableBet - playerBet : 0n;
      
      console.log('Bet Calculation:', {
        tableBet: ethers.formatEther(tableBet),
        playerBet: playerInfo ? ethers.formatEther(playerBet) : '0',
        amountToCall: ethers.formatEther(amountToCall)
      });
      
      // Update the currentBet state
      setCurrentBet(ethers.formatEther(amountToCall));
      
      setGameInfo({
        pot: ethers.formatEther(tableInfo.pot || 0n),
        currentBet: ethers.formatEther(amountToCall),
        isPlayerTurn: false, // Will be updated by the turn checker
        canCheck: amountToCall === 0n,
        minRaise: ethers.formatEther(tableInfo.minBet || 0n),
        maxRaise: ethers.formatEther(tableInfo.maxBet || 0n),
        gameState: getGameStateString(Number(tableInfo.gameState))
      });

    } catch (err) {
      console.error('Error updating game info:', err);
    }
  };

  // Helper function to convert game state number to string
  const getGameStateString = (stateNumber) => {
    const states = [
      'Waiting',
      'Dealing',
      'PreFlop',
      'Flop',
      'Turn',
      'River',
      'Showdown',
      'Complete'
    ];
    const index = parseInt(stateNumber.toString());
    return states[index] || 'Waiting';
  };

  // Add new state for player names
  const [playerNames, setPlayerNames] = useState({});

  // Add this function to fetch player names
  const fetchPlayerName = useCallback(async (address) => {
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
  }, []);

  // Create a reusable fetchTableData function that can be called from anywhere
  const fetchTableData = useCallback(async () => {
    if (!pokerContract || !tableId) {
      console.log('Missing dependencies for fetchTableData');
      return;
    }
    
    try {
      console.log('Fetching table data for tableId:', tableId);
      
      // Get table info using getTableInfo instead of tables
      const tableInfo = await pokerContract.getTableInfo(tableId);
      console.log('Table Info:', tableInfo);
      
      // Extract game state directly from tableInfo (at index 8)
      const gameState = tableInfo[8];
      console.log('Game State:', {
        raw: gameState,
        gameState: gameState.toString()
      });
      
      // Parse table info from the returned array
      const tableData = {
        minBuyIn: tableInfo[0],
        maxBuyIn: tableInfo[1],
        smallBlind: tableInfo[2],
        bigBlind: tableInfo[3],
        minBet: tableInfo[4],
        maxBet: tableInfo[5],
        pot: tableInfo[6],
        playerCount: tableInfo[7],
        gameState: tableInfo[8],
        isActive: tableInfo[9]
      };
      
      console.log('Parsed Table Data:', tableData);

      // Get all players at the table
      const activePlayers = [];
      
      // Get player addresses array from the table
      const playerAddresses = await pokerContract.getTablePlayers(tableId);
      console.log('Player Addresses:', playerAddresses);

      // Create an object to store player names
      const names = {};

      // Get info for each player address
      for (const playerAddress of playerAddresses) {
        try {
          const [tableStake, currentBet, isActive, isSittingOut, position] = 
            await pokerContract.getPlayerInfo(tableId, playerAddress);

          if (isActive) {
            // Fetch player name with priority order
            const playerName = await fetchPlayerName(playerAddress);
            if (playerName) {
              names[playerAddress] = playerName;
            }

            activePlayers.push({
              address: playerAddress,
              position: parseInt(position.toString()),
              tableStake: ethers.formatEther(tableStake),
              currentBet: ethers.formatEther(currentBet),
              isActive,
              isSittingOut,
              displayName: playerName
            });
          }
        } catch (err) {
          console.error(`Error getting player info for ${playerAddress}:`, err);
        }
      }

      // Update player names state
      setPlayerNames(names);

      // Sort players by position
      activePlayers.sort((a, b) => a.position - b.position);
      
      console.log('Active Players:', activePlayers);
      console.log('Player Names:', names);

      setPlayers(activePlayers);
      
      // Debug log for player usernames
      const usernames = Object.fromEntries(
        activePlayers.map(p => [p.position, p.displayName])
      );
      console.log('Setting player usernames:', usernames);
      setPlayerUsernames(usernames);

      // tableData is already defined above, so we don't need to redefine it.
      // Just use the existing tableData variable here:
      setTable({
        minBuyIn: ethers.formatEther(tableData.minBuyIn),
        maxBuyIn: ethers.formatEther(tableData.maxBuyIn),
        smallBlind: ethers.formatEther(tableData.smallBlind),
        bigBlind: ethers.formatEther(tableData.bigBlind),
        minBet: ethers.formatEther(tableData.minBet),
        maxBet: ethers.formatEther(tableData.maxBet),
        pot: ethers.formatEther(tableData.pot),
        playerCount: tableData.playerCount.toString(),
        gameState: tableData.gameState.toString(),
        isActive: tableData.isActive
      });

      setGameInfo({
        pot: ethers.formatEther(tableData.pot),
        currentBet: activePlayers.find(p => p.address === account)?.currentBet || '0',
        isPlayerTurn: false,
        canCheck: false,
        minRaise: ethers.formatEther(tableData.minBet),
        maxRaise: ethers.formatEther(tableData.maxBet),
        gameState: getGameStateString(tableData.gameState)
      });
      
      // After refreshing all player data, validate and update the current turn indicator
      // if we have at least 2 players
      if (activePlayers.length >= 2) {
        // Determine who should have the turn based on the current game state
        let currentTurnPlayer;
        
        // Get the current turn data from Firebase
        const firebaseData = await getCurrentTurnData(tableId);
        
        if (firebaseData && firebaseData.currentTurn) {
          // Use the player from Firebase if available
          const currentTurnAddress = firebaseData.currentTurn;
          
          // Verify this player is still active at the table
          const isPlayerActive = activePlayers.some(p => 
            p.address.toLowerCase() === currentTurnAddress.toLowerCase()
          );
          
          if (isPlayerActive) {
            currentTurnPlayer = currentTurnAddress;
            console.log("Using existing turn from Firebase:", currentTurnPlayer.slice(0, 8) + '...');
          } else {
            // If the player is no longer active, use the first player
            currentTurnPlayer = activePlayers[0].address;
            console.log("Firebase turn player no longer active, using first player:", currentTurnPlayer.slice(0, 8) + '...');
          }
        } else {
          // Default to the first player if no Firebase data
          currentTurnPlayer = activePlayers[0].address;
          console.log("No Firebase turn data, using first player:", currentTurnPlayer.slice(0, 8) + '...');
        }
        
        // Find the position of the current turn player
        const playerIndex = activePlayers.findIndex(p => 
          p.address.toLowerCase() === currentTurnPlayer.toLowerCase()
        );
        
        // Only update Firebase if we found a valid player
        if (playerIndex !== -1) {
          const playerPosition = activePlayers[playerIndex].position;
          const gameStateNum = Number(tableData.gameState);
          const gamePhaseStr = getGameStateString(gameStateNum);
          
          // Update both Firebase and local state
          updateCurrentTurn(tableId, {
            address: currentTurnPlayer,
            position: playerPosition,
            gameState: gameStateNum, 
            gamePhase: gamePhaseStr
          }).then(() => {
            console.log("Turn indicator synced with Firebase during data refresh");
          }).catch(err => {
            console.error("Failed to sync turn with Firebase:", err);
          });
          
          // Also update the local state for UI rendering
          setCurrentTurn(currentTurnPlayer);
        }
      }

    } catch (err) {
      console.error('Error fetching table data:', err);
      setError(err.message);
    }
  }, [pokerContract, tableId, account, fetchPlayerName]);

  // Update the useEffect that fetches table data to include player names
  useEffect(() => {
    fetchTableData();
    const interval = setInterval(fetchTableData, 5000);
    return () => clearInterval(interval);
  }, [fetchTableData]);

  // Helper function to convert GameState enum to string
  const getGamePhaseString = (gameState) => {
    const phases = ['Waiting', 'Dealing', 'PreFlop', 'Flop', 'Turn', 'River', 'Showdown', 'Complete'];
    return phases[gameState] || 'Unknown';
  };

  // Update game info periodically
  useEffect(() => {
    if (hasJoined) {
      updateGameInfo();
      const interval = setInterval(updateGameInfo, 3000);
      return () => clearInterval(interval);
    }
  }, [hasJoined, pokerContract, tableId]);

  // Add useEffect to fetch player's treasury balance
  useEffect(() => {
    const fetchTreasuryBalance = async () => {
      if (account) {
        try {
          const balance = await getPlayerTreasuryBalance();
          setTreasuryBalance(balance);
          console.log('Player treasury balance:', balance);
        } catch (err) {
          console.error('Error fetching treasury balance:', err);
        }
      }
    };

    fetchTreasuryBalance();
    const interval = setInterval(fetchTreasuryBalance, 10000);
    return () => clearInterval(interval);
  }, [account, getPlayerTreasuryBalance]);

  // Update handleJoinTable to use our contract interaction hook
  const handleJoinTable = async (e) => {
    e.preventDefault();
    setIsJoining(true);
    setError(null);

    try {
      const buyInWei = ethers.parseEther(buyInAmount);
      const tableIdNumber = Number(tableId);

      // Check wallet balance
      const walletBalance = await signer.provider.getBalance(account);
      console.log('Debug balance values:', {
        walletBalanceWei: walletBalance.toString(),
        walletBalanceEth: ethers.formatEther(walletBalance),
        buyInWei: buyInWei.toString(),
        buyInEth: buyInAmount,
        treasuryBalance
      });

      // Check treasury balance against buy-in amount
      if (parseFloat(treasuryBalance) < parseFloat(buyInAmount)) {
        const needed = (parseFloat(buyInAmount) - parseFloat(treasuryBalance)).toFixed(4);
        toast.error(`Insufficient treasury balance. Please deposit at least ${needed} AVAX to your account.`);
        setIsJoining(false);
        return;
      }

      // Use our new joinPokerTable function
      await joinPokerTable(tableIdNumber, buyInAmount);
      
      setHasJoined(true);
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
        setError('Insufficient balance in treasury. Please deposit funds first.');
        toast.error('Please deposit funds to your treasury account first');
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
      if (!pokerContract || !account) return;
      try {
        const owner = await pokerContract.owner();
        setIsDealer(owner.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error('Error checking dealer status:', err);
      }
    };

    checkDealerStatus();
  }, [pokerContract, account]);

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
          tx = await pokerContract.startFlop(tableId, txOptions);
          break;
        case 'turn':
          tx = await pokerContract.startTurn(tableId, txOptions);
          break;
        case 'river':
          tx = await pokerContract.startRiver(tableId, txOptions);
          break;
        case 'showdown':
          tx = await pokerContract.startShowdown(tableId, txOptions);
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
          return pokerContract.interface.parseLog({
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
      const tx = await pokerContract.postBlinds(tableId);
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

  // Add this helper function
  const cardValueToString = (cardNumber) => {
    const suits = ['♠', '♣', '♥', '♦'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const suit = suits[Math.floor((cardNumber - 1) / 13)];
    const value = values[(cardNumber - 1) % 13];
    const color = '#06F2DB';
    
    return { value, suit, color };
  };

  // Update the useEffect for fetching cards
  useEffect(() => {
    const fetchCards = async () => {
      if (!account || !tableId || !hasJoined) {
        console.log('Skipping card fetch:', { account, tableId, hasJoined });
        return;
      }

      try {
        console.log('Fetching cards for:', { tableId, account });
        
        const [playerRes, communityRes] = await Promise.all([
          fetch(`${API_BASE_URL}/poker/player-cards/${tableId}/${account}`),
          fetch(`${API_BASE_URL}/poker/community-cards/${tableId}`)
        ]);

        const [playerData, communityData] = await Promise.all([
          playerRes.json(),
          communityRes.json()
        ]);

        console.log('Received card data:', { playerData, communityData });

        if (playerData.success) {
          console.log('Setting player cards:', playerData.cards);
          setPlayerCards(playerData.cards);
          await animateCards(playerData.cards, 'player');
        }
        if (communityData.success) {
          console.log('Setting community cards:', communityData.cards);
          setCommunityCards(communityData.cards);
          await animateCards(communityData.cards, 'community');
        }
      } catch (err) {
        console.error('Error fetching cards:', err);
      }
    };

    fetchCards();
    const interval = setInterval(fetchCards, 5000);
    return () => clearInterval(interval);
  }, [account, tableId, hasJoined]);

  // Add these state variables
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentBet, setCurrentBet] = useState('0');
  const [isPlayerTurn, setIsPlayerTurn] = useState(false);

  // Update the effect that checks for turns
  useEffect(() => {
    if (!tableId) return;
    
    console.log('Setting up Firebase turn subscription for table', tableId);
    
    // Subscribe to turn updates from Firebase
    const unsubscribe = subscribeTurnUpdates(tableId, (turnData) => {
      console.log('Turn update from Firebase:', turnData);
      
      if (turnData.currentTurn) {
        // Update local state with Firebase data
        setCurrentTurn(turnData.currentTurn);
        
        // Check if it's the current user's turn
        const isMyTurn = turnData.currentTurn.toLowerCase() === account?.toLowerCase();
        
        // Update game state to reflect turn status
        setGameState(prev => ({
          ...prev,
          isPlayerTurn: isMyTurn,
          gamePhase: turnData.gamePhase || prev.gamePhase
        }));
        
        console.log('Turn state updated from Firebase:', {
          currentPlayer: turnData.currentTurn?.slice(0, 8) + '...',
          isMyTurn,
          myAddress: account?.slice(0, 8) + '...',
          gamePhase: turnData.gamePhase
        });
      }
    });
    
    // Also set up a fallback that periodically checks the blockchain
    // This handles cases where Firebase might miss an update
    const checkTurn = async () => {
      if (!pokerContract || !account || !tableId) return;
      
      try {
        console.log('Backup turn check from blockchain...');
        
        // Get all needed data in parallel
        const [tableInfoResult, players] = await Promise.all([
          pokerContract.getTableInfo(tableId),
          pokerContract.getTablePlayers(tableId)
        ]);
        
        // If we don't have players, we can't determine the current turn
        if (!players || players.length === 0) {
          console.log('No players found at table');
          return;
        }
        
        // Parse table info from the returned array
        const tableInfo = {
          minBuyIn: tableInfoResult[0],
          maxBuyIn: tableInfoResult[1],
          smallBlind: tableInfoResult[2],
          bigBlind: tableInfoResult[3],
          minBet: tableInfoResult[4],
          maxBet: tableInfoResult[5],
          pot: tableInfoResult[6],
          playerCount: tableInfoResult[7],
          gameState: tableInfoResult[8],
          isActive: tableInfoResult[9]
        };
        
        // Get the current turn position from the contract
        let currentPosition = 0;
        try {
          currentPosition = await pokerContract.getCurrentTurnPosition(tableId);
          console.log('Current turn position from contract:', currentPosition.toString());
        } catch (err) {
          console.log('Could not get turn position directly from contract:', err.message);
          
          // Fallback to game state based logic
          const gameState = Number(tableInfo.gameState);
          if (gameState === 2) { // PreFlop
            currentPosition = 2 % players.length; // Start with player after big blind
          } else {
            currentPosition = 0; // In other phases start with first player
          }
          console.log('Using fallback position calculation:', currentPosition);
        }
        
        // Get current player from position, ensuring it's a number
        const safePosition = Number(currentPosition) % players.length;
        const currentPlayerAddress = players[safePosition];
        
        // Only update Firebase if we found a valid player address
        if (currentPlayerAddress && currentPlayerAddress !== ethers.ZeroAddress) {
          // Update Firebase with blockchain data
          updateCurrentTurn(tableId, {
            address: currentPlayerAddress,
            position: safePosition,
            gameState: Number(tableInfo.gameState),
            gamePhase: getGameStateString(Number(tableInfo.gameState))
          }).catch(err => {
            console.error('Error updating Firebase in backup check:', err);
          });
        }
      } catch (err) {
        console.error('Error in backup turn check:', err);
      }
    };
    
    // Run the backup check immediately and then periodically
    checkTurn();
    const interval = setInterval(checkTurn, 15000); // Every 15 seconds as backup
    
    // Clean up all subscriptions
    return () => {
      console.log('Cleaning up Firebase turn subscription');
      unsubscribe();
      clearInterval(interval);
    };
  }, [pokerContract, account, tableId]);

  // Update the betting controls render
  const renderBettingControls = () => {
    const isMyTurn = currentTurn?.toLowerCase() === account?.toLowerCase();
    
    // Debug log for betting controls
    console.log('Betting Controls State:', { 
      isMyTurn, 
      currentTurn,
      account,
      currentBet,
      gamePhase: gameState.gamePhase,
      pot: gameState.pot
    });
    
    // For testing purposes, enable all buttons
    return (
      <div className="betting-controls">
        <button 
          onClick={() => handleAction('fold')}
          className="action-button"
        >
          Fold (Testing)
        </button>
        
        <button 
          onClick={() => handleAction('check')}
          className="action-button"
        >
          Check (Testing)
        </button>
        
        <button 
          onClick={() => handleAction('call')}
          className="action-button"
        >
          Call {currentBet} AVAX (Testing)
        </button>
        
        <div className="raise-controls">
          <input
            type="text"
            value={raiseAmount}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d.]/g, '');
              setRaiseAmount(value);
            }}
            step="0.001"
          />
          <button 
            onClick={() => handleAction('raise', raiseAmount)}
          >
            Raise to {raiseAmount} AVAX (Testing)
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
      if (!pokerContract || !tableId || !hasJoined) return;

      try {
        const [tableInfo, playerInfo] = await Promise.all([
          pokerContract.getTableInfo(tableId),
          pokerContract.getPlayerInfo(tableId, account)
        ]);

        // Check if all active players have acted and matched the current bet
        let allPlayersActed = true;
        let activeCount = 0;
        const targetBet = tableInfo.currentBet ? ethers.formatEther(tableInfo.currentBet) : '0';

        const playerAddresses = await pokerContract.getTablePlayers(tableId);
        for (const playerAddr of playerAddresses) {
          const player = await pokerContract.getPlayerInfo(tableId, playerAddr);
          if (player.isActive) {
            activeCount++;
            const playerBet = player.currentBet ? ethers.formatEther(player.currentBet) : '0';
            if (!player.hasActed || playerBet !== targetBet) {
              allPlayersActed = false;
              break;
            }
          }
        }

        setIsBettingRoundComplete(allPlayersActed && activeCount >= 2);
      } catch (err) {
        console.error('Error checking betting round:', err);
      }
    };

    checkBettingRound();
    const interval = setInterval(checkBettingRound, 3000);
    return () => clearInterval(interval);
  }, [pokerContract, tableId, hasJoined, account]);

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

  const handleLeaveClick = () => {
    setShowLeaveWarning(true);
  };

  const confirmLeave = async () => {
    try {
      setShowLeaveWarning(false);
      setIsLeavingTable(true);
      
      await leavePokerTable(tableId);
      
      toast.success('Successfully left the table!');
      setHasJoined(false);
      navigate('/poker');
    } catch (err) {
      console.error('Error leaving table:', err);
      toast.error('Failed to leave table: ' + err.message);
    } finally {
      setIsLeavingTable(false);
    }
  };

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
          <div className="left-container">
            <div className="table-info">
              <h2>{tableName || `Poker Table #${tableId}`}</h2>
              <p>Game Phase: {gameState.gamePhase}</p>
              <p className="pot-amount">Pot: {gameState.pot} AVAX</p>
              <p>Players: {gameState.playerCount}/6</p>
            </div>

            <div className="last-hand-container">
              <h3>Last Hand</h3>
              {lastWinner ? (
                <div className="last-hand-info">
                  <p className="winner-address">
                    Winner: {lastWinner.displayName || formatAddress(lastWinner.address)}
                  </p>
                  <p className="hand-rank">
                    Hand: <span className="rank">{lastWinner.handRank || 'None'}</span>
                  </p>
                  <p className="pot-won">
                    Won: <span className="amount">{lastWinner.potAmount} AVAX</span>
                  </p>
                </div>
              ) : (
                <p>None</p>
              )}
            </div>

            <div className="chat-box">
              <div className="chat-title">Table Chat</div>
              <div className="chat-messages">
                <div className="chat-message">
                  <span className="sender">Player1:</span>
                  Nice hand!
                </div>
                <div className="chat-message">
                  <span className="sender">Player2:</span>
                  Good game everyone
                </div>
                <div className="chat-message">
                  <span className="sender">Player3:</span>
                  All in next hand 😎
                </div>
              </div>
              <div className="chat-input">
                <input type="text" placeholder="Type a message..." />
                <button>Send</button>
              </div>
            </div>
          </div>

          <div className="right-container">
            <div className="game-area">
              <div className="poker-table">
                <img src={tableBackground} alt="Table Background" className="table-background" />
                
                <div className="player-positions">
                  {Array.from({ length: maxPlayersPerTable }).map((_, i) => {
                    const player = players.find(p => p.position === i);
                    
                    // More robust current turn checking
                    const isCurrentTurn = player && currentTurn && 
                      player.address?.toLowerCase() === currentTurn.toLowerCase();
                    
                    // Add debug output for turn indicators
                    console.log(`Player position ${i}:`, { 
                      player: player?.address?.slice(0, 8) + '...',
                      isCurrentTurn,
                      currentTurn: currentTurn?.slice(0, 8) + '...',
                      displayName: player?.displayName
                    });
                    
                    return (
                      <div 
                        key={i} 
                        className={`player-position position-${i} ${isCurrentTurn ? 'current-turn' : ''}`}
                        data-is-current-turn={isCurrentTurn ? 'true' : 'false'}
                      >
                        {isCurrentTurn && (
                          <div className="turn-indicator">
                            Current Turn
                          </div>
                        )}
                        <div className="player-info">
                          <h3>{player ? player.displayName : `Seat ${i + 1}`}</h3>
                          {player && (
                            <>
                              <p className="player-stack">Stack: {player.tableStake} AVAX</p>
                              <p className="player-bet">Bet: {player.currentBet} AVAX</p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="card-display">
                  <div className="community-cards">
                    {communityCards.length === 0 ? (
                      <p>No table cards yet</p>
                    ) : (
                      communityCards.map((card, index) => {
                        const { value, suit, color } = cardValueToString(card);
                        return (
                          <div 
                            key={index} 
                            className={`card ${dealtCards.community.includes(index) ? 'dealt' : ''}`}
                            style={{ color }}
                          >
                            <div className="logo-top"></div>
                            <div className="logo-bottom"></div>
                            {value}{suit}
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  <div className="player-cards">
                    <h3>Your Cards:</h3>
                    {playerCards.length === 0 ? (
                      <p>No player cards yet</p>
                    ) : (
                      playerCards.map((card, index) => {
                        const { value, suit, color } = cardValueToString(card);
                        return (
                          <div 
                            key={index} 
                            className={`card ${dealtCards.player.includes(index) ? 'dealt' : ''}`}
                            style={{ color }}
                          >
                            <div className="logo-top"></div>
                            <div className="logo-bottom"></div>
                            {value}{suit}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="poker-game-controls">
              <div className="action-buttons">
                <button 
                  className="call-button" 
                  onClick={() => handleAction('call')}
                >
                  <MdKeyboardDoubleArrowUp />
                  <span>Call (Testing)</span>
                </button>
                <button 
                  className="check-button" 
                  onClick={() => handleAction('check')}
                >
                  <MdKeyboardDoubleArrowRight />
                  <span>Check (Testing)</span>
                </button>
                <button 
                  className="fold-button" 
                  onClick={() => handleAction('fold')}
                >
                  <MdKeyboardDoubleArrowDown />
                  <span>Fold (Testing)</span>
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
                  >
                    Raise to {raiseAmount || '0'} AVAX (Testing)
                  </button>
                </div>
              </div>
              
              <div className="table-control-buttons">
                <button 
                  className={`leave-table-button ${isLeavingTable ? 'loading' : ''}`}
                  onClick={handleLeaveClick}
                  disabled={isLeavingTable}
                >
                  {isLeavingTable ? 'Leaving...' : 'Leave Table'}
                </button>
              </div>
            </div>
        </div>
        
        <LeaveWarningModal
          isOpen={showLeaveWarning}
          onConfirm={confirmLeave}
          onCancel={() => setShowLeaveWarning(false)}
        />
        
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
      </>
    );
  }

  // Show buy-in form if not joined
  return (
    <div className="poker-container">
      <h2>Join {tableName || `Poker Table #${tableId}`}</h2>
      <div className="table-info">
        <p>Buy-in Range: {table.minBuyIn} - {table.maxBuyIn} AVAX</p>
        <p>Blinds: {table.smallBlind}/{table.bigBlind} AVAX</p>
        <p>Players: {table.playerCount}/6</p>
      </div>
      
      <div className="balance-info">
        <p>Your Treasury Balance: <strong>{treasuryBalance} AVAX</strong></p>
      </div>
      
      <form onSubmit={handleJoinTable} className="join-form">
        <div className="form-group">
          <label>Buy-in Amount (AVAX)</label>
          <input
            type="number"
            step="0.01"
            value={buyInAmount}
            onChange={(e) => setBuyInAmount(e.target.value)}
            placeholder={`Enter amount (${table.minBuyIn} - ${table.maxBuyIn})`}
            min={table.minBuyIn}
            max={table.maxBuyIn}
            required
            disabled={isJoining}
          />
        </div>
        <button type="submit" disabled={isJoining || parseFloat(treasuryBalance) <= 0}>
          {isJoining ? 'Joining...' : 'Join Table'}
        </button>
        {parseFloat(treasuryBalance) <= 0 && (
          <p className="balance-warning">You need to deposit funds to join this table</p>
        )}
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
