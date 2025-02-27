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
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [selectedBetSize, setSelectedBetSize] = useState(0.1);
  
  const betSizes = [0.1, 0.5, 1, 5];

  // Define red numbers for visual purposes only
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

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

      if (selectedNumbers.length === 0) {
        throw new Error('Please select at least one number');
      }

      // Calculate total bet amount in ETH
      const totalBetAmount = selectedBetSize * selectedNumbers.length;

      // Calculate gas limit based on number of selected numbers
      const baseGas = 500000;
      const gasPerNumber = 100000;
      const gasLimit = baseGas + (selectedNumbers.length * gasPerNumber);

      console.log('Placing bet:', {
        selectedNumbers,
        betSize: selectedBetSize,
        totalBetAmount,
        gasLimit
      });

      const success = await placeRouletteBet(selectedNumbers, totalBetAmount.toString(), gasLimit);
      
      if (success) {
        const result = Math.floor(Math.random() * 37);
        const won = selectedNumbers.includes(result);
        setGameResult({
          number: result,
          won,
          payout: won ? selectedBetSize * 36 : 0
        });
        setSelectedNumbers([]);
      }

    } catch (err) {
      console.error("Error placing bet:", err);
      setTransactionError(err.message);
    }
  };

  const handleClearBoard = () => {
    setSelectedNumbers([]);
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
              disabled={selectedNumbers.length === 0}
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
                <p className="win">You won {gameResult.payout} AVAX!</p>
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