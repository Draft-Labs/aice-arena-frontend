import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useContractInteraction } from '../hooks/useContractInteraction';
import LoadingIcons from 'react-loading-icons';
import '../styles/Balatro.css';

function Balatro() {
  const { 
    account, 
    ownerAccount, 
    isLoading, 
    error: web3Error, 
    balatraContract,
    connectWallet 
  } = useWeb3();
  
  const { getAccountBalance, checkTreasuryAccount } = useContractInteraction();
  const [betAmount, setBetAmount] = useState('0.01');
  const [gameState, setGameState] = useState({
    hands: [],
    currentHand: [],
    roundNumber: 0,
    totalMultiplier: 1,
    score: 0,
    isPlaying: false,
    result: null
  });
  const [transactionError, setTransactionError] = useState(null);
  const [casinoBalance, setCasinoBalance] = useState('0');
  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [dealtCards, setDealtCards] = useState([]);

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

  const handleStartGame = async () => {
    try {
      setTransactionError(null);
      setDealtCards([]);
      
      if (!account || !balatraContract) {
        await connectWallet();
        return;
      }

      const tx = await balatraContract.connect(account).startGame({
        value: ethers.parseEther(betAmount)
      });
      await tx.wait();

      setGameState({
        hands: [],
        currentHand: [],
        roundNumber: 1,
        totalMultiplier: 1,
        score: 0,
        isPlaying: true,
        result: null
      });

    } catch (err) {
      console.error("Error starting game:", err);
      setTransactionError(err.message);
    }
  };

  const handleDrawCard = async () => {
    try {
      setTransactionError(null);
      
      const tx = await balatraContract.connect(account).drawCard();
      await tx.wait();

      const updatedGame = await balatraContract.connect(account).getActiveGame();
      const currentHand = updatedGame.hands[updatedGame.hands.length - 1];
      const newCard = currentHand.cards[currentHand.cards.length - 1];

      // Add new card to animation state
      setDealtCards(prev => [...prev, currentHand.cards.length - 1]);

      setGameState(prev => ({
        ...prev,
        hands: updatedGame.hands,
        currentHand: currentHand.cards
      }));

    } catch (err) {
      console.error("Error drawing card:", err);
      setTransactionError(err.message);
    }
  };

  const handleCompleteHand = async () => {
    try {
      setTransactionError(null);
      
      const tx = await balatraContract.connect(account).completeHand();
      await tx.wait();

      const updatedGame = await balatraContract.connect(account).getActiveGame();
      
      if (updatedGame.state === 2) { // GameState.Completed
        setGameState(prev => ({
          ...prev,
          isPlaying: false,
          result: 'Game Complete!',
          score: updatedGame.score,
          totalMultiplier: updatedGame.totalMultiplier
        }));
      } else {
        setGameState(prev => ({
          ...prev,
          hands: updatedGame.hands,
          currentHand: [],
          roundNumber: updatedGame.roundNumber,
          score: updatedGame.score,
          totalMultiplier: updatedGame.totalMultiplier
        }));
        setDealtCards([]);
      }

    } catch (err) {
      console.error("Error completing hand:", err);
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
              <div className="cards">
                {gameState.currentHand.map((card, index) => (
                  <div 
                    key={index} 
                    className={`card ${dealtCards.includes(index) ? 'dealt' : ''} ${getSuitColor(card.suit)}`}
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
                  Draw Card
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
                score: 0,
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