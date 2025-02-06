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
        
        while (true) {
          try {
            console.log('Fetching table', i);
            const table = await pokerContract.tables(i);
            console.log('Table data:', table);
            
            // Check if the table exists and is properly initialized
            if (!table || !table.isActive) {
              console.log('No more tables or inactive table found at index', i);
              break;
            }
            
            tables.push({
              id: i,
              minBuyIn: ethers.formatEther(table.minBuyIn),
              maxBuyIn: ethers.formatEther(table.maxBuyIn),
              smallBlind: ethers.formatEther(table.smallBlind),
              bigBlind: ethers.formatEther(table.bigBlind),
              playerCount: table.playerCount.toString(),
              maxPlayers: 6,
              isActive: table.isActive
            });
            
            i++;
          } catch (err) {
            console.log('Error fetching table', i, ':', err);
            break;
          }
        }

        console.log('Found tables:', tables);
        setTables(tables);
      } catch (err) {
        console.error('Error in main fetch loop:', err);
        setError(err.message);
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
            {tables.map(table => (
              <div key={table.id} className="table-card">
                <h3>{tableNames[table.id] || `Table #${table.id}`}</h3>
                <div className="table-info">
                  <p>Buy-in Range: {table.minBuyIn} - {table.maxBuyIn}</p>
                  <p>Blinds: {table.smallBlind}/{table.bigBlind}</p>
                  <p>Players: {table.playerCount}/{table.maxPlayers}</p>
                </div>
                <button onClick={() => navigate(`/poker/table/${table.id}`)}>
                  Join Table
                </button>
              </div>
            ))}
          </div>

          {error && <div className="error-message">Error: {error}</div>}
          <ToastContainer />
        </div>
      )}
    </div>
  );
}

export default PokerLobby;
