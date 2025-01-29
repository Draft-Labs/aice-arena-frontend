import { useState, useEffect, useCallback } from 'react';
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
import tableBackground from '../../assets/table.svg';

function PokerTable() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { account, pokerContract, treasuryContract, signer, provider } = useWeb3();
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
    if (!pokerContract || !account) {
      console.log('Skipping event setup - missing dependencies:', { 
        hasContract: !!pokerContract, 
        hasAccount: !!account 
      });
      return;
    }

    console.log('Setting up poker event listeners');

    const turnStartedFilter = pokerContract.filters.TurnStarted();
    const turnEndedFilter = pokerContract.filters.TurnEnded();
    const roundCompleteFilter = pokerContract.filters.RoundComplete();
    const handWinnerFilter = pokerContract.filters.HandWinner();

    console.log('Created event filters:', {
      turnStartedFilter,
      turnEndedFilter,
      roundCompleteFilter,
      handWinnerFilter
    });

    const handleTurnStarted = (tableId, player) => {
      console.log('Turn started:', { tableId, player });
      setCurrentTurn(player);
    };

    const handleTurnEnded = (tableId, player, action) => {
      console.log('Turn ended:', { tableId, player, action });
    };

    const handleRoundComplete = (tableId) => {
      console.log('Round complete:', tableId);
    };

    const handleHandWinner = async (tableId, winner, handRank, potAmount) => {
      console.log('=== HandWinner Event Received ===');
      
      // Extract event data from the tableId parameter which contains the full event
      const eventData = tableId?.args;
      if (!eventData) {
        console.error('No event data received');
        return;
      }
      
      console.log('Parsed event data:', {
        tableId: Number(eventData[0]),
        winner: eventData[1],
        handRank: Number(eventData[2]),
        potAmount: eventData[3]
      });
      
      try {
        // Get winner's display name using the correct winner address
        console.log('Fetching display name for winner:', eventData[1]);
        const displayName = await getPlayerDisplayName(eventData[1]);
        console.log('Got display name:', displayName);
        
        // Convert hand rank number to string
        const handRanks = [
          'High Card', 'Pair', 'Two Pair', 'Three of a Kind',
          'Straight', 'Flush', 'Full House', 'Four of a Kind',
          'Straight Flush', 'Royal Flush'
        ];
        
        const handRankNum = Number(eventData[2]);
        console.log('Converting hand rank:', { 
          original: eventData[2],
          asNumber: handRankNum,
          available: handRanks
        });
        
        const handRankString = handRanks[handRankNum];
        console.log('Converted to hand rank string:', handRankString);
        
        // Update last winner state
        const winnerState = {
          address: eventData[1],
          displayName,
          handRank: handRankString,
          potAmount: ethers.formatEther(eventData[3])
        };
        console.log('Setting last winner state:', winnerState);
        setLastWinner(winnerState);
        
        // Show toast notification
        const toastMessage = `${displayName} won with ${handRankString}!`;
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
        console.log('Toast notification sent');
        
      } catch (error) {
        console.error('Error handling HandWinner event:', error);
        console.error('Error details:', {
          error,
          stack: error.stack,
          eventData: eventData ? {
            tableId: Number(eventData[0]),
            winner: eventData[1],
            handRank: Number(eventData[2]),
            potAmount: eventData[3]?.toString()
          } : 'No event data'
        });
      }
      console.log('=== HandWinner Event Processing Complete ===');
    };

    console.log('Registering event handlers...');
    
    try {
      pokerContract.on(turnStartedFilter, handleTurnStarted);
      pokerContract.on(turnEndedFilter, handleTurnEnded);
      pokerContract.on(roundCompleteFilter, handleRoundComplete);
      pokerContract.on(handWinnerFilter, handleHandWinner);
      console.log('Successfully registered all event handlers');
    } catch (error) {
      console.error('Error registering event handlers:', error);
    }

    return () => {
      console.log('Cleaning up event listeners...');
      try {
        pokerContract.off(turnStartedFilter, handleTurnStarted);
        pokerContract.off(turnEndedFilter, handleTurnEnded);
        pokerContract.off(roundCompleteFilter, handleRoundComplete);
        pokerContract.off(handWinnerFilter, handleHandWinner);
        console.log('Successfully removed all event listeners');
      } catch (error) {
        console.error('Error removing event listeners:', error);
      }
    };
  }, [pokerContract, account]);

  // Add this helper function near the top of your component
  const isActionValid = async (action, tableId, account) => {
    try {
      const table = await pokerContract.tables(tableId);
      const playerInfo = await pokerContract.getPlayerInfo(tableId, account);
      
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
          tx = await pokerContract.fold(tableId, options);
          break;
        case 'check':
          tx = await pokerContract.check(tableId, options);
          break;
        case 'call':
          tx = await pokerContract.call(tableId, options);
          break;
        case 'raise':
          if (parseFloat(amountString) <= parseFloat(currentBet) * 2) {
            toast.error('Raise must be more than double the current bet');
            return;
          }
          tx = await pokerContract.raise(tableId, ethers.parseEther(amountString), options);
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

  // Add game state update function
  const updateGameState = async () => {
    if (!pokerContract || !account || !tableId) return;

    try {
      // Get table info and player info using the correct contract functions
      const [tableInfo, playerInfo] = await Promise.all([
        pokerContract.getTableInfo(tableId),
        pokerContract.getPlayerInfo(tableId, account)
      ]);

      // Fetch cards based on game state
      if (tableInfo.gameState > 0) { // If game has started
        // Fetch player's cards
        const playerCards = await pokerContract.getPlayerCards(tableId, account);
        setPlayerCards(playerCards.map(card => Number(card)));

        // Fetch community cards
        const communityCards = await pokerContract.getCommunityCards(tableId);
        setCommunityCards(communityCards.map(card => Number(card)));
      }

      setGameState({
        pot: ethers.formatEther(tableInfo.pot),
        currentBet: ethers.formatEther(tableInfo.minBet),
        isPlayerTurn: playerInfo.isActive && !playerInfo.isSittingOut,
        canCheck: tableInfo.minBet === 0n,
        minRaise: ethers.formatEther(tableInfo.minBet),
        maxRaise: ethers.formatEther(tableInfo.maxBet),
        gamePhase: getGamePhaseString(tableInfo.gameState),
        playerCount: tableInfo.playerCount.toString()
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
  }, [hasJoined, pokerContract, account, tableId]);

  // Fetch table details
  useEffect(() => {
    const fetchTable = async () => {
      if (!pokerContract || !tableId) return;

      try {
        const tableData = await pokerContract.tables(tableId);
        setTable({
          minBuyIn: ethers.formatEther(tableData.minBuyIn),
          maxBuyIn: ethers.formatEther(tableData.maxBuyIn),
          smallBlind: ethers.formatEther(tableData.smallBlind),
          bigBlind: ethers.formatEther(tableData.bigBlind),
          playerCount: tableData.playerCount,
          isActive: tableData.isActive
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
      const tableInfo = await pokerContract.getTableInfo(tableId);
      
      // Get current player's info if they're at the table
      let playerInfo = null;
      try {
        playerInfo = await pokerContract.getPlayerInfo(tableId, account);
      } catch (err) {
        console.log('Current player not at table');
      }

      setGameInfo({
        pot: ethers.formatEther(tableInfo.pot || '0'),
        currentBet: playerInfo ? ethers.formatEther(playerInfo.currentBet) : '0',
        isPlayerTurn: playerInfo ? playerInfo.isActive && tableInfo.currentPosition === playerInfo.position : false,
        canCheck: playerInfo ? playerInfo.currentBet >= tableInfo.currentBet : false,
        minRaise: ethers.formatEther(tableInfo.minBet || '0'),
        maxRaise: ethers.formatEther(tableInfo.maxBet || '0'),
        gameState: getGameStateString(tableInfo.gameState)
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

  // Update the useEffect that fetches table data to include player names
  useEffect(() => {
    const fetchTableData = async () => {
      if (tableId && pokerContract) {
        try {
          // Get table info first
          const [
            minBuyIn,
            maxBuyIn,
            smallBlind,
            bigBlind,
            minBet,
            maxBet,
            pot,
            playerCount,
            gameState,
            isActive
          ] = await pokerContract.getTableInfo(tableId);

          console.log('Table Info:', {
            playerCount: playerCount.toString(),
            pot: ethers.formatEther(pot),
            gameState: gameState.toString()
          });

          // Get table struct directly
          const table = await pokerContract.tables(tableId);
          console.log('Raw Table Data:', table);

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

          setPlayers(activePlayers);
          setPlayerUsernames(
            Object.fromEntries(
              activePlayers.map(p => [p.position, p.displayName])
            )
          );

          setTable({
            minBuyIn: ethers.formatEther(minBuyIn),
            maxBuyIn: ethers.formatEther(maxBuyIn),
            smallBlind: ethers.formatEther(smallBlind),
            bigBlind: ethers.formatEther(bigBlind),
            minBet: ethers.formatEther(minBet),
            maxBet: ethers.formatEther(maxBet),
            pot: ethers.formatEther(pot),
            playerCount: playerCount.toString(),
            gameState: gameState.toString(),
            isActive
          });

          setGameInfo({
            pot: ethers.formatEther(pot),
            currentBet: activePlayers.find(p => p.address === account)?.currentBet || '0',
            isPlayerTurn: false,
            canCheck: false,
            minRaise: ethers.formatEther(minBet),
            maxRaise: ethers.formatEther(maxBet),
            gameState: getGameStateString(gameState)
          });

        } catch (err) {
          console.error('Error fetching table data:', err);
          setError(err.message);
        }
      }
    };

    fetchTableData();
    const interval = setInterval(fetchTableData, 5000);
    return () => clearInterval(interval);
  }, [tableId, pokerContract, account]);

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

      // Then check treasury balance
      const treasuryBalance = await treasuryContract.getPlayerBalance(account);
      console.log('Debug treasury values:', {
        treasuryBalanceWei: treasuryBalance.toString(),
        treasuryBalanceEth: ethers.formatEther(treasuryBalance),
        buyInWei: buyInWei.toString(),
        buyInEth: buyInAmount
      });

      if (treasuryBalance < buyInWei) {
        const needed = ethers.formatEther(buyInWei - treasuryBalance);
        toast.error(`Insufficient treasury balance. Please deposit at least ${needed} ETH to your account.`);
        return;
      }

      console.log('Join table parameters:', {
        tableId: tableIdNumber,
        buyInAmount: buyInWei.toString(),
        contractAddress: await pokerContract.getAddress(),
        treasuryBalance: treasuryBalance.toString()
      });

      const tx = await pokerContract.joinTable(
        tableIdNumber,
        buyInWei,
        {
          gasLimit: 500000
        }
      );

      console.log('Transaction sent:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');
      
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
    const color = suit === '♥' || suit === '♦' ? 'red' : 'black';
    
    return { value, suit, color };
  };

  // Update the useEffect for fetching cards with console logs
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
        }
        if (communityData.success) {
          console.log('Setting community cards:', communityData.cards);
          setCommunityCards(communityData.cards);
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
    const checkTurn = async () => {
      if (!pokerContract || !account || !tableId) return;
      
      try {
        const [table, playerInfo, players] = await Promise.all([
          pokerContract.tables(tableId),
          pokerContract.getPlayerInfo(tableId, account),
          pokerContract.getTablePlayers(tableId)
        ]);
        
        const currentPlayerAddress = players[table.currentPosition];
        
        console.log('Turn check:', {
          currentPosition: table.currentPosition.toString(),
          playerPosition: playerInfo.position.toString(),
          currentPlayerAddress,
          myAddress: account,
          isMyTurn: currentPlayerAddress?.toLowerCase() === account?.toLowerCase()
        });

        // Only set currentTurn if we have a valid address
        if (currentPlayerAddress && currentPlayerAddress !== ethers.ZeroAddress) {
          setCurrentTurn(currentPlayerAddress);
        } else {
          setCurrentTurn(null);
        }
      } catch (err) {
        console.error('Error checking turn:', err);
        setCurrentTurn(null);
      }
    };

    checkTurn();
    const interval = setInterval(checkTurn, 3000);
    return () => clearInterval(interval);
  }, [pokerContract, account, tableId]);

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

  const handleLeaveTable = useCallback(async () => {
    try {
      setIsLeavingTable(true);
      
      // Add gas limit to transaction
      const tx = await pokerContract.leaveTable(tableId, {
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
  }, [tableId, pokerContract, navigate]);

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

  // Add this new state variable
  const [isHouseAdded, setIsHouseAdded] = useState(false);

  // Add state for house address
  const [houseAddress, setHouseAddress] = useState(null);

  // Update the handleAddHouse function
  const handleAddHouse = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/poker/add-house`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tableId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add house');
      }

      const data = await response.json();
      console.log('House added successfully:', data);
      setHouseAddress(data.houseAddress);
      setIsHouseAdded(true);
      toast.success('House added successfully');
      
      // Refresh table state
      await updateGameState();
    } catch (err) {
      console.error('Error adding house:', err);
      toast.error(err.message || 'Failed to add house');
    }
  };

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

            <button 
              className="add-house-button"
              onClick={handleAddHouse}
              disabled={isHouseAdded || players.some(p => p.address?.toLowerCase() === houseAddress?.toLowerCase())}
            >
              {isHouseAdded ? 'House Added' : 'Add House'}
            </button>
          </div>
          <div className="poker-table">
            <img src={tableBackground} alt="Table Background" className="table-background" />

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
                {communityCards.length === 0 ? (
                  <p>No table cards yet</p>
                ) : (
                  communityCards.map((card, index) => {
                    const { value, suit, color } = cardValueToString(card);
                    return (
                      <div key={index} className="card" style={{ color }}>
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
                      <div key={index} className="card" style={{ color }}>
                        {value}{suit}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="poker-game-controls">
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
