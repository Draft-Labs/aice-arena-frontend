// Convert card numbers (1-52) to one-hot encoded vectors
export function encodeCard(cardNumber) {
  const vector = new Array(52).fill(0);
  if (cardNumber > 0 && cardNumber <= 52) {
    vector[cardNumber - 1] = 1;
  }
  return vector;
}

// Convert array of cards to one-hot encoded matrix
export function encodeCards(cards) {
  return cards.reduce((encoded, card) => {
    return encoded.concat(encodeCard(card));
  }, []);
}

// Normalize numeric values between 0 and 1
export function normalizeValue(value, max) {
  return value / max;
} 