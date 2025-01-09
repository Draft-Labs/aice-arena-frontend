import * as tf from '@tensorflow/tfjs-node';
import PokerDataLoader from './dataLoader';
import PokerDataFetcher from '../data/dataFetcher';

class PokerTrainer {
  constructor(model, options = {}) {
    this.model = model;
    this.dataLoader = new PokerDataLoader(options);
    this.dataFetcher = new PokerDataFetcher();
    
    this.epochs = options.epochs || 100;
    this.stepsPerEpoch = options.stepsPerEpoch || 50;
    this.validationSteps = options.validationSteps || 10;
    this.checkpointPath = options.checkpointPath || 'poker-model';
    
    // Add performance monitoring
    this.metrics = {
      trainTime: [],
      memoryUsage: []
    };
  }

  async train() {
    console.log('Starting training...');
    console.log('Backend:', tf.getBackend());
    
    const batchIterator = this.dataLoader.generateBatches(this.dataFetcher);
    const { value: batch } = await batchIterator.next();
    const metrics = await this.trainStep(batch);
    
    // Clean up tensors
    batch.xs.dispose();
    batch.ys.dispose();
    
    return metrics;
  }

  async trainStep(batch) {
    const { xs, ys } = batch;
    
    const metrics = tf.tidy(() => {
      // Get predictions
      const predictions = this.model.predict(xs);
      
      // Calculate loss
      const loss = tf.losses.softmaxCrossEntropy(ys, predictions).asScalar();
      
      // Calculate accuracy using argMax comparison
      const predIndices = predictions.argMax(-1);  // Changed to -1 for last dimension
      const labelIndices = ys.argMax(-1);
      const correctPredictions = predIndices.equal(labelIndices);
      const accuracy = correctPredictions.mean();
      
      // Get values synchronously
      return {
        loss: loss.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    });
    
    return metrics;
  }

  dispose() {
    this.dataLoader.dispose();
  }
}

export default PokerTrainer; 