import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../../context/Web3Context';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { saveTableName } from '../../config/firebase';
import '../../styles/Poker.css';

function CreatePokerTable() {
  const navigate = useNavigate();
  const { account, pokerContract, connectWallet } = useWeb3();
  const [formData, setFormData] = useState({
    tableName: '',
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
      if (!account) {
        await connectWallet();
        return;
      }

      if (!pokerContract) {
        throw new Error("Poker contract not initialized");
      }

      // Log the form data for debugging
      console.log("Creating table with data:", formData);

      // Submit transaction to create table
      const tx = await pokerContract.createTable(
        ethers.parseEther(formData.minBuyIn),
        ethers.parseEther(formData.maxBuyIn),
        ethers.parseEther(formData.smallBlind),
        ethers.parseEther(formData.bigBlind),
        ethers.parseEther(formData.minBet),
        ethers.parseEther(formData.maxBet)
      );
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be confirmed
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);

      // Extract tableId from logs
      let tableId = null;
      
      // Simple approach: Just check if receipt.logs has entries
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        // Many contracts emit the TableCreated event as the first event
        const log = receipt.logs[0];
        
        try {
          // Try to decode the event manually
          if (log.topics && log.topics.length > 1) {
            // The tableId is likely the first indexed parameter
            // It's in the second topic (index 1) for indexed parameters
            tableId = parseInt(log.topics[1], 16);
            console.log("Extracted tableId from event topic:", tableId);
          } 
          // If we can't extract from topics but there are args
          else if (log.args && log.args.length > 0) {
            tableId = Number(log.args[0]);
            console.log("Extracted tableId from args:", tableId);
          }
          // Some libraries parse the args differently
          else if (log.args && log.args.tableId !== undefined) {
            tableId = Number(log.args.tableId);
            console.log("Extracted tableId from named args:", tableId);
          }
        } catch (decodeError) {
          console.warn("Error extracting tableId from logs:", decodeError);
        }
      }
      
      // If we still don't have a tableId, use a simpler approach - assume it's the latest
      if (tableId === null) {
        try {
          // Get tables count and assume the new table is the last one
          // Different contracts might have different ways to get this
          const tables = await pokerContract.getActiveTables();
          if (tables && tables.length > 0) {
            tableId = Number(tables[tables.length - 1]);
            console.log("Using last active table ID:", tableId);
          } else {
            // If all else fails, just use 0 if this is likely the first table
            tableId = 0;
            console.log("Assuming tableId is 0 as fallback");
          }
        } catch (countError) {
          console.warn("Error getting active tables:", countError);
          // Last resort - this is a naive assumption but gives us something to work with
          tableId = 0;
          console.log("Using default tableId=0 as final fallback");
        }
      }

      // Save table name to Firestore
      const tableName = formData.tableName.trim() || `Table ${tableId}`;
      console.log(`Saving table name "${tableName}" for tableId ${tableId}...`);
      
      try {
        await saveTableName(tableId, tableName);
        console.log("Table name saved successfully");
      } catch (firestoreError) {
        console.error("Error saving to Firestore:", firestoreError);
        // Continue even if Firebase save fails - the table is still created
      }
      
      toast.success('Table created successfully!');
      navigate('/poker');
    } catch (error) {
      console.error('Error creating table:', error);
      toast.error('Failed to create table: ' + error.message);
    }
  };

  return (
    <div className="poker-container">
      <h1>Create New Poker Table</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !pokerContract ? (
        <div className="error-message">
          Error: Unable to connect to poker contract
        </div>
      ) : (
        <form onSubmit={handleCreateTable} className="create-table-form">
          <div className="form-group">
            <label>Table Name</label>
            <input
              type="text"
              name="tableName"
              value={formData.tableName}
              onChange={handleInputChange}
              placeholder="Enter a name for your table"
              required
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>Minimum Buy-in (AVAX)</label>
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
            <label>Maximum Buy-in (AVAX)</label>
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
            <label>Small Blind (AVAX)</label>
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
            <label>Big Blind (AVAX)</label>
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
            <label>Minimum Bet (AVAX)</label>
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
            <label>Maximum Bet (AVAX)</label>
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
      )}
    </div>
  );
}

export default CreatePokerTable;
