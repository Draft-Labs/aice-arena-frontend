import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/PokerGame.css';

function PokerGame() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { account, pokerContract, isLoading } = useWeb3();
  const [table, setTable] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    if (!account) {
      navigate('/poker');
      toast.error('Please connect your wallet first');
      return;
    }
    fetchTableDetails();
    checkPlayerStatus();
  }, [account, pokerContract, tableId]);

  const checkPlayerStatus = async () => {
    try {
      if (!pokerContract || !account) return;
      const playerInfo = await pokerContract.getPlayerInfo(tableId, account);
      setHasJoined(playerInfo.isActive);
      if (playerInfo.isActive) {
        await fetchGameState();
      }
    } catch (error) {
      console.error('Error checking player status:', error);
    }
  };

  const fetchGameState = async () => {
    try {
      if (!pokerContract || !account) return;
      const state = await pokerContract.getGameState(tableId);
      setGameState(state);
    } catch (error) {
      console.error('Error fetching game state:', error);
    }
  };

  const fetchTableDetails = async () => {
    try {
      if (!pokerContract) return;
      
      console.log('Fetching table details for table:', tableId);
      const tableInfo = await pokerContract.tables(tableId);
      console.log('Table info:', tableInfo);

      setTable({
        minBuyIn: ethers.formatEther(tableInfo.minBuyIn),
        maxBuyIn: ethers.formatEther(tableInfo.maxBuyIn),
        smallBlind: ethers.formatEther(tableInfo.smallBlind),
        bigBlind: ethers.formatEther(tableInfo.bigBlind),
        playerCount: tableInfo.playerCount.toString(),
        isActive: tableInfo.isActive
      });

      setBuyInAmount(ethers.formatEther(tableInfo.minBuyIn));
    } catch (error) {
      console.error('Error fetching table details:', error);
      toast.error('Error loading table details');
    }
  };

  const validateBuyIn = (amount) => {
    const buyIn = parseFloat(amount);
    const min = parseFloat(table.minBuyIn);
    const max = parseFloat(table.maxBuyIn);

    if (isNaN(buyIn)) {
      toast.error('Please enter a valid amount');
      return false;
    }
    if (buyIn < min) {
      toast.error(`Buy-in must be at least ${min} ETH`);
      return false;
    }
    if (buyIn > max) {
      toast.error(`Buy-in cannot exceed ${max} ETH`);
      return false;
    }
    return true;
  };

  const handleJoinTable = async (e) => {
    if (e) e.preventDefault();
    
    try {
      if (!validateBuyIn(buyInAmount)) {
        return;
      }

      setIsJoining(true);
      
      // Log initial values
      console.log('Join table attempt:', {
        tableId,
        buyInAmount,
        account,
        contractAddress: pokerContract?.target
      });

      // Verify contract is initialized
      if (!pokerContract) {
        throw new Error('Poker contract not initialized');
      }

      // Convert ETH to Wei as BigInt
      const buyInWei = ethers.parseEther(buyInAmount.toString());
      console.log('Value conversion:', {
        original: buyInAmount,
        wei: buyInWei,
        type: typeof buyInWei,
        isBigInt: typeof buyInWei === 'bigint'
      });

      // Log contract state before transaction
      console.log('Contract state:', {
        address: pokerContract.target,
        hasInterface: !!pokerContract.interface,
        hasJoinTable: !!pokerContract.joinTable,
        signer: await pokerContract.runner?.getAddress()
      });

      // Join the table - pass tableId and value directly
      console.log('Sending transaction...');
      const tx = await pokerContract.joinTable(tableId, buyInWei);
      
      console.log('Transaction sent:', {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value?.toString()
      });

      toast.info('Joining table...', {
        position: "bottom-right",
        autoClose: 5000,
      });

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', {
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString()
      });

      toast.success('Successfully joined table!', {
        position: "bottom-right",
        autoClose: 5000,
      });

      await fetchTableDetails();
    } catch (error) {
      console.error('Error joining table:', error);
      console.error('Error context:', {
        errorType: error.constructor.name,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Log contract state during error
      if (pokerContract) {
        try {
          const contractState = {
            address: pokerContract.target,
            hasInterface: !!pokerContract.interface,
            hasJoinTable: !!pokerContract.joinTable,
            signer: await pokerContract.runner?.getAddress()
          };
          console.log('Contract state during error:', contractState);
        } catch (stateError) {
          console.error('Failed to get contract state:', stateError);
        }
      }

      toast.error(`Failed to join table: ${error.message}`, {
        position: "bottom-right",
        autoClose: 5000,
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading || !table) {
    return <div className="poker-game-container">Loading...</div>;
  }

  return (
    <div className="poker-game-container">
      <h1>Poker Table #{tableId}</h1>
      
      {hasJoined ? (
        // Game interface when player has joined
        <div className="poker-game-interface">
          <div className="game-info">
            <h2>Game Status</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Your Stack:</label>
                <span>{gameState?.playerStack || 0} ETH</span>
              </div>
              <div className="info-item">
                <label>Current Pot:</label>
                <span>{gameState?.pot || 0} ETH</span>
              </div>
              <div className="info-item">
                <label>Players:</label>
                <span>{table.playerCount}/6</span>
              </div>
            </div>
          </div>

          <div className="game-actions">
            <h2>Actions</h2>
            {gameState?.isYourTurn && (
              <div className="action-buttons">
                <button className="action-button fold">Fold</button>
                <button className="action-button check">Check</button>
                <button className="action-button call">Call</button>
                <button className="action-button raise">Raise</button>
              </div>
            )}
          </div>

          <div className="game-table">
            {/* Add poker table visualization here */}
          </div>
        </div>
      ) : (
        // Join interface when player hasn't joined
        <>
          <div className="table-details">
            <h2>Table Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Buy-in Range:</label>
                <span>{table.minBuyIn} - {table.maxBuyIn} ETH</span>
              </div>
              <div className="info-item">
                <label>Blinds:</label>
                <span>{table.smallBlind}/{table.bigBlind} ETH</span>
              </div>
              <div className="info-item">
                <label>Players:</label>
                <span>{table.playerCount}/6</span>
              </div>
            </div>
          </div>

          {!isJoining ? (
            <div className="join-form">
              <h2>Join Table</h2>
              <div className="form-group">
                <label>Buy-in Amount (ETH):</label>
                <input
                  type="number"
                  step="0.01"
                  min={table.minBuyIn}
                  max={table.maxBuyIn}
                  value={buyInAmount}
                  onChange={(e) => setBuyInAmount(e.target.value)}
                  required
                />
              </div>
              <button 
                type="button"
                onClick={handleJoinTable}
                className="join-button"
              >
                Join Table
              </button>
            </div>
          ) : (
            <div className="joining-message">
              Joining table...
            </div>
          )}
        </>
      )}

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

export default PokerGame;
