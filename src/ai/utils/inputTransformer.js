import CardConverter from './cardConverter.js';

class InputTransformer {
  constructor() {
    // 52 cards * 2 (hole cards) + 52 cards * 5 (community cards) + 6 (position) + 3 (stack, pot, bet)
    this.inputDimension = 373;
    
    // Individual dimensions for validation
    this.cardEncodingSize = 52;
    this.holeCardsSize = this.cardEncodingSize * 2;     // 104
    this.communityCardsSize = this.cardEncodingSize * 5; // 260
    this.positionSize = 6;
    this.numericFeatures = 3; // stack, pot, bet
  }

  transformCards(cards, maxCards) {
    // Initialize array of 52 zeros for each possible card slot
    const encoding = new Array(this.cardEncodingSize * maxCards).fill(0);
    
    cards.forEach((card, cardIndex) => {
      const cardObj = typeof card === 'string' ? CardConverter.stringToCard(card) : card;
      const index = (cardIndex * this.cardEncodingSize) + cardObj.rank + (cardObj.suit * 13);
      encoding[index] = 1;
    });
    
    return encoding;
  }

  transformPosition(position) {
    const positions = ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
    const encoding = new Array(this.positionSize).fill(0);
    const index = positions.indexOf(position);
    if (index !== -1) {
      encoding[index] = 1;
    }
    return encoding;
  }

  normalizeValue(value, maxValue) {
    return Math.min(1, Math.max(0, value / maxValue));
  }

  transformState(gameState) {
    try {
      // Transform hole cards (2 cards)
      const holeCardsEncoding = this.transformCards(gameState.holeCards, 2);
      
      // Transform community cards (up to 5 cards)
      const communityCardsEncoding = this.transformCards(gameState.communityCards || [], 5);
      
      // Transform position
      const positionEncoding = this.transformPosition(gameState.position);
      
      // Normalize stack and pot values
      const stackNorm = this.normalizeValue(gameState.stack, 20000);
      const potNorm = this.normalizeValue(gameState.potSize, 40000);
      const betNorm = this.normalizeValue(gameState.betAmount || 0, 20000);
      
      // Combine all features
      const encoding = [
        ...holeCardsEncoding,        // 104 values
        ...communityCardsEncoding,   // 260 values
        ...positionEncoding,         // 6 values
        stackNorm,                   // 1 value
        potNorm,                     // 1 value
        betNorm                      // 1 value
      ];
      
      // Validate encoding length
      if (encoding.length !== this.inputDimension) {
        throw new Error(`Invalid encoding length: ${encoding.length}, expected ${this.inputDimension}`);
      }
      
      return encoding;
    } catch (error) {
      console.error('Error transforming state:', error);
      throw error;
    }
  }
}

export default InputTransformer; 