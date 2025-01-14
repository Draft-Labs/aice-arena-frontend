import * as tf from '@tensorflow/tfjs';
import PokerDataGenerator from '../data/dataGenerator.js';

class PokerDataLoader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 32;
    this.validationSplit = options.validationSplit || 0.2;
    this.currentIndex = 0;
    this.data = [];
    this.shuffledIndices = [];
  }

  async loadData(numHands = 1000) {
    try {
      const generator = new PokerDataGenerator(numHands);
      const dataset = generator.generateDataset();

      // Normalize features
      dataset.forEach(d => {
        d.input[364] /= 1000; // Normalize stack size
        d.input[365] /= 1000; // Normalize pot size
      });

      // Convert dataset to tensors
      const xs = tf.tensor2d(dataset.map(d => d.input));
      const ys = tf.tensor2d(dataset.map(d => d.output));

      this.data = { xs, ys };

      // Split data into training and validation sets
      const numValidationSamples = Math.floor(numHands * this.validationSplit);
      this.trainIndices = Array.from({ length: numHands - numValidationSamples }, (_, i) => i);
      this.validationIndices = Array.from({ length: numValidationSamples }, (_, i) => numHands - numValidationSamples + i);

      this.shuffleData();
      this.currentIndex = 0;

      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  shuffleData() {
    for (let i = this.trainIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.trainIndices[i], this.trainIndices[j]] = 
      [this.trainIndices[j], this.trainIndices[i]];
    }
  }

  async nextBatch(batchSize = this.batchSize) {
    if (!this.data.xs || !this.data.ys) {
      await this.loadData();
    }

    return tf.tidy(() => {
      const batchIndices = this.trainIndices.slice(
        this.currentIndex,
        this.currentIndex + batchSize
      );

      const indicesTensor = tf.tensor1d(batchIndices, 'int32');

      this.currentIndex += batchSize;
      if (this.currentIndex >= this.trainIndices.length) {
        this.currentIndex = 0;
        this.shuffleData();
      }

      const batchXs = tf.gather(this.data.xs, indicesTensor);
      const batchYs = tf.gather(this.data.ys, indicesTensor);

      indicesTensor.dispose();

      return {
        xs: batchXs,
        ys: batchYs
      };
    });
  }

  getValidationData() {
    return tf.tidy(() => {
      const indicesTensor = tf.tensor1d(this.validationIndices, 'int32');
      const validationXs = tf.gather(this.data.xs, indicesTensor);
      const validationYs = tf.gather(this.data.ys, indicesTensor);
      indicesTensor.dispose();
      return { xs: validationXs, ys: validationYs };
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