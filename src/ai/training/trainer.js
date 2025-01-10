import * as tf from '@tensorflow/tfjs';
import PokerDataLoader from './dataLoader.js';

class PokerTrainer {
  constructor(model, options = {}) {
    this.model = model;
    this.dataLoader = new PokerDataLoader(options);
    
    this.epochs = options.epochs || 100;
    this.batchSize = options.batchSize || 32;
    this.validationSteps = options.validationSteps || 10;
    
    // Configure optimizer
    this.optimizer = tf.train.adam(options.learningRate || 0.001);
  }

  async trainStep(batch) {
    return tf.tidy(() => {
      const { xs, ys } = batch;
      
      // Use tf.variableGrads to compute gradients
      const { value, grads } = tf.variableGrads(() => {
        const predictions = this.model.model.predict(xs);
        return tf.losses.softmaxCrossEntropy(ys, predictions);
      });
      
      // Apply gradients
      this.optimizer.applyGradients(grads);
      
      // Calculate accuracy
      const predictions = this.model.model.predict(xs);
      const accuracy = this.calculateAccuracy(predictions, ys);
      
      return {
        loss: value.dataSync()[0],
        accuracy: accuracy.dataSync()[0]
      };
    });
  }

  async train() {
    console.log('Starting training...');
    
    const metrics = {
      loss: [],
      accuracy: []
    };

    try {
      for (let epoch = 0; epoch < this.epochs; epoch++) {
        const epochMetrics = {
          loss: 0,
          accuracy: 0,
          steps: 0
        };

        // Training loop
        const stepsPerEpoch = Math.floor(1000 / this.batchSize);
        for (let step = 0; step < stepsPerEpoch; step++) {
          const batch = await this.dataLoader.nextBatch(this.batchSize);
          const stepMetrics = await this.trainStep(batch);
          
          epochMetrics.loss += stepMetrics.loss;
          epochMetrics.accuracy += stepMetrics.accuracy;
          epochMetrics.steps += 1;

          // Clean up tensors
          tf.dispose([batch.xs, batch.ys]);
        }

        // Calculate epoch averages
        const avgLoss = epochMetrics.loss / epochMetrics.steps;
        const avgAccuracy = epochMetrics.accuracy / epochMetrics.steps;

        // Log epoch results
        console.log(
          `Epoch ${epoch + 1}/${this.epochs}:`,
          `loss = ${avgLoss.toFixed(4)},`,
          `accuracy = ${avgAccuracy.toFixed(4)}`
        );

        metrics.loss.push(avgLoss);
        metrics.accuracy.push(avgAccuracy);
      }
    } finally {
      // Clean up any remaining tensors
      tf.disposeVariables();
    }

    return metrics;
  }

  calculateAccuracy(predictions, labels) {
    return tf.tidy(() => {
      const predIndices = predictions.argMax(-1);
      const labelIndices = labels.argMax(-1);
      return predIndices.equal(labelIndices).mean();
    });
  }

  dispose() {
    if (this.dataLoader) {
      this.dataLoader.dispose();
    }
  }
}

export default PokerTrainer; 