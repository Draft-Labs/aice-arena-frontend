// Convert IRC poker notation to our card numbers (1-52)
const RANKS = {
  'A': 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  'T': 9,
  'J': 10,
  'Q': 11,
  'K': 12
};

const SUITS = {'h':0, 'd':1, 'c':2, 's':3};

export function convertCard(cardString) {
  if (!cardString || cardString.length !== 2) {
    return 0;
  }
  
  const rank = RANKS[cardString[0].toUpperCase()];
  const suit = SUITS[cardString[1].toLowerCase()];
  
  if (rank === undefined || suit === undefined) {
    return 0;
  }
  
  // Convert to 1-52 format
  return (suit * 13) + rank + 1;
}

// Convert a hand string like "Ah Kd" to card numbers
export function convertHand(handString) {
  const cards = handString.trim().split(' ');
  return cards.map(card => convertCard(card));
}

// For debugging
export function cardToString(cardNumber) {
  if (cardNumber < 1 || cardNumber > 52) return null;
  
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const suits = ['h', 'd', 'c', 's'];
  
  // Convert 1-52 to rank and suit
  const rank = ranks[(cardNumber - 1) % 13];
  const suit = suits[Math.floor((cardNumber - 1) / 13)];
  
  return rank + suit;
} 