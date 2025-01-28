import { useState, useEffect } from 'react';
import '../styles/Background.css';

const Background = () => {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const createCard = () => {
      const id = Math.random();
      const left = Math.random() * 100;
      const duration = 15 + Math.random() * 10;
      const initialDelay = Math.random() * 5;
      return { 
        id, 
        left, 
        style: {
          left: `${left}%`,
          animation: `fall ${duration}s linear ${initialDelay}s infinite`
        }
      };
    };

    const initialCards = Array.from({ length: 20 }, createCard);
    setCards(initialCards);

    const interval = setInterval(() => {
      setCards(prevCards => {
        const newCard = createCard();
        const randomIndex = Math.floor(Math.random() * prevCards.length);
        const updatedCards = [...prevCards];
        updatedCards[randomIndex] = newCard;
        return updatedCards;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="background-container">
      {cards.map(card => (
        <div
          key={card.id}
          id={`card-${card.id}`}
          className="falling-card"
          style={card.style}
        />
      ))}
    </div>
  );
};

export default Background; 