import { INPUT_SIZE, POSITIONS } from './constants';

class InputTransformer {
  constructor() {
    // Input dimensions
    this.cardDims = 52;      // One-hot encoding for each card
    this.positionDims = 6;   // BTN, SB, BB, EARLY, MIDDLE, LATE
    this.stackDims = 1;      // Normalized stack size
    this.potDims = 1;        // Normalized pot size
    this.oddsDims = 1;       // Pot odds
  }

  // Fix card encoding to handle array indices correctly
  encodeCard(cardNumber, slotIndex) {
    const encoding = new Array(this.cardDims).fill(0);
    if (cardNumber > 0 && cardNumber <= 52) {
      // Calculate the correct position in the input vector
      const cardPosition = (slotIndex * this.cardDims) + (cardNumber - 1);
      encoding[cardNumber - 1] = 1;
    }
    return encoding;
  }

  // Convert position to one-hot encoding
  encodePosition(position) {
    const encoding = new Array(this.positionDims).fill(0);
    if (position >= 0 && position < this.positionDims) {
      encoding[position] = 1;
    }
    return encoding;
  }

  // Transform a poker hand state into neural network input
  transformState(state) {
    const input = new Array(INPUT_SIZE).fill(0);
    let offset = 0;

    // Encode hole cards (2 * 52 dimensions)
    for (let i = 0; i < Math.min(2, state.holeCards.length); i++) {
      const cardNumber = state.holeCards[i];
      // Place each card in its own 52-card slot
      const startPos = i * this.cardDims;
      if (cardNumber > 0 && cardNumber <= 52) {
        input[startPos + (cardNumber - 1)] = 1;
      }
      offset += this.cardDims;
    }

    // Encode community cards (5 * 52 dimensions)
    for (let i = 0; i < Math.min(5, state.communityCards.length); i++) {
      const cardNumber = state.communityCards[i];
      // Place each card in its own 52-card slot, after hole cards
      const startPos = (i + 2) * this.cardDims;
      if (cardNumber > 0 && cardNumber <= 52) {
        input[startPos + (cardNumber - 1)] = 1;
      }
      offset += this.cardDims;
    }

    // Skip to end of card section
    offset = 7 * this.cardDims;

    // Encode position (6 dimensions)
    const positionEncoding = this.encodePosition(state.position);
    input.splice(offset, this.positionDims, ...positionEncoding);
    offset += this.positionDims;

    // Add normalized values
    input[offset] = this.normalizeStack(state.stack);
    input[offset + 1] = this.normalizePot(state.potSize);
    input[offset + 2] = this.calculatePotOdds(state.betAmount, state.potSize);

    return input;
  }

  // Normalize stack size (0-1 range)
  normalizeStack(stack, maxStack = 1000) {
    return Math.min(1, Math.max(0, stack / maxStack));
  }

  // Normalize pot size relative to starting stack
  normalizePot(pot, startingStack = 1000) {
    return Math.min(1, Math.max(0, pot / (startingStack * 4))); // Max 4x starting stack
  }

  // Calculate pot odds
  calculatePotOdds(betAmount, potSize) {
    if (!betAmount || !potSize) return 0;
    return betAmount / (potSize + betAmount);
  }

  // Validate input dimensions and values
  validateInput(input) {
    if (input.length !== INPUT_SIZE) {
      throw new Error(`Invalid input size: ${input.length}, expected ${INPUT_SIZE}`);
    }
    if (!input.every(val => val >= 0 && val <= 1)) {
      throw new Error('Input values must be normalized between 0 and 1');
    }
    return true;
  }
}

export default InputTransformer; 