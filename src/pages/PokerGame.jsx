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
    e.preventDefault();
    
    try {
      if (!pokerContract || !account) {
        toast.error('Please connect your wallet first');
        return;
      }

      if (!validateBuyIn(buyInAmount)) {
        return;
      }

      setIsJoining(true);
      console.log('Joining table with amount:', buyInAmount);

      const buyInWei = ethers.parseEther(buyInAmount);
      console.log('Buy-in in Wei:', buyInWei.toString());
      
      const txOptions = {
        from: account,
        value: buyInWei,
        gasLimit: ethers.toBigInt(500000)
      };

      console.log('Transaction options:', txOptions);
      
      const tx = await pokerContract.joinTable(
        Number(tableId),
        txOptions
      );

      toast.info('Transaction submitted. Waiting for confirmation...', {
        position: "bottom-right",
        autoClose: 5000,
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      toast.success('Successfully joined table!', {
        position: "bottom-right",
        autoClose: 5000,
      });

      // Refresh table details
      await fetchTableDetails();
    } catch (error) {
      console.error('Error joining table:', error);
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        data: error.data
      });
      
      let errorMessage = 'Failed to join table';
      
      // Extract error message from contract revert
      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, {
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
