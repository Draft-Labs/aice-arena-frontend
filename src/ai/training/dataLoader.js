import * as tf from '@tensorflow/tfjs';
import PokerDataGenerator from '../data/dataGenerator.js';

class PokerDataLoader {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 32;
    this.validationSplit = options.validationSplit || 0.2;
    this.generator = new PokerDataGenerator(options.numHands || 10000);
  }

  async loadData() {
    try {
      // Generate and process dataset
      const dataset = this.generator.generateDataset();
      
      // Split into training and validation
      const splitIndex = Math.floor(dataset.length * (1 - this.validationSplit));
      const trainData = dataset.slice(0, splitIndex);
      const valData = dataset.slice(splitIndex);
      
      // Convert to tensors
      this.trainData = {
        xs: tf.tensor2d(trainData.map(d => d.input)),
        ys: tf.tensor2d(trainData.map(d => d.output))
      };
      
      this.valData = {
        xs: tf.tensor2d(valData.map(d => d.input)),
        ys: tf.tensor2d(valData.map(d => d.output))
      };
      
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      throw error;
    }
  }

  async nextBatch() {
    return tf.tidy(() => {
      const batchIndices = tf.randomUniform([this.batchSize], 0, this.trainData.xs.shape[0], 'int32');
      
      return {
        xs: tf.gather(this.trainData.xs, batchIndices),
        ys: tf.gather(this.trainData.ys, batchIndices)
      };
    });
  }

  getValidationData() {
    return this.valData;
  }

  dispose() {
    if (this.trainData) {
      this.trainData.xs.dispose();
      this.trainData.ys.dispose();
    }
    if (this.valData) {
      this.valData.xs.dispose();
      this.valData.ys.dispose();
    }
  }
}

export default PokerDataLoader; 