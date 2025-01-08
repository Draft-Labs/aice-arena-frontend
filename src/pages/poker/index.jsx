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
  const { account, pokerTableContract, pokerTreasuryContract, isLoading, error: web3Error } = useWeb3();
  const { checkTreasuryAccount } = useContractInteraction();
  const [tables, setTables] = useState([]);
  const [error, setError] = useState(null);
  const [hasAccount, setHasAccount] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(true);
  const navigate = useNavigate();
  const [tableNames, setTableNames] = useState({});

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
      if (!pokerTableContract) {
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
            const tableInfo = await pokerTableContract.getTableInfo(i);
            console.log('Table data:', tableInfo);
            
            // Check if the table exists (minBuyIn > 0 indicates an active table)
            if (tableInfo.minBuyIn === 0n) {
              console.log('No more tables found at index', i);
              break;
            }
            
            tables.push({
              id: i,
              minBuyIn: ethers.formatEther(tableInfo.minBuyIn),
              maxBuyIn: ethers.formatEther(tableInfo.maxBuyIn),
              smallBlind: ethers.formatEther(tableInfo.smallBlind),
              bigBlind: ethers.formatEther(tableInfo.bigBlind),
              playerCount: tableInfo.playerCount.toString(),
              maxPlayers: 6,
              isActive: true
            });
            
            i++;
          } catch (err) {
            console.log('Error fetching table', i, ':', err);
            // If we get an error for index 0, there are no tables yet
            if (i === 0) {
              console.log('No tables exist yet');
              setTables([]);
            }
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
  }, [pokerTableContract]);

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

  if (isCheckingAccount) {
    return <div>Loading...</div>;
  }

  if (!hasAccount && !isCheckingAccount) {
    navigate('/account');
    return null;
  }

  return (
    <div className="poker-container">
      <h1>Poker Tables</h1>

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
              <p>Buy-in Range: {table.minBuyIn} - {table.maxBuyIn} ETH</p>
              <p>Blinds: {table.smallBlind}/{table.bigBlind} ETH</p>
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
  );
}

export default PokerLobby;
