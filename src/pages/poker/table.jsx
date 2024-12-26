import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/Poker.css';
import { getTableName } from '../../config/firebase';
import { API_BASE_URL } from '../../config/constants';

function PokerTable() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { account, pokerContract, treasuryContract, signer } = useWeb3();
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

  // Add action handler
  const handleAction = async (action, amount = '0') => {
    try {
      let tx;
      switch (action) {
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
          tx = await pokerContract.raise(tableId, ethers.parseEther(amount));
          break;
        default:
          throw new Error('Invalid action');
      }

      await tx.wait();
      toast.success(`Successfully ${action}ed`);
      
      // Refresh game state after action
      await updateGameState();
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      toast.error(`Failed to ${action}`);
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

  // Update the useEffect for fetching table data
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

          // Get info for each player address
          for (const playerAddress of playerAddresses) {
            try {
              const [tableStake, currentBet, isActive, isSittingOut, position] = 
                await pokerContract.getPlayerInfo(tableId, playerAddress);

              if (isActive) {
                activePlayers.push({
                  address: playerAddress,
                  position: parseInt(position.toString()),
                  tableStake: ethers.formatEther(tableStake),
                  currentBet: ethers.formatEther(currentBet),
                  isActive,
                  isSittingOut,
                  displayName: formatAddress(playerAddress)
                });
              }
            } catch (err) {
              console.error(`Error getting player info for ${playerAddress}:`, err);
            }
          }

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

  const handleShowdown = async () => {
    try {
      console.log('Starting showdown for table:', tableId);
      const tx = await handleGameAction('showdown', tableId);
      
      console.log('Showdown transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Showdown transaction confirmed:', receipt);
      
      // Parse events...
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
      
      // Find HandWinner event
      const handWinnerEvent = events.find(event => event.name === 'HandWinner');
      if (handWinnerEvent) {
        console.log('Found HandWinner event:', handWinnerEvent);
      }
      
      toast.success('Showdown started');
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

  // Add this effect to check if it's player's turn
  useEffect(() => {
    const checkTurn = async () => {
      if (!pokerContract || !account || !tableId) return;
      
      try {
        const [tableInfo, playerInfo] = await Promise.all([
          pokerContract.getTableInfo(tableId),
          pokerContract.getPlayerInfo(tableId, account)
        ]);
        
        setCurrentPosition(tableInfo.currentPosition || 0);
        setCurrentBet(tableInfo.currentBet ? ethers.formatEther(tableInfo.currentBet) : '0');
        setIsPlayerTurn(playerInfo.position === tableInfo.currentPosition);
      } catch (err) {
        console.error('Error checking turn:', err);
      }
    };

    checkTurn();
    const interval = setInterval(checkTurn, 3000);
    return () => clearInterval(interval);
  }, [pokerContract, account, tableId]);

  // Update the betting controls render
  const renderBettingControls = () => {
    if (!isPlayerTurn) return null;

    return (
      <div className="betting-controls">
        <button 
          onClick={() => handleAction('fold')}
          disabled={!isPlayerTurn}
        >
          Fold
        </button>
        
        <button 
          onClick={() => handleAction('call')}
          disabled={!isPlayerTurn || currentBet === '0'}
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
          />
          <button 
            onClick={() => handleAction('raise', raiseAmount)}
            disabled={!isPlayerTurn || raiseAmount < parseFloat(currentBet) * 2}
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
      </div>
    );
  };

  // Add this state near other state declarations
  const [lastWinner, setLastWinner] = useState(null);

  // Update the HandWinner event listener
  useEffect(() => {
    console.log('Event listener effect running with:', {
      hasContract: !!pokerContract,
      contractAddress: pokerContract?.address,
      tableId
    });

    if (!pokerContract) {
      console.log('No poker contract available');
      return;
    }

    console.log('Setting up HandWinner event listener');

    // Create filter for this specific table
    const filter = pokerContract.filters.HandWinner(tableId);
    console.log('Created event filter:', filter);

    const handleHandWinner = (event) => {
      console.log('HandWinner event received:', event);

      // Extract args from the event payload
      const { args } = event;
      const [eventTableId, winner, handRank, potAmount] = [
        args[0],
        args[1],
        args[2],
        args[3]
      ];
      
      console.log('Parsed HandWinner event data:', {
        eventTableId: eventTableId.toString(),
        currentTableId: tableId,
        winner,
        handRank: handRank.toString(),
        potAmount: potAmount.toString()
      });

      // Only handle events for current table
      if (eventTableId.toString() !== tableId) {
        console.log('Event was for different table, ignoring');
        return;
      }

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

      const winnerInfo = {
        address: winner,
        handRank: handRanks[Number(handRank) || 0],
        potAmount: ethers.formatEther(potAmount)
      };

      console.log('Processed winner info:', winnerInfo);
      setLastWinner(winnerInfo);
      
      toast.success(
        `${formatAddress(winner)} won ${ethers.formatEther(potAmount)} ETH with ${handRanks[Number(handRank) || 0]}!`,
        {
          position: "top-center",
          autoClose: 5000
        }
      );
    };

    // Listen for both filtered and unfiltered events to debug
    pokerContract.on(filter, handleHandWinner);
    pokerContract.on('HandWinner', handleHandWinner);

    console.log('HandWinner event listeners registered');

    return () => {
      console.log('Removing HandWinner event listener');
      pokerContract.off(filter, handleHandWinner);
      pokerContract.off('HandWinner', handleHandWinner);
    };
  }, [pokerContract, tableId]);

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
              return (
                <div key={i} className={`player-position position-${i}`}>
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
              disabled={!gameState.isPlayerTurn || !gameState.canCheck}
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
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            required
            disabled={isJoining}
            maxLength={20}
          />
        </div>

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
