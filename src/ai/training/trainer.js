import * as tf from '@tensorflow/tfjs';
import PokerDataLoader from './dataLoader.js';
import PerformanceMetrics from '../utils/performanceMetrics.js';

class PokerTrainer {
  constructor(model, options = {}) {
    this.model = model;
    this.dataLoader = new PokerDataLoader(options);
    
    this.epochs = options.epochs || 100;
    this.batchSize = options.batchSize || 32;
    this.validationSteps = options.validationSteps || 10;
    
    // Configure optimizer
    this.optimizer = tf.train.adam(options.learningRate || 0.001);
    
    // Add new metric tracking
    this.metrics = new PerformanceMetrics();
    
    // Add learning rate scheduling
    this.initialLearningRate = options.learningRate || 0.001;
    this.minLearningRate = options.minLearningRate || 1e-6;
    this.learningRateDecay = options.learningRateDecay || 0.95;
    
    // Add early stopping
    this.patience = options.patience || 5;
    this.bestLoss = Infinity;
    this.patienceCounter = 0;
  }

  calculateLoss(predictions, labels) {
    return tf.tidy(() => {
      // Using categorical crossentropy for multi-class classification
      return tf.losses.softmaxCrossEntropy(labels, predictions);
    });
  }

  calculateAccuracy(predictions, labels) {
    return tf.tidy(() => {
      const predIndices = predictions.argMax(1);
      const labelIndices = labels.argMax(1);
      return predIndices.equal(labelIndices).mean();
    });
  }

  async trainStep(batch) {
    const startTime = Date.now();
    
    return tf.tidy(() => {
      const { xs, ys } = batch;
      const predictions = this.model.predict(xs);
      const loss = this.calculateLoss(predictions, ys);
      
      // Update metrics
      this.metrics.updateTrainingMetrics(batch, predictions, loss, startTime);
      
      return {
        loss: loss.dataSync()[0],
        predictions,
        metrics: this.metrics.getFormattedMetrics()
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
        const epochMetrics = await this.trainEpoch();
        metrics.loss.push(epochMetrics.loss);
        metrics.accuracy.push(epochMetrics.accuracy);
        
        console.log(
          `Epoch ${epoch + 1}/${this.epochs}:`,
          `loss = ${epochMetrics.loss.toFixed(4)},`,
          `accuracy = ${epochMetrics.accuracy.toFixed(4)}`
        );
      }
    } catch (error) {
      console.error('Training error:', error);
      throw error;
    }

    return metrics;
  }

  async trainEpoch() {
    const epochMetrics = {
      loss: 0,
      accuracy: 0,
      steps: 0
    };

    const stepsPerEpoch = this.validationSteps;
    
    for (let step = 0; step < stepsPerEpoch; step++) {
      const batch = await this.dataLoader.nextBatch(this.batchSize);
      
      if (!batch || !batch.xs || !batch.ys) continue;
      
      const stepMetrics = await tf.tidy(() => {
        // Forward pass
        const { xs, ys } = batch;
        
        // Wrap the forward and backward passes in tf.variableGrads
        const { value: loss, grads } = tf.variableGrads(() => {
          const predictions = this.model.predict(xs);
          return this.calculateLoss(predictions, ys);
        });
        
        // Apply gradients
        this.optimizer.applyGradients(grads);
        
        // Calculate accuracy
        const predictions = this.model.predict(xs);
        const accuracy = this.calculateAccuracy(predictions, ys);
        
        return {
          loss: loss.dataSync()[0],
          accuracy: accuracy.dataSync()[0]
        };
      });
      
      epochMetrics.loss += stepMetrics.loss;
      epochMetrics.accuracy += stepMetrics.accuracy;
      epochMetrics.steps++;
      
      // Clean up batch tensors
      tf.dispose([batch.xs, batch.ys]);
    }
    
    return {
      loss: epochMetrics.loss / epochMetrics.steps,
      accuracy: epochMetrics.accuracy / epochMetrics.steps
    };
  }

  dispose() {
    if (this.dataLoader) {
      this.dataLoader.dispose();
    }
  }
}

export default PokerTrainer; 