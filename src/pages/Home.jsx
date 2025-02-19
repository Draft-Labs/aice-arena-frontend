import { useState, useEffect, useRef } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { useOpenAI } from '../context/OpenAIContext';
import { useContractInteraction } from '../hooks/useContractInteraction';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import '../styles/Home.css';

function Home() {
  const { account, treasuryContract } = useWeb3();
  const { chatHistory, isLoading, error, sendMessage } = useOpenAI();
  const { checkTreasuryAccount } = useContractInteraction();
  const [houseFunds, setHouseFunds] = useState('0');
  const [hasAccount, setHasAccount] = useState(false);
  const [currentArtIndex, setCurrentArtIndex] = useState(0);
  const [charStates, setCharStates] = useState(new Map());
  const [hoverStates, setHoverStates] = useState(new Map());
  const waveTimeoutRef = useRef(null);
  const [inputMessage, setInputMessage] = useState('');
  const chatMessagesRef = useRef(null);

  const originalArt = `                ##%%%@@@@@@%%#{                                
               #%%@@@@@@@@@@%%%#}                                
              %@%@@@@@@@@@@@@@@@%#{                             
             %@@@@@@@@@@@@@@@[><{%%                              
            @@@@@@@@@@@@@@@@@%)-*}#{                             
            @@%%@@@@@@@@@@@@@%{+~]##                            
            @@%@@@@@@@@@@@@@@@{*=]##                           
             @%@@@@@@@@@@@@@@@{**}##                            
             %%@@@@@@@@@@@@@@@}=>##}                             
               @@@@@@@@@@@@@@%(=[%{                              
               @@@@@@@@@@@@@@#^<%##                              
               @@@@@@@@@@@@@@}^#%#                               
               @@@@@@@@@@@@@@@@%#{                               
              @@@@@@@@@@@@@@@@%##                                
            @@@@@@@@@@%%###{}#{                                  
         %@@@@@@@@@@%%%%##{###%%%%##{}                           
 @@%@@@@@%@@@@@@@@%%%%%###{##%%%%%%%%%%#{                        
@@@%@@@@%%%%%%%%%%%%%%########%%%%%%%%%%{<~                      
@@@%%%%%%%%%%%%%%%%%%%##########%########{}}()                   
@@@%%%%%%%%%%%%%%%%%%%%##############[*--~....-==               
##%#[[}{###%%%%%%%%%%%%%%########{]*~~-:-=:...~*<                
*=+[(<>>>><)(]}}{#%%%%#%#####{]*:::--:-~+-..~*<)]               
<>^[}])<<<<)))<>^+=*^)]}{{}(*......::--=<)>><)((<              
])){#}[((()))))))))<>*~:............:-=*(}[]((()`;

  const characterSets = ['@', '&', '$', '%', '#', '*', '+', '=', '>', '<', '^', '~'];

  const startWaveEffect = () => {
    const lines = originalArt.split('\n');
    const totalChars = lines.reduce((acc, line) => acc + line.length, 0);
    const specialChars = /[@%#}{\[\]<>\(\)-*+~\^=]/;
    let charIndex = 0;

    const updateChar = (x, y, delay) => {
      const key = `${x}-${y}`;
      setTimeout(() => {
        setCharStates(prev => {
          const newMap = new Map(prev);
          newMap.set(key, {
            char: characterSets[Math.floor(Math.random() * characterSets.length)],
            changing: true
          });
          // Reset after animation
          setTimeout(() => {
            setCharStates(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          }, 500);
          return newMap;
        });
      }, delay);
    };

    // Create wave effect
    lines.forEach((line, y) => {
      [...line].forEach((char, x) => {
        if (specialChars.test(char)) {
          // Calculate delay based on position
          const distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
          const delay = distance * 50; // Adjust this value to change wave speed
          updateChar(x, y, delay);
        }
      });
    });

    // Schedule next wave
    waveTimeoutRef.current = setTimeout(startWaveEffect, totalChars * 20);
  };

  useEffect(() => {
    startWaveEffect();
    return () => {
      if (waveTimeoutRef.current) {
        clearTimeout(waveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      if (treasuryContract) {
        try {
          const funds = await treasuryContract.getHouseFunds();
          setHouseFunds(ethers.formatEther(funds));
        } catch (err) {
          console.error('Error fetching house funds:', err);
        }
      }
    };

    init();
    const interval = setInterval(init, 5000);
    return () => clearInterval(interval);
  }, [treasuryContract]);

  useEffect(() => {
    const checkAccount = async () => {
      if (account) {
        const hasActiveAccount = await checkTreasuryAccount();
        setHasAccount(hasActiveAccount);
      }
    };
    checkAccount();
  }, [account, checkTreasuryAccount]);

  // Add auto-scroll effect for chat messages
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Handle message submission
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !account || isLoading) return;

    try {
      await sendMessage(inputMessage, account);
      setInputMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleCharacterHover = (x, y) => {
    const radius = 2; // Effect radius
    const affectedChars = new Map();
    
    // Add hover effect to surrounding characters
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const newX = x + dx;
        const newY = y + dy;
        const key = `${newX}-${newY}`;
        
        // Calculate distance from hover point for delay
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delay = distance * 10; // 100ms per unit of distance
        
        setTimeout(() => {
          setHoverStates(prev => {
            const newStates = new Map(prev);
            newStates.set(key, {
              char: characterSets[Math.floor(Math.random() * characterSets.length)],
              changing: true
            });
            // Remove the effect after animation
            setTimeout(() => {
              setHoverStates(prev => {
                const newStates = new Map(prev);
                newStates.delete(key);
                return newStates;
              });
            }, 500);
            return newStates;
          });
        }, delay);
      }
    }
  };

  const renderArtLayer = () => {
    const lines = originalArt.split('\n');
    return (
      <pre className="ascii-art-layer active">
        {lines.map((line, y) => (
          <div key={y}>
            {[...line].map((char, x) => {
              const key = `${x}-${y}`;
              const charState = charStates.get(key);
              const hoverState = hoverStates.get(key);
              const displayChar = hoverState?.char || charState?.char || char;
              const isChanging = charState?.changing || hoverState?.changing;
              
              return (
                <span
                  key={key}
                  className={`ascii-char ${isChanging ? 'hover-effect' : ''}`}
                  onMouseEnter={() => handleCharacterHover(x, y)}
                >
                  {displayChar}
                </span>
              );
            })}
          </div>
        ))}
      </pre>
    );
  };

  const renderChatBox = () => {
    return (
      <div className="aice-chat-box">
        <div className="chat-header">
          <h3>Aice Chat</h3>
          {isLoading && <div className="chat-loading">Aice is typing...</div>}
        </div>

        <div className="chat-messages" ref={chatMessagesRef}>
          <div className="chat-message system">
            Welcome to Aice Arena! {!account ? 'Connect your wallet to start chatting.' : 'How can I help you today?'}
          </div>
          
          {chatHistory.map((msg, index) => (
            <div 
              key={index} 
              className={`chat-message ${msg.role} ${msg.isError ? 'isError' : ''}`}
            >
              <p className='chat-sender'>{msg.sender === 'Aice' ? 'Aice' : 'You'}</p>
              <div className="message-content">{msg.content}</div>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}

          {error && (
            <div className="chat-message error">
              Error: {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="aice-input-container">
          <input
            type="text"
            className="aice-input"
            placeholder={account ? "Type a message..." : "Connect wallet to chat"}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!account || isLoading}
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!account || isLoading || !inputMessage.trim()}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="home-container">
      <div className="ascii-art-section">
        <div className="ascii-art-container">
          {renderArtLayer()}
        </div>
        {renderChatBox()}
      </div>
      <div className="main-content">
        <h1>Welcome to Aice Arena</h1>
        
        <div className="house-info">
          <h2>House Treasury</h2>
          <div className="treasury-amount">{houseFunds} AVAX</div>
        </div>

        {account && !hasAccount ? (
          <div className="account-prompt">
            <h2>Get Started</h2>
            <p>Open a casino account to start playing!</p>
            <Link to="/account" className="cta-button">
              Open Account
            </Link>
          </div>
        ) : account && hasAccount ? (
          <div className="game-selection">
            <h2>Choose Your Game</h2>
            <Link to="/poker" className="game-button">
              Play Poker
            </Link>
            <Link to="/blackjack" className="game-button">
              Play Blackjack
            </Link>
          </div>
        ) : (
          <div className="connect-prompt">
            <h2>Connect Your Wallet</h2>
            <p>Connect your wallet to start playing!</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;