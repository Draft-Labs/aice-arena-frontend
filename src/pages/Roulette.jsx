import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import '../styles/Roulette.css';

function Roulette() {
  const { 
    account, 
    isLoading, 
    error: web3Error, 
    connectWallet 
  } = useWeb3();
  
  const { placeRouletteBet, getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  const [betAmount, setBetAmount] = useState('0.01');
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [selectedBetSize, setSelectedBetSize] = useState(0.1);
  const [currentBetType, setCurrentBetType] = useState(null);
  
  const betSizes = [0.1, 0.5, 1, 5];

  // Define red numbers
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  // Helper function to check if numbers are adjacent
  const areNumbersAdjacent = (numbers) => {
    if (numbers.length !== 2) return false;
    const [a, b] = numbers.sort((x, y) => x - y);
    // Check if numbers are horizontally adjacent
    if (Math.floor((a-1)/3) === Math.floor((b-1)/3) && b-a === 1) return true;
    // Check if numbers are vertically adjacent
    if (b-a === 3) return true;
    return false;
  };

  // Helper function to check if numbers form a valid street
  const isValidStreet = (numbers) => {
    if (numbers.length !== 3) return false;
    const sorted = [...numbers].sort((a, b) => a - b);
    return Math.floor((sorted[0]-1)/3) === Math.floor((sorted[2]-1)/3) &&
           sorted[2] - sorted[0] === 2;
  };

  // Helper function to check if numbers form a valid corner
  const isValidCorner = (numbers) => {
    if (numbers.length !== 4) return false;
    const sorted = [...numbers].sort((a, b) => a - b);
    return Math.floor((sorted[0]-1)/3) === Math.floor((sorted[1]-1)/3) &&
           Math.floor((sorted[2]-1)/3) === Math.floor((sorted[3]-1)/3) &&
           sorted[2] - sorted[0] === 3;
  };

  const getBetType = (numbers) => {
    if (numbers.length === 0) return null;
    if (numbers.length === 1) return 'Straight';
    if (numbers.length === 2 && areNumbersAdjacent(numbers)) return 'Split';
    if (numbers.length === 3 && isValidStreet(numbers)) return 'Street';
    if (numbers.length === 4 && isValidCorner(numbers)) return 'Corner';
    if (numbers.length === 6) return 'Line';
    if (numbers.length === 12) {
      if (numbers.every(n => n % 3 === 1)) return 'Column';
      return 'Dozen';
    }
    if (numbers.every(n => redNumbers.includes(n))) return 'Red';
    if (numbers.every(n => !redNumbers.includes(n) && n !== 0)) return 'Black';
    if (numbers.every(n => n % 2 === 0 && n !== 0)) return 'Even';
    if (numbers.every(n => n % 2 === 1)) return 'Odd';
    if (numbers.every(n => n >= 1 && n <= 18)) return 'Low';
    if (numbers.every(n => n >= 19 && n <= 36)) return 'High';
    return null;
  };

  const handleNumberClick = (number) => {
    setSelectedNumbers(prev => {
      const newNumbers = prev.includes(number) 
        ? prev.filter(n => n !== number)
        : [...prev, number];
      
      const newBetType = getBetType(newNumbers);
      setCurrentBetType(newBetType);
      return newNumbers;
    });
  };

  const handlePlaceBet = async () => {
    try {
      setTransactionError(null);
      
      if (!account) {
        await connectWallet();
        return;
      }

      // Check if player has an active account first
      const isActive = await checkTreasuryAccount();
      if (!isActive) {
        setTransactionError('Please open an account first');
        return;
      }

      const betType = getBetType(selectedNumbers);
      if (!betType) {
        throw new Error('Invalid bet selection');
      }

      // Add loading state if needed
      const success = await placeRouletteBet(
        selectedBetSize.toString(),
        betType,
        selectedNumbers
      );
      
      if (success) {
        const result = Math.floor(Math.random() * 37);
        setGameResult(result);
        setSelectedNumbers([]);
      }

    } catch (err) {
      console.error("Error placing bet:", err);
      setTransactionError(err.message);
    }
  };

  const handleSpecialBetClick = (type) => {
    let newNumbers = [];
    switch(type) {
      case 'Red':
        newNumbers = redNumbers;
        break;
      case 'Black':
        newNumbers = [...Array(37).keys()]
          .filter(n => n !== 0 && !redNumbers.includes(n));
        break;
      case 'Even':
        newNumbers = [...Array(37).keys()]
          .filter(n => n !== 0 && n % 2 === 0);
        break;
      case 'Odd':
        newNumbers = [...Array(37).keys()]
          .filter(n => n % 2 === 1);
        break;
      case 'Low':
        newNumbers = [...Array(19).keys()].slice(1);
        break;
      case 'High':
        newNumbers = [...Array(18).keys()].map(n => n + 19);
        break;
      default:
        newNumbers = [];
    }
    
    setSelectedNumbers(newNumbers);
    setCurrentBetType(type);
  };

  const handleClearBoard = () => {
    setSelectedNumbers([]);
    setCurrentBetType(null);
  };

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
        }
      }
    };

    fetchBalance();
  }, [account, getAccountBalance, gameResult]);

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
        <div className="game-container">
          <div className="balance-info">
            <p>Available Balance: {casinoBalance} ETH</p>
          </div>

          <div className="bet-sizes">
            {betSizes.map(size => (
              <button
                key={size}
                className={`bet-size ${selectedBetSize === size ? 'selected' : ''}`}
                onClick={() => setSelectedBetSize(size)}
              >
                {size} ETH
              </button>
            ))}
          </div>

          {currentBetType && (
            <div className="current-bet-info">
              <p>Current Bet Type: {currentBetType}</p>
              <p>Total Bet: {(selectedBetSize * selectedNumbers.length).toFixed(2)} ETH</p>
            </div>
          )}

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

            <div className="special-bets">
              <div className="bet-row">
                <div className="special-bet" onClick={() => handleSpecialBetClick('Red')}>Red</div>
                <div className="special-bet" onClick={() => handleSpecialBetClick('Black')}>Black</div>
                <div className="special-bet" onClick={() => handleSpecialBetClick('Even')}>Even</div>
                <div className="special-bet" onClick={() => handleSpecialBetClick('Odd')}>Odd</div>
                <div className="special-bet" onClick={() => handleSpecialBetClick('Low')}>1-18</div>
                <div className="special-bet" onClick={() => handleSpecialBetClick('High')}>19-36</div>
              </div>
            </div>
          </div>

          <div className="betting-controls">
            <button 
              onClick={handlePlaceBet}
              disabled={selectedNumbers.length === 0 || !currentBetType}
            >
              Place Bet
            </button>
            <button 
              onClick={handleClearBoard}
              disabled={selectedNumbers.length === 0}
            >
              Clear Board
            </button>
          </div>

          {gameResult !== null && (
            <div className="game-result">
              <h2>Result: {gameResult.number}</h2>
              {gameResult.won ? (
                <p className="win">You won {gameResult.payout} ETH!</p>
              ) : (
                <p className="loss">Better luck next time!</p>
              )}
              <button onClick={() => setGameResult(null)}>New Bet</button>
            </div>
          )}

          {transactionError && (
            <div className="error-message">
              Error: {transactionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Roulette; 