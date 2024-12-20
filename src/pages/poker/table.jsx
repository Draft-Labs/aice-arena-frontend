import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/Poker.css';

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
      const [tableState, playerState] = await Promise.all([
        pokerContract.getTableState(tableId),
        pokerContract.getPlayerState(tableId, account)
      ]);

      setGameState({
        pot: ethers.formatEther(tableState.pot),
        currentBet: ethers.formatEther(tableState.currentBet),
        isPlayerTurn: playerState.isCurrentPlayer,
        canCheck: tableState.currentBet === 0,
        minRaise: ethers.formatEther(tableState.minRaise),
        maxRaise: ethers.formatEther(tableState.maxRaise)
      });

      // Update raise amount to min raise if it's not set
      if (raiseAmount === '0') {
        setRaiseAmount(ethers.formatEther(tableState.minRaise));
      }
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

  // Function to update all game information
  const updateGameInfo = async () => {
    if (!pokerContract || !tableId) return;

    try {
      // Get table info
      const tableInfo = await pokerContract.getTableInfo(tableId);
      setGameState({
        pot: ethers.formatEther(tableInfo.pot),
        gamePhase: getGamePhaseString(tableInfo.gameState),
        playerCount: tableInfo.playerCount.toString(),
        minBet: ethers.formatEther(tableInfo.minBet),
        maxBet: ethers.formatEther(tableInfo.maxBet)
      });

      // Get all players at the table
      const activePlayers = [];
      for (let i = 0; i < tableInfo.playerCount; i++) {
        const playerAddr = await pokerContract.getPlayerAtPosition(tableId, i);
        if (playerAddr !== ethers.ZeroAddress) {
          const playerInfo = await pokerContract.getPlayerInfo(tableId, playerAddr);
          activePlayers.push({
            address: playerAddr,
            position: playerInfo.position,
            stack: ethers.formatEther(playerInfo.tableStake),
            currentBet: ethers.formatEther(playerInfo.currentBet),
            isActive: playerInfo.isActive,
            isCurrent: playerInfo.position === tableInfo.currentPosition
          });
        }
      }
      setPlayers(activePlayers);
    } catch (err) {
      console.error('Error updating game info:', err);
    }
  };

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
        <h2>Poker Table #{tableId}</h2>
        <div className="poker-table">
          <div className="table-info">
            <p>Game Phase: {gameState.gamePhase}</p>
            <p className="pot-amount">Pot: {gameState.pot} ETH</p>
            <p>Players: {gameState.playerCount}/6</p>
          </div>

          <div className="player-positions">
            {[...Array(6)].map((_, index) => {
              const player = players.find(p => p.position === index);
              return (
                <div 
                  key={index} 
                  className={`player-position position-${index} ${
                    player?.isActive ? 'active' : ''
                  } ${player?.isCurrent ? 'current-turn' : ''}`}
                >
                  <div className="player-info">
                    <p className="player-name">
                      {player ? `Player ${player.address.slice(0, 6)}...` : `Seat ${index + 1}`}
                    </p>
                    {player && (
                      <>
                        <p className="player-stack">Stack: {player.stack} ETH</p>
                        {player.currentBet > 0 && (
                          <p className="player-bet">Bet: {player.currentBet} ETH</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
                  type="range" 
                  min={gameState.minRaise}
                  max={gameState.maxRaise}
                  step="0.001"
                  value={raiseAmount}
                  onChange={(e) => setRaiseAmount(e.target.value)}
                  disabled={!gameState.isPlayerTurn}
                />
                <button 
                  className="raise-button" 
                  onClick={() => handleAction('raise', raiseAmount)}
                  disabled={!gameState.isPlayerTurn}
                >
                  Raise to {raiseAmount} ETH
                </button>
              </div>
            </div>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Show buy-in form if not joined
  return (
    <div className="poker-container">
      <h2>Join Poker Table #{tableId}</h2>
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
