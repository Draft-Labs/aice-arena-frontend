import * as tf from '@tensorflow/tfjs';
import PokerDataGenerator from '../data/dataGenerator.js';

class PokerDataLoader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 32;
    this.currentIndex = 0;
    this.data = [];
    this.shuffledIndices = [];
  }

  async loadData(numHands = 1000) {
    try {
      // Use PokerDataGenerator to generate data
      const generator = new PokerDataGenerator(numHands);
      const dataset = generator.generateDataset();

      // Convert dataset to tensors
      const xs = tf.tensor2d(dataset.map(d => d.input));
      const ys = tf.tensor2d(dataset.map(d => d.output));

      this.data = { xs, ys };

      // Create shuffled indices
      this.shuffledIndices = Array.from({ length: numHands }, (_, i) => i);
      this.shuffleData();
      this.currentIndex = 0;

      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  shuffleData() {
    // Fisher-Yates shuffle
    for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = 
      [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
  }

  async nextBatch(batchSize = this.batchSize) {
    if (!this.data.xs || !this.data.ys) {
      await this.loadData();
    }

    return tf.tidy(() => {
      // Get batch indices
      const batchIndices = this.shuffledIndices.slice(
        this.currentIndex,
        this.currentIndex + batchSize
      );

      // Convert indices to tensor
      const indicesTensor = tf.tensor1d(batchIndices, 'int32');

      // Update current index
      this.currentIndex += batchSize;
      if (this.currentIndex >= this.shuffledIndices.length) {
        this.currentIndex = 0;
        this.shuffleData();
      }

      // Gather batch data using tensor indices
      const batchXs = tf.gather(this.data.xs, indicesTensor);
      const batchYs = tf.gather(this.data.ys, indicesTensor);

      // Clean up the indices tensor
      indicesTensor.dispose();

      return {
        xs: batchXs,
        ys: batchYs
      };
    });
  }

  dispose() {
    if (this.data.xs) {
      this.data.xs.dispose();
    }
    if (this.data.ys) {
      this.data.ys.dispose();
    }
  }
}

export default PokerDataLoader; 