import * as tf from '@tensorflow/tfjs';

class PokerDataLoader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 32;
    this.currentIndex = 0;
    this.data = [];
    this.shuffledIndices = [];
  }

  async loadData() {
    try {
      // Generate dummy data for testing
      const numSamples = 1000;
      const inputDim = 373;
      const outputDim = 4;

      // Generate dummy input data
      const xs = tf.randomNormal([numSamples, inputDim]);
      
      // Generate dummy output data (one-hot encoded)
      const ys = tf.oneHot(
        tf.randomUniform([numSamples], 0, 4, 'int32'),
        outputDim
      );

      this.data = {
        xs: xs,
        ys: ys
      };

      // Create shuffled indices
      this.shuffledIndices = Array.from(
        { length: numSamples }, 
        (_, i) => i
      );
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