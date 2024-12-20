import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import '../../styles/Poker.css';

function CreatePokerTable() {
  const navigate = useNavigate();
  const { pokerContract } = useWeb3();
  const [formData, setFormData] = useState({
    minBuyIn: '0.1',
    maxBuyIn: '1',
    smallBlind: '0.001',
    bigBlind: '0.002',
    minBet: '0.002',
    maxBet: '1'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      const tx = await pokerContract.createTable(
        ethers.parseEther(formData.minBuyIn),
        ethers.parseEther(formData.maxBuyIn),
        ethers.parseEther(formData.smallBlind),
        ethers.parseEther(formData.bigBlind),
        ethers.parseEther(formData.minBet),
        ethers.parseEther(formData.maxBet)
      );
      await tx.wait();
      toast.success('Table created successfully!');
      navigate('/poker');
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table');
    }
  };

  return (
    <div className="poker-container">
      <h1>Create New Poker Table</h1>
      
      <form onSubmit={handleCreateTable} className="create-table-form">
        <div className="form-group">
          <label>Minimum Buy-in (ETH)</label>
          <input
            type="number"
            name="minBuyIn"
            value={formData.minBuyIn}
            onChange={handleInputChange}
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label>Maximum Buy-in (ETH)</label>
          <input
            type="number"
            name="maxBuyIn"
            value={formData.maxBuyIn}
            onChange={handleInputChange}
            step="0.01"
            required
          />
        </div>

        <div className="form-group">
          <label>Small Blind (ETH)</label>
          <input
            type="number"
            name="smallBlind"
            value={formData.smallBlind}
            onChange={handleInputChange}
            step="0.001"
            required
          />
        </div>

        <div className="form-group">
          <label>Big Blind (ETH)</label>
          <input
            type="number"
            name="bigBlind"
            value={formData.bigBlind}
            onChange={handleInputChange}
            step="0.001"
            required
          />
        </div>

        <div className="form-group">
          <label>Minimum Bet (ETH)</label>
          <input
            type="number"
            name="minBet"
            value={formData.minBet}
            onChange={handleInputChange}
            step="0.001"
            required
          />
        </div>

        <div className="form-group">
          <label>Maximum Bet (ETH)</label>
          <input
            type="number"
            name="maxBet"
            value={formData.maxBet}
            onChange={handleInputChange}
            step="0.001"
            required
          />
        </div>

        <button type="submit" className="create-button">
          Create Table
        </button>
      </form>
    </div>
  );
}

export default CreatePokerTable;
