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
  const [dealtCards, setDealtCards] = useState({
    player: [],
    dealer: []
  });

  const ANIMATION_DURATION = 500; // Base animation duration in ms
  const CARD_DELAY = 200; // Delay between each card

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

  const animateCardDealing = (cards, isDealer = false) => {
    return new Promise(resolve => {
      const key = isDealer ? 'dealer' : 'player';
      cards.forEach((_, index) => {
        setTimeout(() => {
          setDealtCards(prev => ({
            ...prev,
            [key]: [...prev[key], index]
          }));
        }, index * CARD_DELAY);
      });
      // Resolve after all cards are dealt and animated
      const totalDuration = (cards.length - 1) * CARD_DELAY + ANIMATION_DURATION;
      setTimeout(resolve, totalDuration);
    });
  };

  const handlePlaceBet = async () => {
    try {
      setTransactionError(null);
      setDealtCards({ player: [], dealer: [] }); // Reset dealt cards
      
      if (!account || !blackjackContract) {
        await connectWallet();
        return;
      }

      const success = await placeBet(betAmount);
      
      if (success) {
        const playerCards = [Math.floor(Math.random() * 52) + 1, Math.floor(Math.random() * 52) + 1];
        const dealerCards = [Math.floor(Math.random() * 52) + 1];
        
        // Initialize new game state without scores
        setGameState(prev => ({
          ...prev,
          playerHand: playerCards,
          dealerHand: dealerCards,
          isPlaying: true,
          result: null,
          playerScore: null,
          dealerScore: null
        }));

        // Wait for all animations to complete
        await animateCardDealing(playerCards);
        await animateCardDealing(dealerCards, true);

        // Update scores after animations
        setGameState(prev => ({
          ...prev,
          playerScore: calculateHandScore(playerCards),
          dealerScore: calculateHandScore(dealerCards)
        }));
      } else {
        throw new Error("Failed to place bet");
      }

    } catch (err) {
      console.error("Error in handlePlaceBet:", err);
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
      const newCardIndex = updatedHand.length - 1;
      
      // Update hand without score first
      setGameState(prev => ({
        ...prev,
        playerHand: updatedHand,
        playerScore: null
      }));

      // Add new card to animation state
      setDealtCards(prev => ({
        ...prev,
        player: [...prev.player, newCardIndex]
      }));

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));

      const newScore = calculateHandScore(updatedHand);
      
      // Update score after animation
      setGameState(prev => ({
        ...prev,
        playerScore: newScore
      }));

      if (newScore > 21) {
        const result = 'BUST! You lose!';
        
        // Small delay before showing bust result
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setGameState(prev => ({
          ...prev,
          isPlaying: false,
          result
        }));
        
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
        currentDealerHand = [...currentDealerHand, newCard];
        const newCardIndex = currentDealerHand.length - 1;
        
        // Update hand and current score
        setGameState(prev => ({
          ...prev,
          dealerHand: currentDealerHand,
          dealerScore: calculateHandScore(currentDealerHand)
        }));

        // Add new card to animation state
        setDealtCards(prev => ({
          ...prev,
          dealer: [...prev.dealer, newCardIndex]
        }));

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, ANIMATION_DURATION));
        
        dealerScore = calculateHandScore(currentDealerHand);
      }

      // Small delay before showing final result
      await new Promise(resolve => setTimeout(resolve, 500));

      const playerScore = calculateHandScore(gameState.playerHand);
      let result;

      if (dealerScore > 21) {
        result = 'Dealer busts! You win!';
      } else if (dealerScore > playerScore) {
        result = 'Dealer wins!';
      } else if (dealerScore < playerScore) {
        result = 'You win!';
      } else {
        result = 'Push!';
      }

      // Update final game state
      setGameState(prev => ({
        ...prev,
        dealerHand: currentDealerHand,
        dealerScore,
        isPlaying: false,
        result
      }));

      // Resolve the bet with the contract
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
          <button onClick={() => window.location.href = '/account'}>
            Open Account
          </button>
        </div>
      ) : (
        <div>
          <div className="game-info">
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

          <div className="game-table">
            <div className="dealer-hand">
              <h2>Dealer's Hand</h2>
              <div className="cards">
                {gameState.dealerHand.map((card, index) => (
                  <span 
                    key={index} 
                    className={`card ${dealtCards.dealer.includes(index) ? 'dealt' : ''}`}
                  >
                    {cardValueToString(card % 13 || 13)}
                  </span>
                ))}
              </div>
              {gameState.dealerScore !== null && (
                <p>Dealer Score: {gameState.dealerScore}</p>
              )}
            </div>
            
            <div className="player-hand">
              <h2>Your Hand</h2>
              <div className="cards">
                {gameState.playerHand.map((card, index) => (
                  <span 
                    key={index} 
                    className={`card ${dealtCards.player.includes(index) ? 'dealt' : ''}`}
                  >
                    {cardValueToString(card % 13 || 13)}
                  </span>
                ))}
              </div>
              {gameState.playerScore !== null && (
                <p>Your Score: {gameState.playerScore}</p>
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

          {gameState.isPlaying && (
            <div className="game-controls">
              <button onClick={handleHit}>Hit</button>
              <button onClick={handleStand}>Stand</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Blackjack;