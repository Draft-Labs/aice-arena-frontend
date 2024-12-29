import { useState, useEffect } from 'react';
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
      console.log('Table state:', {
        tableId,
        currentPosition: await pokerContract.tables(tableId).then(t => t.currentPosition.toString()),
        playerCount: await pokerContract.tables(tableId).then(t => t.playerCount.toString()),
        gameState: await pokerContract.tables(tableId).then(t => t.gameState.toString())
      });
      
      // Get player info before action
      const playerInfo = await pokerContract.getPlayerInfo(tableId, account);
      console.log('Player info:', {
        position: playerInfo.position.toString(),
        isActive: playerInfo.isActive,
        tableStake: ethers.formatEther(playerInfo.tableStake),
        currentBet: ethers.formatEther(playerInfo.currentBet)
      });
      
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
      
      console.log('Transaction options:', options);
      
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
          if (parseFloat(amount) <= parseFloat(currentBet) * 2) {
            toast.error('Raise must be more than double the current bet');
            return;
          }
          tx = await pokerContract.raise(tableId, ethers.parseEther(amount), options);
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

        // Show toast notification with display name
        toast.success(`${winnerName} won with ${handRanks[handRank]}!`);
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
            type="number"
            value={raiseAmount}
            onChange={(e) => setRaiseAmount(e.target.value)}
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

  // Update the dealer controls render function
  const renderDealerControls = () => {
    if (!isDealer) return null;

    return (
      <div className="dealer-controls">
        {gameState.gamePhase === 'PreFlop' && (
          <button 
            onClick={handleStartFlop}
            disabled={!isBettingRoundComplete}
            className={`dealer-button ${!isBettingRoundComplete ? 'disabled' : ''}`}
          >
            Deal Flop
          </button>
        )}
        {gameState.gamePhase === 'Flop' && (
          <button 
            onClick={handleStartTurn}
            disabled={!isBettingRoundComplete}
            className={`dealer-button ${!isBettingRoundComplete ? 'disabled' : ''}`}
          >
            Deal Turn
          </button>
        )}
        {gameState.gamePhase === 'Turn' && (
          <button 
            onClick={handleStartRiver}
            disabled={!isBettingRoundComplete}
            className={`dealer-button ${!isBettingRoundComplete ? 'disabled' : ''}`}
          >
            Deal River
          </button>
        )}
        {gameState.gamePhase === 'River' && (
          <button 
            onClick={handleShowdown}
            disabled={!isBettingRoundComplete}
            className={`dealer-button ${!isBettingRoundComplete ? 'disabled' : ''}`}
          >
            Start Showdown
          </button>
        )}
        {gameState.gamePhase === 'Complete' && (
          <button 
            onClick={handleStartNewHand}
            className="dealer-button"
          >
            Play Again
          </button>
        )}
      </div>
    );
  };

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

  if (!account) {
    return <div className="poker-container">Please connect your wallet</div>;
  }

  if (!table) {
    return <div className="poker-container">Loading table details...</div>;
  }

  // Render game interface
  if (hasJoined) {
    return (
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

          {/* Add the dealer controls */}
          {isDealer && (
            <div className="dealer-controls">
              {gameState.gamePhase === 'Waiting' && (
                <button 
                  className="start-game-button"
                  onClick={async () => {
                    try {
                      // First deal initial cards
                      await fetch(`${API_BASE_URL}/poker/deal-initial-cards`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ tableId })
                      });
                      
                      // Then start the game
                      await handleAction('startGame');
                      // Post blinds after starting game
                      await handlePostBlinds();
                      updateGameState();
                    } catch (err) {
                      console.error('Error starting game:', err);
                      toast.error('Failed to start game');
                    }
                  }}
                  disabled={Number(gameState.playerCount) < 2}
                >
                  Start Game ({gameState.playerCount}/2 players)
                </button>
              )}
              {gameState.gamePhase === 'PreFlop' && (
                <button 
                  className="start-flop-button"
                  onClick={handleStartFlop}
                >
                  Deal Flop
                </button>
              )}
              {gameState.gamePhase === 'Flop' && (
                <button 
                  className="start-flop-button"
                  onClick={handleStartTurn}
                >
                  Deal Turn
                </button>
              )}
              {gameState.gamePhase === 'Turn' && (
                <button 
                  className="start-flop-button"
                  onClick={handleStartRiver}
                >
                  Deal River
                </button>
              )}
              {gameState.gamePhase === 'River' && (
                <button 
                  className="start-flop-button"
                  onClick={handleShowdown}
                >
                  Start Showdown
                </button>
              )}
            </div>
          )}
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
                type="number"
                value={raiseAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty input, decimals, and partial numbers
                  if (value === '' || value === '.' || value === '0.' || value.match(/^\d*\.?\d*$/)) {
                    setRaiseAmount(value);
                    return;
                  }
                  
                  const numValue = parseFloat(value);
                  if (isNaN(numValue)) {
                    toast.error('Please enter a valid number');
                    return;
                  }
                  
                  // Check for more than 3 decimal places
                  if (value.includes('.') && value.split('.')[1].length > 3) {
                    toast.error('Maximum of 3 decimal places allowed');
                    return;
                  }
                  
                  const minRaise = parseFloat(gameState.minRaise);
                  const maxRaise = parseFloat(gameState.maxRaise);
                  
                  // Only show range error if user has finished typing
                  if (value.length > 0 && !value.endsWith('.') && (numValue < minRaise || numValue > maxRaise)) {
                    toast.error(`Raise amount must be between ${minRaise} and ${maxRaise} ETH`);
                    return;
                  }
                  
                  setRaiseAmount(value);
                }}
                min={gameState.minRaise}
                max={gameState.maxRaise}
                step="0.001"
              />
              <button 
                className="raise-button"
                onClick={() => handleAction('raise', parseFloat(raiseAmount))}
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
