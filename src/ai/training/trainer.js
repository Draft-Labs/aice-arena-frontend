import * as tf from '@tensorflow/tfjs-node';
import PokerDataLoader from './dataLoader.js';
import PokerDataFetcher from '../data/dataFetcher.js';

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
    
    const metrics = {
      loss: [],
      accuracy: []
    };

    tf.engine().startScope(); // Start a new scope

    try {
      for (let epoch = 0; epoch < this.epochs; epoch++) {
        const epochMetrics = {
          loss: 0,
          accuracy: 0
        };

        // Training loop
        for (let step = 0; step < this.stepsPerEpoch; step++) {
          const batchIterator = this.dataLoader.generateBatches(this.dataFetcher);
          const { value: batch, done } = await batchIterator.next();
          
          if (done) break;

          const stepMetrics = await this.trainStep(batch);
          epochMetrics.loss += stepMetrics.loss;
          epochMetrics.accuracy += stepMetrics.accuracy;

          // Clean up tensors
          batch.xs.dispose();
          batch.ys.dispose();
        }

        // Average metrics for epoch
        epochMetrics.loss /= this.stepsPerEpoch;
        epochMetrics.accuracy /= this.stepsPerEpoch;
        
        metrics.loss.push(epochMetrics.loss);
        metrics.accuracy.push(epochMetrics.accuracy);

        console.log(
          `Epoch ${epoch + 1}/${this.epochs}:`,
          `loss = ${epochMetrics.loss.toFixed(4)},`,
          `accuracy = ${epochMetrics.accuracy.toFixed(4)}`
        );

        // Save checkpoint
        if (this.checkpointPath) {
          await this.model.save(`file://${this.checkpointPath}-${epoch}`);
        }
      }
    } finally {
      tf.engine().endScope(); // End the scope in finally block
    }

    return metrics;
  }

  async trainStep(batch) {
    const { xs, ys } = batch;
    
    return tf.tidy(() => {
      // Get trainable variables - need to get them from the layers
      const trainableVars = [];
      this.model.model.layers.forEach(layer => {
        const weights = layer.getWeights().filter(w => w.trainable);
        trainableVars.push(...weights);
      });

      if (trainableVars.length === 0) {
        throw new Error('No trainable variables found in model');
      }

      // Compute gradients and loss together
      const { value: loss, grads } = tf.variableGrads(() => {
        const predictions = this.model.model.predict(xs);
        return tf.losses.softmaxCrossEntropy(ys, predictions);
      }, trainableVars);
      
      // Apply gradients
      this.model.model.optimizer.applyGradients(grads);
      
      // Calculate accuracy
      const predictions = this.model.model.predict(xs);
      const predIndices = predictions.argMax(-1);
      const labelIndices = ys.argMax(-1);
      const accuracy = predIndices.equal(labelIndices).mean();

      return {
        loss: loss.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    });
  }

  dispose() {
    // Clean up dataLoader
    if (this.dataLoader) {
      this.dataLoader.dispose();
    }
    
    // Clean up model
    if (this.model && this.model.model) {
      this.model.model.dispose();
    }
    
    // Clean up any remaining variables
    tf.disposeVariables();

    // Clean up any remaining tensors
    const backend = tf.getBackend();
    if (backend === 'webgl') {
      tf.webgl.forceRestoreContext();
    }
  }
}

export default PokerTrainer; 