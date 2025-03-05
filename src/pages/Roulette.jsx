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
      });

      // Calculate gas limit based on number of bets
      const baseGas = 500000;
      const gasPerNumber = 100000;
      const gasLimit = baseGas + (selectedNumbers.length * gasPerNumber);
      
      const totalBetAmount = selectedBetSize * selectedNumbers.length;

      // Use toFixed(18) to limit precision, then convert to string to avoid floating point errors
      const roundedAmount = totalBetAmount.toFixed(18);

      // Parse the fixed string value to Wei
      const totalBetAmountWei = ethers.parseEther(roundedAmount);
      
      // Call the new combined function instead of just placeBet
      const tx = await rouletteContract.placeBetAndSpin(selectedNumbers, {
        value: totalBetAmountWei,
        gasLimit: gasLimit
      });
      
      console.log('Transaction sent:', tx.hash);
      
      // Wait for the transaction receipt
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // The transaction will emit events that our listener will catch,
      // so the game result will be updated automatically
      
      // Clear selected numbers after successful bet
      setSelectedNumbers([]);
      
      // Update balance after bet
      if (getAccountBalance) {
        const newBalance = await getAccountBalance();
        console.log('Updated balance:', newBalance);
      }
      
      setBetInProgress(false);
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
    // Add the current gameResult to history before resetting
    if (gameResult) {
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        result: gameResult.number,
        selectedNumbers: gameResult.selectedNumbers,  // Use stored selected numbers
        won: gameResult.won,
        payout: gameResult.payout,
        betAmount: gameResult.betAmount  // Use stored bet amount
      };
      
      // Add new item to start of array and keep only last 3
      setBetHistory(prev => [historyItem, ...prev].slice(0, 3));
    }
    
    // Reset the game result and bet state
    resetBetState();
    setSelectedNumbers([]);
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

  // Update the useEffect that reacts to gameResult
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
        const betAmount = (selectedBetSize * selectedNumbers.length).toFixed(2);
        
        console.log(`Player ${won ? 'won' : 'lost'} - Result: ${gameResult.number}, Selected: ${selectedNumbers.join(',')}`);
        
        // Store this result number to avoid processing it again
        processedResultRef.current = gameResult.number;
        
        // Update the game result with win status, payout, and bet amount
        setGameResult(prev => ({
          ...prev,
          won: won,
          payout: payout,
          betAmount: betAmount,
          selectedNumbers: [...selectedNumbers]  // Store selected numbers too
        }));
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
        <div className="game-and-history-container">
          {/* Bet History Section */}
          <div className="bet-history-section">
            <h2 className="bet-history-title">Bet History</h2>
            
            {gameResult && (
              <div className="latest-result">
                <div className="latest-result-header">
                  <h3 className="latest-result-title">Current Result</h3>
                  <div className="latest-result-time">{new Date().toLocaleTimeString()}</div>
                </div>
                <h2 className="latest-result-number">
                  Result: {gameResult.number}
                </h2>
                <p className={`latest-result-outcome ${gameResult.won ? 'win' : 'loss'}`}>
                  {gameResult.won ? `You won ${gameResult.payout} AVAX!` : 'Better luck next time!'}
                </p>
                <button 
                  onClick={handleNewBet}
                  className="new-bet-button"
                >
                  New Bet
                </button>
              </div>
            )}
            
            {betHistory.length === 0 && !gameResult ? (
              <p className="no-history-message">No betting history yet</p>
            ) : (
              betHistory.map(item => (
                <div key={item.id} className="history-item">
                  <div className="history-item-time">{item.timestamp}</div>
                  <h3 className="history-item-result">Result: {item.result}</h3>
                  <p className="history-item-details">Selected: {item.selectedNumbers.join(', ')}</p>
                  <p className="history-item-details">Bet: {item.betAmount} AVAX</p>
                  <p className={`history-item-outcome ${item.won ? 'win' : 'loss'}`}>
                    {item.won ? `Won ${item.payout} AVAX` : 'Lost'}
                  </p>
                </div>
              ))
            )}
          </div>
          
          {/* Main Game Container */}
          <div className="game-container">
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
                className={`place-bet-button ${selectedNumbers.length === 0 || betInProgress || gameResult ? 'disabled' : ''}`}
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
                  className="new-bet-button"
                >
                  New Bet
                </button>
              )}
            </div>

            {betInProgress ? (
              <div className="bet-in-progress">
                <p>Processing your bet...</p>
              </div>
            ) : !gameResult ? (
              <div className="bet-instructions">
                <p>Select numbers and place a bet to play</p>
              </div>
            ) : null}

            {transactionError && (
              <div className="error-container">
                <div className="error-title">⚠️ Error:</div>
                {transactionError}
              </div>
            )}

            {/* Debug section */}
            {/*<div className="debug-section">
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
                className="debug-button"
              >
                Log Contract Methods
              </button>
              <button 
                onClick={testSpin}
                disabled={testingInProgress}
                className={`test-spin-button ${testingInProgress ? 'disabled' : ''}`}
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