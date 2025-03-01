import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import '../styles/Roulette.css';
import { ethers } from 'ethers';

function Roulette() {
  const { 
    account, 
    isLoading, 
    error: web3Error, 
    connectWallet,
    rouletteContract,
    gameResult, // Get gameResult from context
    setGameResult, // Get setGameResult from context to reset it
    resetBetState, // Get the new resetBetState function
    handleSpinWheel, // Get the handleSpinWheel function from context
    checkGameResultForTransaction // Add this line
  } = useWeb3();
  
  const { placeRouletteBet, getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [selectedBetSize, setSelectedBetSize] = useState(0.1);
  const [betInProgress, setBetInProgress] = useState(false);
  const [testingInProgress, setTestingInProgress] = useState(false);
  
  const betSizes = [0.1, 0.5, 1, 5];

  // Define red numbers for visual purposes only
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  // Add a new state for bet history
  const [betHistory, setBetHistory] = useState([]);

  const handleNumberClick = (number) => {
    setSelectedNumbers(prev => {
      return prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number];
    });
  };

  const handleSpecialBet = (type) => {
    let numbers = [];
    switch (type) {
      case 'odd':
        numbers = [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35];
        break;
      case 'even':
        numbers = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36];
        break;
      case '1-18':
        numbers = Array.from({length: 18}, (_, i) => i + 1);
        break;
      case '19-36':
        numbers = Array.from({length: 18}, (_, i) => i + 19);
        break;
      case '1-12':
        numbers = Array.from({length: 12}, (_, i) => i + 1);
        break;
      case '13-24':
        numbers = Array.from({length: 12}, (_, i) => i + 13);
        break;
      case '25-36':
        numbers = Array.from({length: 12}, (_, i) => i + 25);
        break;
      case 'red':
        numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
        break;
      case 'black':
        numbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
        break;
      default:
        return;
    }
    setSelectedNumbers(numbers);
  };

  const handlePlaceBet = async () => {
    try {
      setTransactionError(null);
      // Reset the game result state in the context
      resetBetState();
      // Set bet in progress locally
      setBetInProgress(true);
      
      if (!account) {
        await connectWallet();
        return;
      }

      const isActive = await checkTreasuryAccount();
      if (!isActive) {
        setTransactionError('Please open an account first');
        setBetInProgress(false);
        return;
      }

      if (selectedNumbers.length === 0) {
        throw new Error('Please select at least one number');
      }

      console.log('Placing bet:', {
        selectedNumbers,
        betSize: selectedBetSize,
        totalBetAmount: selectedNumbers.length * selectedBetSize,
        gasLimit: 500000 + (selectedNumbers.length * 100000)
      });

      // Calculate gas limit based on number of bets
      const baseGas = 500000;
      const gasPerNumber = 100000;
      const gasLimit = baseGas + (selectedNumbers.length * gasPerNumber);
      
      const totalBetAmount = selectedBetSize * selectedNumbers.length;
      const success = await placeRouletteBet(selectedNumbers, totalBetAmount.toString(), gasLimit);
      
      if (success) {
        try {
          // After placing bet, call the backend API to spin the wheel
          console.log('Bet placed successfully, requesting backend to spin wheel...');
          
          // Generate a random number between 0 and 36 for the backend to use
          const randomNumber = Math.floor(Math.random() * 37);
          
          // Call the backend API to spin the wheel with the house wallet
          const response = await fetch('http://localhost:3001/resolve-roulette-bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              player: account,
              spinResult: randomNumber, 
              nonce: Date.now()
            })
          });

          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }

          const resultData = await response.json();
          if (!resultData.success) {
            throw new Error(resultData.error || 'Failed to resolve bet');
          }
          
          console.log('Backend spin response:', resultData);
          
          // We'll get the game result from contract events
          // The backend will trigger the spin and events will be emitted
          
          // Clear selected numbers after successful bet
          setSelectedNumbers([]);
        } catch (spinError) {
          console.error("Error with backend spin:", spinError);
          setTransactionError(`Backend error: ${spinError.message}`);
          setBetInProgress(false);
        }
      } else {
        setBetInProgress(false);
        setTransactionError('Failed to place bet. Please try again.');
      }
    } catch (err) {
      console.error("Error placing bet:", err);
      setTransactionError(err.message);
      setBetInProgress(false);
    }
  };

  const handleClearBoard = () => {
    setSelectedNumbers([]);
  };

  const handleNewBet = () => {
    // Reset the game result and bet state
    resetBetState();
  };

  // Update the test function to test backend API
  const testSpin = async () => {
    try {
      // Prevent multiple rapid test clicks
      if (testingInProgress) {
        alert('Test already in progress. Please wait.');
        return;
      }

      setTestingInProgress(true);
      console.log('Testing backend spin API...');
      
      if (!account) {
        console.error('Account not connected');
        alert('Please connect your wallet first');
        setTestingInProgress(false);
        return;
      }
      
      // Generate a random number between 0 and 36 for the backend to use
      const randomNumber = Math.floor(Math.random() * 37);
      console.log(`Test using random number: ${randomNumber}`);
      
      // Generate a unique nonce for this test
      const nonce = Date.now();
      
      // Call the backend API to spin the wheel with the house wallet
      const response = await fetch('http://localhost:3001/resolve-roulette-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: account,
          spinResult: randomNumber, 
          nonce: nonce
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const resultData = await response.json();
      console.log('Backend test response:', resultData);
      
      // For debugging: show transaction hash so we can correlate with events
      if (resultData.txHash) {
        console.log('Transaction hash from backend:', resultData.txHash);
        console.log('Watch for GameResult events with this transaction hash');
        
        // Directly check for the transaction results
        checkGameResultForTransaction(resultData.txHash);
      }
      
      alert(`Spin test sent to backend with number ${randomNumber}.\nCheck console for results.`);
      
    } catch (error) {
      console.error('Test spin failed:', error);
      alert(`Test failed: ${error.message}`);
    } finally {
      // Set a timeout before allowing another test to prevent rapid clicks
      setTimeout(() => {
        setTestingInProgress(false);
      }, 3000);
    }
  };

  // Update the useEffect that reacts to gameResult with a useRef-based solution
  const processedResultRef = useRef(null);
  
  useEffect(() => {
    if (gameResult && gameResult.number !== undefined) {
      setBetInProgress(false);
      
      // Check if this is the same result we've already processed
      if (processedResultRef.current === gameResult.number) {
        return; // Skip if we've already processed this result
      }
      
      console.log("Game result received from context:", gameResult);
      
      // Only process if we have selected numbers
      if (selectedNumbers.length > 0) {
        // Check if the result number is in the selected numbers
        const won = selectedNumbers.includes(gameResult.number);
        
        // If won, calculate payout (36x the bet amount for the winning number)
        const payout = won ? (selectedBetSize * 36).toFixed(2) : "0.0";
        
        console.log(`Player ${won ? 'won' : 'lost'} - Result: ${gameResult.number}, Selected: ${selectedNumbers.join(',')}`);
        
        // Store this result number to avoid processing it again
        processedResultRef.current = gameResult.number;
        
        // Update the game result with win status and payout
        setGameResult(prev => ({
          ...prev,
          won: won,
          payout: payout
        }));
        
        // Add to bet history (with timestamp and selected numbers)
        const historyItem = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          result: gameResult.number,
          selectedNumbers: [...selectedNumbers],
          won: won,
          payout: payout,
          betAmount: (selectedBetSize * selectedNumbers.length).toFixed(2)
        };
        
        // Add new item to start of array and keep only last 3
        setBetHistory(prev => [historyItem, ...prev].slice(0, 3));
      }
    }
  }, [gameResult, selectedNumbers, selectedBetSize, setGameResult]);

  // Reset processedResultRef when starting a new bet
  useEffect(() => {
    if (!gameResult) {
      processedResultRef.current = null;
    }
  }, [gameResult]);

  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        const isActive = await checkTreasuryAccount();
        setHasActiveAccount(isActive);
      }
    };
    checkAccount();
  }, [account, checkTreasuryAccount]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (account) {
        try {
          const balance = await getAccountBalance();
          setCasinoBalance(balance);
        } catch (err) {
          console.error('Error fetching balance:', err);
          // Set a fallback balance or show an error message
          setCasinoBalance('Error fetching balance');
        }
      }
    };

    fetchBalance();
  }, [account, getAccountBalance]);

  if (isLoading) return <div>Loading...</div>;
  if (web3Error) return <div>Error: {web3Error}</div>;

  return (
    <div className="roulette-container">
      <h1>Roulette</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasActiveAccount ? (
        <div className="open-account">
          <p>Please open an account to play Roulette</p>
          <button onClick={() => window.location.href = '/account'}>
            Open Account
          </button>
        </div>
      ) : (
        <div className="game-and-history-container" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '20px',
          width: '100%'
        }}>
          {/* Bet History Section */}
          <div className="bet-history-section" style={{
            width: '300px',
            minWidth: '300px',
            backgroundColor: '#f8f8f8',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ borderBottom: '2px solid #ddd', paddingBottom: '10px', marginBottom: '15px' }}>Bet History</h2>
            
            {gameResult && (
              <div className="latest-result" style={{
                border: `4px solid ${gameResult.won ? '#4CAF50' : '#f44336'}`,
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                backgroundColor: gameResult.won ? '#f0fff0' : '#fff0f0',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                animation: 'fadeIn 0.5s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '18px', margin: '0' }}>Current Result</h3>
                  <div style={{ fontSize: '12px', color: '#666' }}>{new Date().toLocaleTimeString()}</div>
                </div>
                <h2 style={{ fontSize: '24px', margin: '10px 0', color: '#333' }}>
                  Result: {gameResult.number}
                </h2>
                <p style={{ 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  color: gameResult.won ? 'green' : 'red',
                  margin: '10px 0'
                }}>
                  {gameResult.won ? `You won ${gameResult.payout} AVAX!` : 'Better luck next time!'}
                </p>
                <button 
                  onClick={handleNewBet}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '16px'
                  }}
                >
                  New Bet
                </button>
              </div>
            )}
            
            {betHistory.length === 0 && !gameResult ? (
              <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>No betting history yet</p>
            ) : (
              betHistory.map(item => (
                <div key={item.id} className="history-item" style={{
                  border: `3px solid ${item.won ? '#4CAF50' : '#f44336'}`,
                  borderRadius: '8px',
                  padding: '15px',
                  marginBottom: '15px',
                  backgroundColor: item.won ? '#f0fff0' : '#fff0f0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>{item.timestamp}</div>
                  <h3 style={{ fontSize: '18px', margin: '5px 0' }}>Result: {item.result}</h3>
                  <p style={{ fontSize: '14px', margin: '5px 0' }}>Selected: {item.selectedNumbers.join(', ')}</p>
                  <p style={{ fontSize: '14px', margin: '5px 0' }}>Bet: {item.betAmount} AVAX</p>
                  <p style={{ 
                    fontWeight: 'bold', 
                    color: item.won ? 'green' : 'red',
                    margin: '5px 0'
                  }}>
                    {item.won ? `Won ${item.payout} AVAX` : 'Lost'}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* Main Game Container */}
          <div className="game-container" style={{ flex: 1 }}>
            <div className="bet-sizes">
              {betSizes.map(size => (
                <button
                  key={size}
                  className={`bet-size ${selectedBetSize === size ? 'selected' : ''}`}
                  onClick={() => setSelectedBetSize(size)}
                >
                  {size} AVAX
                </button>
              ))}
            </div>

            <div className="current-bet-info">
              <p>Selected Numbers: {selectedNumbers.length > 0 ? selectedNumbers.join(', ') : 'None'}</p>
              <p>Total Bet: {selectedNumbers.length > 0 ? `${(selectedBetSize * selectedNumbers.length).toFixed(2)} AVAX` : 'None'}</p>
              <p>Potential Win (per number): {selectedNumbers.length > 0 ? `${(selectedBetSize * 36).toFixed(2)} AVAX` : 'None'}</p>
            </div>

            <div className="roulette-board">
              <div className="numbers-grid">
                <div 
                  className={`number zero ${selectedNumbers.includes(0) ? 'selected' : ''}`}
                  onClick={() => handleNumberClick(0)}
                >
                  0
                </div>
                {[...Array(36)].map((_, i) => {
                  const number = i + 1;
                  return (
                    <div
                      key={number}
                      className={`number ${
                        selectedNumbers.includes(number) ? 'selected' : ''
                      } ${redNumbers.includes(number) ? 'red' : 'black'}`}
                      onClick={() => handleNumberClick(number)}
                    >
                      {number}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="special-bets">
              <div className="special-bets-grid">
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => n % 2 === 1) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('odd')}
                >
                  Odd Numbers
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => n % 2 === 0) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('even')}
                >
                  Even Numbers
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => n <= 18) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('1-18')}
                >
                  1 to 18
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => n > 18) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('19-36')}
                >
                  19 to 36
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 12 && selectedNumbers.every(n => n <= 12) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('1-12')}
                >
                  1st 12
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 12 && selectedNumbers.every(n => n > 12 && n <= 24) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('13-24')}
                >
                  2nd 12
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 12 && selectedNumbers.every(n => n > 24) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('25-36')}
                >
                  3rd 12
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => redNumbers.includes(n)) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('red')}
                >
                  Red
                </button>
                <button 
                  className={`special-bet-button ${selectedNumbers.length === 18 && selectedNumbers.every(n => !redNumbers.includes(n) && n !== 0) ? 'selected' : ''}`}
                  onClick={() => handleSpecialBet('black')}
                >
                  Black
                </button>
              </div>
            </div>

            <div className="betting-controls">
              <button 
                onClick={handlePlaceBet}
                disabled={selectedNumbers.length === 0 || betInProgress || gameResult}
                style={{
                  backgroundColor: (selectedNumbers.length === 0 || betInProgress || gameResult) ? '#ccc' : '#4CAF50',
                  cursor: (selectedNumbers.length === 0 || betInProgress || gameResult) ? 'not-allowed' : 'pointer'
                }}
              >
                {betInProgress ? 'Bet in Progress...' : 'Place Bet'}
              </button>
              <button 
                onClick={handleClearBoard}
                disabled={selectedNumbers.length === 0 || betInProgress}
              >
                Clear Board
              </button>
              {gameResult && (
                <button 
                  onClick={handleNewBet}
                  style={{
                    backgroundColor: '#4CAF50',
                    marginLeft: '10px'
                  }}
                >
                  New Bet
                </button>
              )}
            </div>

            {betInProgress ? (
              <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px' }}>
                <p style={{ textAlign: 'center', fontWeight: 'bold' }}>Processing your bet...</p>
              </div>
            ) : !gameResult ? (
              <div style={{ margin: '20px 0', padding: '15px', border: '1px dashed #ccc', textAlign: 'center' }}>
                <p>Select numbers and place a bet to play</p>
              </div>
            ) : null}

            {transactionError && (
              <div className="error-message" style={{
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                padding: '15px',
                borderRadius: '4px',
                margin: '20px 0',
                border: '1px solid #ef9a9a',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                <div style={{ marginBottom: '5px' }}>⚠️ Error:</div>
                {transactionError}
              </div>
            )}

            {/* Debug section
            <div style={{ 
              margin: '20px 0', 
              padding: '15px', 
              border: '1px dashed #ccc', 
              borderRadius: '4px',
              backgroundColor: '#f5f5f5'
            }}>
              <h3>Developer Tools</h3>
              <p>Contract Address: {rouletteContract ? rouletteContract.target : 'Not connected'}</p>
              <button 
                onClick={async () => {
                  if (rouletteContract) {
                    console.log('Contract methods:', Object.keys(rouletteContract.functions));
                    alert('Check console for contract methods');
                  } else {
                    alert('Contract not connected');
                  }
                }}
                style={{ marginRight: '10px' }}
              >
                Log Contract Methods
              </button>
              <button 
                onClick={testSpin}
                disabled={testingInProgress}
                style={{ backgroundColor: testingInProgress ? '#ccc' : '#ff9800' }}
              >
                {testingInProgress ? 'Testing...' : 'Test Spin Function'}
              </button>
            </div>*/}
          </div>
        </div>
      )}
    </div>
  );
}

export default Roulette;