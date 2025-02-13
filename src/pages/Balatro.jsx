import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import LoadingIcons from 'react-loading-icons';
import { ethers } from 'ethers';
import '../styles/Balatro.css';

function Balatro() {
  const { 
    account, 
    ownerAccount, 
    isLoading, 
    error: web3Error, 
    balatroContract,
    connectWallet 
  } = useWeb3();

  const { getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  const [betAmount, setBetAmount] = useState('0.01');
  const [gameState, setGameState] = useState({
    hands: [],
    currentHand: [],
    roundNumber: 0,
    totalMultiplier: 1,
    score: '0',
    isPlaying: false,
    result: null
  });
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [dealtCards, setDealtCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [handType, setHandType] = useState('');

  const ANIMATION_DURATION = 500;
  const CARD_DELAY = 200;

  const cardValueToString = (card) => {
    if (!card) return '';
    if (card.isJoker) return 'J';
    if (card.rank === 1) return 'A';
    if (card.rank === 11) return 'J';
    if (card.rank === 12) return 'Q';
    if (card.rank === 13) return 'K';
    return card.rank.toString();
  };

  const getSuitSymbol = (suit) => {
    switch (Number(suit)) {
      case 0: return '♥';
      case 1: return '♦';
      case 2: return '♣';
      case 3: return '♠';
      case 4: return '★'; // Joker
      default: return '';
    }
  };

  const getSuitColor = (suit) => {
    switch (Number(suit)) {
      case 0:
      case 1:
        return 'red-suit';
      case 4:
        return 'joker-suit';
      default:
        return 'black-suit';
    }
  };

  const getHandType = (multiplier) => {
    // Base multipliers without Joker effects
    switch (multiplier) {
      case 50: return 'Straight Flush';
      case 25: return 'Four of a Kind';
      case 15: return 'Full House';
      case 10: return 'Flush';
      case 8: return 'Straight';
      case 5: return 'Three of a Kind';
      case 3: return 'Two Pair';
      case 2: return 'One Pair';
      default: return 'High Card';
    }
  };

  const handleStartGame = async () => {
    try {
      setTransactionError(null);
      setDealtCards([]);
      setHandType('');
      
      if (!account || !balatroContract) {
        console.log('Missing dependencies:', {
          hasAccount: !!account,
          hasContract: !!balatroContract
        });
        await connectWallet();
        return;
      }

      const tx = await balatroContract.startGame({
        value: ethers.parseEther(betAmount),
        gasLimit: 500000
      });

      await tx.wait();

      // Get initial game state
      const game = await balatroContract.getActiveGame();
      
      console.log('Initial game state:', {
        roundNumber: game.roundNumber.toString(),
        totalMultiplier: game.totalMultiplier.toString(),
        score: ethers.formatEther(game.score),
        state: game.state
      });

      const initialGameState = {
        hands: game.hands || [],
        currentHand: [],
        roundNumber: Number(game.roundNumber),
        totalMultiplier: Number(game.totalMultiplier),
        score: ethers.formatEther(game.score),
        isPlaying: true,
        result: null
      };

      setGameState(initialGameState);

    } catch (err) {
      console.error("Error starting game:", err);
      setTransactionError(err.message);
    }
  };

  const handleDrawCard = async () => {
    try {
      setTransactionError(null);
      
      console.log('Drawing cards, current hand:', {
        currentHandSize: gameState.currentHand.length,
        dealtCards: dealtCards
      });

      // Single transaction will draw up to 5 cards
      const tx = await balatroContract.drawCard();
      await tx.wait();

      const updatedGame = await balatroContract.getActiveGame();
      const currentHand = updatedGame.hands[updatedGame.hands.length - 1];

      console.log('Cards drawn:', {
        newHandSize: currentHand.cards.length,
        previousDealtCards: dealtCards.length,
        newCards: currentHand.cards.slice(dealtCards.length)
      });

      // Add animation for all new cards
      const newCardIndices = [];
      for (let i = dealtCards.length; i < currentHand.cards.length; i++) {
        newCardIndices.push(i);
      }
      setDealtCards(prev => [...prev, ...newCardIndices]);

      console.log('Updated state:', {
        newCardIndices,
        totalDealtCards: [...dealtCards, ...newCardIndices].length
      });

      setGameState(prev => ({
        ...prev,
        hands: updatedGame.hands,
        currentHand: currentHand.cards
      }));

    } catch (err) {
      console.error("Error drawing cards:", err);
      setTransactionError(err.message);
    }
  };

  const handleCompleteHand = async () => {
    try {
      setTransactionError(null);
      
      const tx = await balatroContract.completeHand();
      await tx.wait();

      const updatedGame = await balatroContract.getActiveGame();
      const currentHand = updatedGame.hands[updatedGame.hands.length - 1];
      
      // Determine hand type based on multiplier
      const handType = getHandType(currentHand.multiplier);
      setHandType(handType);

      // Calculate score for this hand
      const handScore = ethers.toBigInt(currentHand.bet) * ethers.toBigInt(currentHand.multiplier);
      
      console.log('Hand completed:', {
        handType,
        multiplier: currentHand.multiplier.toString(),
        bet: ethers.formatEther(currentHand.bet),
        score: ethers.formatEther(handScore),
        totalScore: ethers.formatEther(updatedGame.score),
        totalMultiplier: updatedGame.totalMultiplier.toString(),
        gameState: updatedGame.state,
        roundNumber: updatedGame.roundNumber
      });
      
      const newGameState = {
        hands: updatedGame.hands,
        currentHand: currentHand.cards,
        roundNumber: Number(updatedGame.roundNumber),
        totalMultiplier: Number(updatedGame.totalMultiplier),
        score: ethers.formatEther(updatedGame.score),
        isPlaying: updatedGame.state !== 2,
        result: updatedGame.state === 2 ? `Game Complete! (${handType})` : null
      };

      setGameState(newGameState);
      
      if (updatedGame.state !== 2) { // If game is not completed
        setDealtCards([]);
      }

    } catch (err) {
      console.error("Error completing hand:", err);
      setTransactionError(err.message);
    }
  };

  const handleCardClick = (index) => {
    setSelectedCards(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else if (prev.length < 5) {
        return [...prev, index];
      }
      return prev;
    });
  };

  const handleDiscard = async () => {
    try {
      setTransactionError(null);
      
      if (selectedCards.length === 0) return;
      
      const tx = await balatroContract.discardAndDraw(selectedCards);
      await tx.wait();

      const updatedGame = await balatroContract.getActiveGame();
      const currentHand = updatedGame.hands[updatedGame.hands.length - 1];

      setGameState(prev => ({
        ...prev,
        hands: updatedGame.hands,
        currentHand: currentHand.cards
      }));

      // Reset selected cards
      setSelectedCards([]);

    } catch (err) {
      console.error("Error discarding cards:", err);
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
  }, [account, getAccountBalance, gameState.result]);

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
    <div className="balatro-container">
      <h1>Balatro</h1>
      
      {!account ? (
        <div className="connect-wallet">
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : !hasActiveAccount ? (
        <div className="open-account">
          <p>Please open an account to play Balatro</p>
          <button onClick={() => window.location.href = '/account'}>
            Open Account
          </button>
        </div>
      ) : (
        <div>
          <div className="game-info">
            <div className="score-display">
              <p>Round: {gameState.roundNumber}/3</p>
              <p>Total Multiplier: {gameState.totalMultiplier}x</p>
              <p>Score: {gameState.score}</p>
            </div>

            {!gameState.isPlaying && (
              <div className="bet-controls">
                <input
                  type="number"
                  placeholder="Bet Amount"
                  min="0.01"
                  step="0.01"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                />
                <button onClick={handleStartGame}>
                  Start Game
                </button>
              </div>
            )}
            
            {transactionError && (
              <div className="error-message">
                Error: {transactionError}
              </div>
            )}
          </div>

          <div className="game-table">
            <div className="current-hand">
              <h2>Current Hand</h2>
              {handType && <h3 className="hand-type">{handType}</h3>}
              <div className="cards">
                {gameState.currentHand.map((card, index) => (
                  <div 
                    key={index} 
                    className={`card ${dealtCards.includes(index) ? 'dealt' : ''} 
                              ${getSuitColor(card.suit)}
                              ${selectedCards.includes(index) ? 'selected' : ''}`}
                    onClick={() => handleCardClick(index)}
                  >
                    <div className="card-value">{cardValueToString(card)}</div>
                    <div className="card-suit">{getSuitSymbol(card.suit)}</div>
                    {card.isJoker && <div className="joker-label">JOKER</div>}
                  </div>
                ))}
              </div>
            </div>

            {gameState.isPlaying && (
              <div className="game-controls">
                <button 
                  onClick={handleDrawCard}
                  disabled={gameState.currentHand.length >= 5}
                >
                  Draw Cards
                </button>
                <button 
                  onClick={handleDiscard}
                  disabled={selectedCards.length === 0 || gameState.currentHand.length < 5}
                >
                  Discard Selected ({selectedCards.length})
                </button>
                <button 
                  onClick={handleCompleteHand}
                  disabled={gameState.currentHand.length < 5}
                >
                  Complete Hand
                </button>
              </div>
            )}
          </div>

          {gameState.result && (
            <div className="game-result">
              <h2>{gameState.result}</h2>
              <p>Final Score: {gameState.score}</p>
              <p>Total Multiplier: {gameState.totalMultiplier}x</p>
              <button onClick={() => setGameState({
                hands: [],
                currentHand: [],
                roundNumber: 0,
                totalMultiplier: 1,
                score: '0',
                isPlaying: false,
                result: null
              })}>
                New Game
              </button>
            </div>
          )}

          <div className="previous-hands">
            <h2>Previous Hands</h2>
            <div className="hands-history">
              {gameState.hands.slice(0, -1).map((hand, handIndex) => (
                <div key={handIndex} className="previous-hand">
                  <h3>Hand {handIndex + 1}</h3>
                  <div className="cards">
                    {hand.cards.map((card, cardIndex) => (
                      <div 
                        key={cardIndex} 
                        className={`card small ${getSuitColor(card.suit)}`}
                      >
                        <div className="card-value">{cardValueToString(card)}</div>
                        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
                      </div>
                    ))}
                  </div>
                  <p>Multiplier: {hand.multiplier}x</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Balatro; 