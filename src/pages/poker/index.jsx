import { useState, useEffect } from 'react';
import { useWeb3 } from '../../context/Web3Context';
import { useContractInteraction } from '../../hooks/useContractInteraction';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../styles/Poker.css';
import { getTableName } from '../../config/firebase';

function PokerLobby() {
  const { account, pokerContract, isLoading, error: web3Error, connectWallet } = useWeb3();
  const { checkTreasuryAccount } = useContractInteraction();
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const navigate = useNavigate();
  const [tableNames, setTableNames] = useState({});
  const [players, setPlayers] = useState([]);

  // Check if user has an account
  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        try {
          const accountExists = await checkTreasuryAccount();
          setHasAccount(accountExists);
        } catch (err) {
          console.error('Error checking account:', err);
          setError(err.message);
        }
      }
      setIsCheckingAccount(false);
    };

    checkAccount();
  }, [account, checkTreasuryAccount]);

  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      if (!pokerContract) {
        console.log('No poker contract available');
        return;
      }

      try {
        console.log('Fetching tables...');
        const tables = [];
        let i = 0;
        const maxTables = 10; // Limit the number of tables to check to avoid infinite loop
        
        while (i < maxTables) {
          try {
            console.log('Fetching table', i);
            // Use getTableInfo instead of tables function
            const tableInfo = await pokerContract.getTableInfo(i);
            console.log('Table data:', tableInfo);
            
            // Check if the table exists and is active
            if (!tableInfo || !tableInfo[9]) { // isActive is at index 9
              console.log('Table', i, 'is not active or does not exist');
              i++;
              continue;
            }
            
            // Create a table object with the returned info
            tables.push({
              id: i,
              minBuyIn: ethers.formatEther(tableInfo[0]), // minBuyIn
              maxBuyIn: ethers.formatEther(tableInfo[1]), // maxBuyIn
              smallBlind: ethers.formatEther(tableInfo[2]), // smallBlind
              bigBlind: ethers.formatEther(tableInfo[3]), // bigBlind
              minBet: ethers.formatEther(tableInfo[4]), // minBet
              maxBet: ethers.formatEther(tableInfo[5]), // maxBet
              pot: ethers.formatEther(tableInfo[6]), // pot
              playerCount: Number(tableInfo[7]), // playerCount
              gameState: Number(tableInfo[8]), // gameState
              isActive: tableInfo[9] // isActive
            });
            
          } catch (error) {
            console.error('Error fetching table', i, ':', error);
            // If we get an error, we might be at the end of the tables
            // or the specific table might not exist
            if (error.message.includes('invalid table') || 
                error.message.includes('not exist') ||
                error.message.includes('Out of gas')) {
              console.log('No more tables exist or reached the limit');
              break;
            }
          }
          i++;
        }
        
        console.log('Found tables:', tables);
        setTables(tables);
      } catch (error) {
        console.error('Error fetching tables:', error);
        setError(error.message);
      }
    };

    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, [pokerContract]);

  // Add new useEffect for fetching table names
  useEffect(() => {
    const loadTableNames = async () => {
      try {
        const names = {};
        for (const table of tables) {
          names[table.id] = await getTableName(table.id);
        }
        setTableNames(names);
      } catch (err) {
        console.error('Error loading table names:', err);
      }
    };
    
    if (tables.length > 0) {
      loadTableNames();
    }
  }, [tables]);

  // Add console log for render
  console.log('Current tables state:', tables);

  if (isCheckingAccount) {
    return (
      <div className="poker-container">
        <h1>Poker Tables</h1>
        <div className="loading-container">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="poker-container">
      <h1>Poker Tables</h1>

      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasAccount ? (
        <div className="open-account">
          <p>Please open an account to play Poker</p>
          <button onClick={() => window.location.href = '/account'}>
            Open Account
          </button>
        </div>
      ) : (
        <div>
          <div className="create-table">
            <button onClick={() => navigate('/poker/create')}>
              Create New Table
            </button>
          </div>

          <div className="tables-list">
            {tables.length === 0 ? (
              <div className="no-tables-message">No Active Tables</div>
            ) : (
              tables.map(table => (
                <div key={table.id} className="table-card">
                  <h3>{tableNames[table.id] || `Table #${table.id}`}</h3>
                  <div className="table-info">
                    <p>Buy-in Range: {table.minBuyIn} - {table.maxBuyIn}</p>
                    <p>Blinds: {table.smallBlind}/{table.bigBlind}</p>
                    <p>Players: {table.playerCount}/6</p>
                  </div>
                  <button onClick={() => navigate(`/poker/table/${table.id}`)}>
                    Join Table
                  </button>
                </div>
              ))
            )}
          </div>

          {error && <div className="error-message">Error: {error}</div>}
          <ToastContainer />
        </div>
      )}
    </div>
  );
}

export default PokerLobby;
