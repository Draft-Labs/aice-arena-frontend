/**
 * Card conversion utilities for poker hand processing
 */

// Card ranks and suits in order
const RANKS = '23456789TJQKA';  // Ace is highest (index 12)
const SUITS = 'hdcs';           // hearts, diamonds, clubs, spades

/**
 * Convert a card string (e.g., 'Ah') to a 0-51 index
 * @param {string} card - Card in format like 'Ah' for Ace of hearts
 * @returns {number} Index 0-51 representing the card
 */
export function convertCardToIndex(card) {
  if (!card || card.length !== 2) {
    throw new Error(`Invalid card format: ${card}`);
  }

  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();

  const rankIndex = RANKS.indexOf(rank);
  const suitIndex = SUITS.indexOf(suit);

  if (rankIndex === -1 || suitIndex === -1) {
    throw new Error(`Invalid card: ${card}`);
  }

  // Calculate index: (rank * 4) + suit
  // This gives us:
  // 2h = 0, 2d = 1, 2c = 2, 2s = 3
  // 3h = 4, 3d = 5, 3c = 6, 3s = 7
  // ...
  // Kh = 44, Kd = 45, Kc = 46, Ks = 47
  // Ah = 48, Ad = 49, Ac = 50, As = 51
  const index = (rankIndex * 4) + suitIndex;
  
  // Debug log
  console.log(`Converting ${card}: rank=${rank}(${rankIndex}), suit=${suit}(${suitIndex}) -> index=${index}`);
  
  // Verify index is correct
  const expectedRank = Math.floor(index / 4);
  const expectedSuit = index % 4;
  if (expectedRank !== rankIndex || expectedSuit !== suitIndex) {
    console.error('Card conversion error:', {
      card,
      rank: { value: rank, index: rankIndex, expected: expectedRank },
      suit: { value: suit, index: suitIndex, expected: expectedSuit },
      index
    });
  }
  
  return index;
}

/**
 * Convert a 0-51 index back to a card string
 * @param {number} index - Index 0-51 representing a card
 * @returns {string} Card in format like 'Ah' for Ace of hearts
 */
export function convertIndexToCard(index) {
  if (index < 0 || index > 51) {
    throw new Error(`Invalid card index: ${index}`);
  }

  const rankIndex = Math.floor(index / 4);
  const suitIndex = index % 4;

  return RANKS[rankIndex] + SUITS[suitIndex];
}

/**
 * Check if a card string is valid
 * @param {string} card - Card in format like 'Ah' for Ace of hearts
 * @returns {boolean} True if card format is valid
 */
export function isValidCard(card) {
  if (!card || card.length !== 2) return false;
  
  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  
  return RANKS.includes(rank) && SUITS.includes(suit);
}

/**
 * Convert an array of card strings to indices
 * @param {string[]} cards - Array of cards in format like ['Ah', 'Kd']
 * @returns {number[]} Array of indices 0-51
 */
export function convertCardsToIndices(cards) {
  return cards.map(convertCardToIndex);
}

/**
 * Convert an array of indices to card strings
 * @param {number[]} indices - Array of indices 0-51
 * @returns {string[]} Array of cards in format like ['Ah', 'Kd']
 */
export function convertIndicesToCards(indices) {
  return indices.map(convertIndexToCard);
}

/**
 * Export the function directly
 * @param {string} handString - String representation of a poker hand
 * @returns {number[]} Array of indices 0-51 representing the hand
 */
export function convertHand(handInput) {
    if (!handInput) return [];
    
    // If input is already an array of card objects, return it
    if (Array.isArray(handInput) && typeof handInput[0] === 'object') {
        return handInput;
    }
    
    // If input is a string, split it
    const handString = typeof handInput === 'string' ? handInput : handInput.join(' ');
    
    // Split the hand string into individual cards
    const cards = handString.split(' ').map(card => ({
        rank: card[0].toUpperCase(),
        suit: card[1].toLowerCase()
    }));
    
    return cards;
}

/**
 * Export other utility functions if needed
 * @param {number} index - Index 0-51 representing a card
 * @returns {string} Card in format like 'Ah' for Ace of hearts
 */
export function convertCardIndex(index) {
    const ranks = '23456789TJQKA';
    const suits = 'hdcs';
    
    const rankIndex = index % 13;
    const suitIndex = Math.floor(index / 13);
    
    return ranks[rankIndex] + suits[suitIndex];
} 