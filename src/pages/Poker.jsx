import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ethers } from 'ethers';
import '../styles/Poker.css';

function Poker() {
  const { account, pokerContract, isLoading, error: web3Error, connectWallet } = useWeb3();
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    minBuyIn: '0.1',
    maxBuyIn: '1',
    smallBlind: '0.001',
    bigBlind: '0.002',
    minBet: '0.002',
    maxBet: '1'
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create a new table with form data
  const handleCreateTable = async (e) => {
    e.preventDefault();
    try {
      if (!pokerContract) {
        console.error('Poker contract not initialized');
        return;
      }

      console.log('Validating parameters:', formData);

      // Convert strings to numbers for comparison
      const values = {
        minBuyIn: parseFloat(formData.minBuyIn),
        maxBuyIn: parseFloat(formData.maxBuyIn),
        smallBlind: parseFloat(formData.smallBlind),
        bigBlind: parseFloat(formData.bigBlind),
        minBet: parseFloat(formData.minBet),
        maxBet: parseFloat(formData.maxBet)
      };

      // Validate all rules
      if (values.minBuyIn >= values.maxBuyIn) {
        throw new Error('Minimum buy-in must be less than maximum buy-in');
      }
      if (values.smallBlind >= values.bigBlind) {
        throw new Error('Small blind must be less than big blind');
      }
      if (values.minBet >= values.maxBet) {
        throw new Error('Minimum bet must be less than maximum bet');
      }
      if (values.minBet < values.bigBlind) {
        throw new Error('Minimum bet must be at least equal to the big blind');
      }
      if (values.maxBet > values.maxBuyIn) {
        throw new Error('Maximum bet cannot exceed maximum buy-in');
      }

      console.log('Creating table transaction...');
      const tx = await pokerContract.createTable(
        ethers.parseEther(formData.minBuyIn),
        ethers.parseEther(formData.maxBuyIn),
        ethers.parseEther(formData.smallBlind),
        ethers.parseEther(formData.bigBlind),
        ethers.parseEther(formData.minBet),
        ethers.parseEther(formData.maxBet),
        { gasLimit: 500000 }
      );

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setShowCreateForm(false);
      await fetchTables();
    } catch (err) {
      console.error('Detailed error creating table:', err);
      setError(err.message);
    }
  };

  // Add helper function to update form with valid defaults
  const handleBlindChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Automatically adjust minBet to match bigBlind if needed
      if (name === 'bigBlind' && parseFloat(value) > parseFloat(prev.minBet)) {
        newData.minBet = value;
      }
      
      return newData;
    });
  };

  // Fetch all active tables
  const fetchTables = async () => {
    try {
      if (!pokerContract) return;
      
      const tableCount = await pokerContract.maxTables();
      const activeTables = [];

      for (let i = 0; i < tableCount; i++) {
        const table = await pokerContract.tables(i);
        if (table.isActive) {
          activeTables.push({
            id: i,
            minBuyIn: ethers.formatEther(table.minBuyIn),
            maxBuyIn: ethers.formatEther(table.maxBuyIn),
            smallBlind: ethers.formatEther(table.smallBlind),
            bigBlind: ethers.formatEther(table.bigBlind),
            playerCount: table.playerCount,
            maxPlayers: 6
          });
        }
      }

      setTables(activeTables);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchTables();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [pokerContract]);

  if (isLoading) return <div>Loading...</div>;
  if (web3Error) return <div>Error: {web3Error}</div>;

  return (
    <div className="poker-container">
      <h1>Poker Tables</h1>

      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : (
        <>
          <div className="create-table">
            {!showCreateForm ? (
              <button onClick={() => setShowCreateForm(true)}>Create New Table</button>
            ) : (
              <form onSubmit={handleCreateTable} className="create-table-form">
                <h2>Create New Table</h2>
                <div className="form-group">
                  <label>
                    Minimum Buy-in (ETH):
                    <input
                      type="number"
                      step="0.001"
                      name="minBuyIn"
                      value={formData.minBuyIn}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Maximum Buy-in (ETH):
                    <input
                      type="number"
                      step="0.001"
                      name="maxBuyIn"
                      value={formData.maxBuyIn}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Small Blind (ETH):
                    <input
                      type="number"
                      step="0.001"
                      name="smallBlind"
                      value={formData.smallBlind}
                      onChange={handleBlindChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Big Blind (ETH):
                    <input
                      type="number"
                      step="0.001"
                      name="bigBlind"
                      value={formData.bigBlind}
                      onChange={handleBlindChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Minimum Bet (ETH):
                    <input
                      type="number"
                      step="0.0001"
                      name="minBet"
                      value={formData.minBet}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label>
                    Maximum Bet (ETH):
                    <input
                      type="number"
                      step="0.001"
                      name="maxBet"
                      value={formData.maxBet}
                      onChange={handleInputChange}
                      required
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit">Create Table</button>
                  <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div className="tables-list">
            {tables.map(table => (
              <div key={table.id} className="table-card">
                <h3>Table #{table.id}</h3>
                <div className="table-info">
                  <p>Buy-in: {table.minBuyIn} - {table.maxBuyIn} ETH</p>
                  <p>Blinds: {table.smallBlind}/{table.bigBlind} ETH</p>
                  <p>Players: {table.playerCount}/{table.maxPlayers}</p>
                </div>
                <button onClick={() => console.log('Join table', table.id)}>
                  Join Table
                </button>
              </div>
            ))}
          </div>

          {error && <div className="error-message">Error: {error}</div>}
        </>
      )}
    </div>
  );
}

export default Poker;
