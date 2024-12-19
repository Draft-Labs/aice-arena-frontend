import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import LoadingIcons from 'react-loading-icons';
import '../styles/Blackjack.css';

function Blackjack() {
  const { 
    account, 
    ownerAccount, 
    isLoading, 
    error: web3Error, 
    blackjackContract,
    connectWallet 
  } = useWeb3();
  
  const { placeBet, hit, stand, depositToTreasury, withdrawFromTreasury, getAccountBalance, submitGameResult, checkTreasuryAccount } = useContractInteraction();
  const [betAmount, setBetAmount] = useState('0.01');
  const [gameState, setGameState] = useState({
    playerHand: [],
    dealerHand: [],
    isPlaying: false,
    result: null,
    playerScore: 0,
    dealerScore: 0
  });
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [withdrawAmount, setWithdrawAmount] = useState('0.01');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);

  const cardValueToString = (cardValue) => {
    if (cardValue === 1 || cardValue === 14) return 'A';
    if (cardValue === 11) return 'J';
    if (cardValue === 12) return 'Q';
    if (cardValue === 13) return 'K';
    return cardValue.toString();
  };

  const calculateHandScore = (hand) => {
    let score = 0;
    let aces = 0;

    hand.forEach(card => {
      let value = card % 13 || 13; // Convert to 1-13
      if (value > 10) value = 10;
      if (value === 1) {
        aces += 1;
        value = 11;
      }
      score += value;
    });

    // Adjust for aces
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }

    return score;
  };

  const getWinMultiplier = (result) => {
    switch (result) {
      case 'You win!':
      case 'Dealer busts! You win!':
        return 2; // Player gets 2x their bet
      case 'Push!':
        return 1; // Player gets their original bet back
      case 'Dealer wins!':
      case 'BUST! You lose!':
        return 0; // Player loses their bet
      default:
        console.log('Unknown result:', result);
        return 0;
    }
  };

  const resolveBetWithContract = async (result, dealerHand = gameState.dealerHand, playerHand = gameState.playerHand) => {
    try {
      const multiplier = getWinMultiplier(result);

      console.log('Resolving bet with multiplier:', {
        result,
        multiplier,
        playerHand,
        dealerHand,
        playerScore: calculateHandScore(playerHand),
        dealerScore: calculateHandScore(dealerHand),
        isBust: calculateHandScore(playerHand) > 21
      });
      
      await submitGameResult(playerHand, dealerHand, multiplier);
      
      console.log('Bet resolved successfully');
      
      // Refresh the casino balance after resolution
      const newBalance = await getAccountBalance();
      setCasinoBalance(newBalance);
      
    } catch (err) {
      console.error('Error resolving bet:', err);
      setTransactionError('Failed to resolve bet: ' + err.message);
    }
  };

  const handlePlaceBet = async () => {
    try {
      setTransactionError(null);
      
      if (!account || !blackjackContract) {
        await connectWallet();
        return;
      }

      const success = await placeBet(betAmount);
      
      if (success) {
        // Initialize new game state
        setGameState(prev => ({
          ...prev,
          playerHand: [Math.floor(Math.random() * 52) + 1, Math.floor(Math.random() * 52) + 1],
          dealerHand: [Math.floor(Math.random() * 52) + 1],
          isPlaying: true,
          result: null
        }));
      } else {
        throw new Error("Failed to place bet");
      }

    } catch (err) {
      console.error("Error in handlePlaceBet:", err);
      // Check if the error is related to rate limiting
      if (err.message.includes('ActionRateLimited')) {
        setTransactionError('Bet placed too soon. Please wait a few more seconds.');
      } else {
        setTransactionError(err.message);
      }
    }
  };

  const handleHit = async () => {
    try {
      setTransactionError(null);
      const newCard = Math.floor(Math.random() * 52) + 1;
      
      const updatedHand = [...gameState.playerHand, newCard];
      const newScore = calculateHandScore(updatedHand);

      console.log('Hit action:', {
        previousHand: gameState.playerHand,
        newCard,
        updatedHand,
        newScore,
        dealerHand: gameState.dealerHand,
        dealerScore: calculateHandScore(gameState.dealerHand)
      });

      // Update state first
      await new Promise(resolve => {
        setGameState(prev => {
          console.log('Updating game state:', {
            oldHand: prev.playerHand,
            newHand: updatedHand
          });
          return {
            ...prev,
            playerHand: updatedHand,
            playerScore: newScore
          };
        });
        resolve();
      });

      if (newScore > 21) {
        const result = 'BUST! You lose!';
        
        console.log('Player bust:', {
          finalHand: updatedHand,
          finalScore: newScore,
          dealerHand: gameState.dealerHand,
          dealerScore: calculateHandScore(gameState.dealerHand)
        });

        setGameState(prev => ({
          ...prev,
          isPlaying: false,
          result
        }));
        
        // Pass the updated hand directly to resolveBetWithContract
        await resolveBetWithContract(result, gameState.dealerHand, updatedHand);
      }

    } catch (err) {
      console.error("Error in handleHit:", err);
      setTransactionError(err.message);
    }
  };

  const handleStand = async () => {
    try {
      setTransactionError(null);
      let currentDealerHand = [...gameState.dealerHand];
      let dealerScore = calculateHandScore(currentDealerHand);
      
      // Dealer hits on 16 or below
      while (dealerScore < 17) {
        const newCard = Math.floor(Math.random() * 52) + 1;
        currentDealerHand.push(newCard);
        dealerScore = calculateHandScore(currentDealerHand);
      }

      const playerScore = calculateHandScore(gameState.playerHand);
      let result;

      console.log('Determining game result:', {
        playerScore,
        dealerScore,
        playerHand: gameState.playerHand,
        dealerHand: currentDealerHand,
        rawDealerHand: currentDealerHand.map(card => ({
          card,
          value: card % 13 || 13,
          score: calculateHandScore([card])
        }))
      });

      if (dealerScore > 21) {
        result = 'Dealer busts! You win!';
      } else if (dealerScore > playerScore) {
        result = 'Dealer wins!';
      } else if (dealerScore < playerScore) {
        result = 'You win!';
      } else {
        result = 'Push!';
      }

      console.log('Game result determined:', result);

      // Update game state and wait for it to complete
      await new Promise(resolve => {
        setGameState(prev => {
          console.log('Updating final game state:', {
            oldDealerHand: prev.dealerHand,
            newDealerHand: currentDealerHand,
            dealerScore,
            result
          });
          return {
            ...prev,
            dealerHand: currentDealerHand,
            dealerScore: dealerScore,
            isPlaying: false,
            result
          };
        });
        resolve();
      });

      // Resolve the bet with the contract using the current dealer hand
      await resolveBetWithContract(result, currentDealerHand);

    } catch (err) {
      console.error("Error in handleStand:", err);
      setTransactionError(err.message);
    }
  };

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
  }, [account, getAccountBalance, gameState.result]); // Refresh after game ends

  const handleDeposit = async () => {
    try {
      setTransactionError(null);
      await depositToTreasury(depositAmount);
      const newBalance = await getAccountBalance();
      setCasinoBalance(newBalance);
    } catch (err) {
      console.error('Error depositing:', err);
      setTransactionError(err.message);
    }
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

  if (isLoading) return <LoadingIcons.Bars />;
  if (web3Error) return (
    <div>
      <div>Error: {web3Error}</div>
      <button onClick={connectWallet}>Retry Connection</button>
    </div>
  );

  return (
    <div className="blackjack-container">
      <h1>Blackjack</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasActiveAccount ? (
        <div className="open-account">
          <p>Please open an account to play Blackjack</p>
          <div className="deposit-controls">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Initial deposit amount"
            />
            <button onClick={handleDeposit}>
              Open Account
            </button>
          </div>
          {transactionError && (
            <div className="error-message">
              Error: {transactionError}
            </div>
          )}
        </div>
      ) : (
        <div className="game-info">
          <p>Connected Account: {account}</p>
          <p>Available Balance: {casinoBalance} ETH</p>

          <div className="bet-controls">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={gameState.isPlaying}
            />
            <button 
              onClick={handlePlaceBet}
              disabled={gameState.isPlaying || !account}
            >
              Place Bet
            </button>
          </div>
          
          {transactionError && (
            <div className="error-message">
              Error: {transactionError}
            </div>
          )}
        </div>
      )}

      {gameState.isPlaying && (
        <div className="game-controls">
          <button onClick={handleHit}>Hit</button>
          <button onClick={handleStand}>Stand</button>
        </div>
      )}

      <div className="game-table">
        <div className="dealer-hand">
          <h2>Dealer's Hand</h2>
          <div className="cards">
            {gameState.dealerHand.map((card, index) => (
              <span key={index} className="card">
                {cardValueToString(card % 13 || 13)}
              </span>
            ))}
          </div>
          {!gameState.isPlaying && gameState.dealerHand.length > 0 && (
            <p>Dealer Score: {calculateHandScore(gameState.dealerHand)}</p>
          )}
        </div>
        
        <div className="player-hand">
          <h2>Your Hand</h2>
          <div className="cards">
            {gameState.playerHand.map((card, index) => (
              <span key={index} className="card">
                {cardValueToString(card % 13 || 13)}
              </span>
            ))}
          </div>
          {gameState.playerHand.length > 0 && (
            <p>Your Score: {calculateHandScore(gameState.playerHand)}</p>
          )}
        </div>
      </div>

      {gameState.result && (
        <div className="game-result">
          <h2>{gameState.result}</h2>
          <button 
            onClick={() => setGameState({
              playerHand: [],
              dealerHand: [],
              isPlaying: false,
              result: null,
              playerScore: 0,
              dealerScore: 0
            })}
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}

export default Blackjack;