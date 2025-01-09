import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE, ACTIONS } from '../utils/constants';
import InputTransformer from '../utils/inputTransformer';

class PokerDataLoader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 32;
    this.validationSplit = options.validationSplit || 0.2;
    this.shuffleBuffer = options.shuffleBuffer || 1000;
    this.maxHandsInMemory = options.maxHandsInMemory || 10000;
    this.transformer = new InputTransformer();
  }

  async * generateBatches(dataFetcher) {
    let hands = [];
    let currentIndex = 0;

    while (true) {
      // Fetch more hands if buffer is low
      if (currentIndex + this.batchSize >= hands.length) {
        const newHands = await dataFetcher.fetchData();
        hands = [...hands.slice(currentIndex), ...newHands];
        currentIndex = 0;
      }

      // Create batch
      const batchHands = hands.slice(currentIndex, currentIndex + this.batchSize);
      const { xs, ys } = this.transformHandsToBatch(batchHands);
      
      yield { xs, ys };
      currentIndex += this.batchSize;
    }
  }

  // Transform poker hands into training data
  transformHandsToBatch(hands) {
    const inputs = [];
    const labels = [];

    for (const hand of hands) {
      // Extract decision points from each hand
      for (const action of hand.actions) {
        // Create input state
        const gameState = {
          holeCards: hand.players.find(p => p.name === action.player).cards,
          communityCards: hand.communityCards,
          position: action.relativePosition,
          stack: action.stackAfterAction,
          potSize: action.potAfterAction,
          betAmount: action.amount || 0
        };

        // Transform state to input vector
        const input = this.transformer.transformState(gameState);
        inputs.push(input);

        // Create one-hot encoded label
        const label = new Array(OUTPUT_SIZE).fill(0);
        label[action.action] = 1;
        labels.push(label);
      }
    }

    // Convert to tensors
    return {
      xs: tf.tensor2d(inputs),
      ys: tf.tensor2d(labels)
    };
  }

  // Add utility method for memory cleanup
  dispose() {
    // Clean up any tensors we're storing
    // (will be used when implementing data augmentation)
  }
}

export default PokerDataLoader; 