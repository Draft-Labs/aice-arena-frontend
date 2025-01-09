// Convert IRC poker notation to our card numbers (1-52)
const RANKS = {'2':0, '3':1, '4':2, '5':3, '6':4, '7':5, '8':6, '9':7, 'T':8, 'J':9, 'Q':10, 'K':11, 'A':12};
const SUITS = {'h':0, 'd':1, 'c':2, 's':3};

export function convertCard(cardString) {
  if (!cardString || cardString.length !== 2) {
    return 0; // Return 0 for unknown/invalid cards
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
  if (cardNumber === 0) return '--';
  
  cardNumber -= 1; // Convert to 0-51
  const suit = Math.floor(cardNumber / 13);
  const rank = cardNumber % 13;
  
  const rankSymbols = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const suitSymbols = ['h','d','c','s'];
  
  return rankSymbols[rank] + suitSymbols[suit];
} 