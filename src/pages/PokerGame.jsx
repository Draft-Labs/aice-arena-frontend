import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import '../styles/PokerGame.css';

function PokerGame() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { account, pokerContract, isLoading } = useWeb3();
  const [table, setTable] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!account) {
      navigate('/poker');
      toast.error('Please connect your wallet first');
      return;
    }
    fetchTableDetails();
  }, [account, pokerContract, tableId]);

  const fetchTableDetails = async () => {
    try {
      if (!pokerContract) return;
      
      const tableInfo = await pokerContract.tables(tableId);
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

  const handleJoinTable = async (e) => {
    e.preventDefault();
    setIsJoining(true);
    
    try {
      if (!pokerContract || !account) return;

      const buyInWei = ethers.parseEther(buyInAmount);
      
      const tx = await pokerContract.joinTable(tableId, {
        value: buyInWei,
        gasLimit: 500000
      });

      toast.info('Joining table...', {
        position: "bottom-right",
        autoClose: 5000,
      });

      await tx.wait();
      
      toast.success('Successfully joined table!', {
        position: "bottom-right",
        autoClose: 5000,
      });

      // Refresh table details
      await fetchTableDetails();
    } catch (error) {
      console.error('Error joining table:', error);
      toast.error(`Failed to join table: ${error.message}`);
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
        <form onSubmit={handleJoinTable} className="join-form">
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
          <button type="submit" className="join-button">
            Join Table
          </button>
        </form>
      ) : (
        <div className="joining-message">
          Joining table...
        </div>
      )}
    </div>
  );
}

export default PokerGame;
