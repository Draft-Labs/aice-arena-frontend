import { convertCardToIndex } from '../utils/cardConverter.js';
import { ACTIONS, POSITIONS, MODEL_CONFIG } from '../utils/constants.js';
import HandEvaluator from '../utils/handEvaluator.js';

class PokerDataGenerator {
  constructor(numHands) {
    this.numHands = numHands;
    this.evaluator = new HandEvaluator();
  }

  generateRandomCard() {
    const ranks = '23456789TJQKA';
    const suits = 'hsdc'; // hearts, spades, diamonds, clubs
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    return `${rank}${suit}`;
  }

  generateRandomHand() {
    const holeCards = [this.generateRandomCard(), this.generateRandomCard()];
    const communityCards = Array(5).fill(null).map(() => this.generateRandomCard());
    const position = Object.keys(POSITIONS)[Math.floor(Math.random() * Object.keys(POSITIONS).length)];
    const stackSize = Math.random() * 1000;
    const potSize = Math.random() * 1000;
    const action = Object.values(ACTIONS)[Math.floor(Math.random() * Object.values(ACTIONS).length)];

    return {
      holeCards,
      communityCards,
      position,
      stackSize,
      potSize,
      action
    };
  }

  encodeHand(hand) {
    const input = new Array(373).fill(0);

    // Encode hole cards
    hand.holeCards.forEach(card => {
      const index = convertCardToIndex(card);
      input[index] = 1;
    });

    // Encode community cards
    hand.communityCards.forEach(card => {
      const index = convertCardToIndex(card);
      input[104 + index] = 1;
    });

    // Encode position
    const positionKeys = Object.keys(POSITIONS);
    const positionIndex = positionKeys.indexOf(hand.position);
    input[364 + positionIndex] = 1;

    // Normalize stack size and pot size
    input[364] = hand.stackSize / 1000;
    input[365] = hand.potSize / 1000;

    return input;
  }

  createTargetVector(action) {
    const output = new Array(4).fill(0);
    const actionIndex = MODEL_CONFIG.ACTION_MAP[action];
    if (actionIndex !== undefined) {
      output[actionIndex] = 1;
    }
    return output;
  }

  generateDataset() {
    const dataset = [];
    for (let i = 0; i < this.numHands; i++) {
      const hand = this.generateRandomHand();
      const input = this.encodeHand(hand);
      const output = this.createTargetVector(hand.action);
      dataset.push({ input, output });
    }
    return dataset;
  }
}

export default PokerDataGenerator;

// Usage
const generator = new PokerDataGenerator(10000);
const dataset = generator.generateDataset();
console.log('Generated dataset:', dataset); 