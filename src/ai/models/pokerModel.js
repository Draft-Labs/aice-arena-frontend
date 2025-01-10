import * as tf from '@tensorflow/tfjs';
import { MODEL_CONFIG } from '../utils/constants.js';
import ModelMetrics from '../utils/metrics';
import EarlyStopping from '../utils/callbacks';

class PokerModel {
  constructor() {
    this.model = null;
    this.inputShape = [MODEL_CONFIG.INPUT_SIZE];
    this.outputShape = MODEL_CONFIG.OUTPUT_SIZE;
    this.metrics = new ModelMetrics();
    this.earlyStopping = new EarlyStopping({
      patience: 5,
      minDelta: 0.001,
      monitor: 'val_loss',
      verbose: true
    });
  }

  // Create the model architecture
  async buildModel() {
    // Create sequential model
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [373],
          units: 512,
          activation: 'relu',
          kernelInitializer: 'glorotNormal',
          useBias: true,
          trainable: true
        }),
        tf.layers.batchNormalization({
          trainable: true
        }),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          kernelInitializer: 'glorotNormal',
          useBias: true,
          trainable: true
        }),
        tf.layers.batchNormalization({
          trainable: true
        }),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          kernelInitializer: 'glorotNormal',
          useBias: true,
          trainable: true
        }),
        tf.layers.batchNormalization({
          trainable: true
        }),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 4,
          activation: 'softmax',
          kernelInitializer: 'glorotNormal',
          useBias: true,
          trainable: true
        })
      ]
    });

    // Compile model
    this.model.compile({
      optimizer: tf.train.adam(MODEL_CONFIG.LEARNING_RATE),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    // Initialize variables by doing a forward pass
    const dummyData = tf.zeros([1, 373]);
    this.model.predict(dummyData);
    dummyData.dispose();

    // Verify trainable variables
    const trainableVars = [];
    this.model.layers.forEach(layer => {
      const weights = layer.getWeights().filter(w => w.trainable);
      trainableVars.push(...weights);
    });
    
    if (trainableVars.length === 0) {
      throw new Error('Model initialization failed - no trainable variables found');
    }

    return this.model;
  }

  // Get model summary
  summary() {
    if (!this.model) {
      this.buildModel();
    }
    return this.model.summary();
  }

  // Save model
  async save(path) {
    if (!this.model) {
      throw new Error('No model to save');
    }
    await this.model.save(path);
  }

  // Load model
  async load(path) {
    this.model = await tf.loadLayersModel(path);
    return this;
  }

  // Get action probabilities
  predict(input) {
    if (!this.model) {
      throw new Error('Model not initialized. Call buildModel() first.');
    }
    return this.model.predict(input);
  }

  // Get best action
  async getBestAction(input) {
    const probs = await this.predict(input);
    return probs.indexOf(Math.max(...probs));
  }

  // Update training method
  async train(xs, ys, options = {}) {
    if (!this.model) this.buildModel();
    
    this.metrics.reset();
    this.earlyStopping.reset();
    
    const history = await this.model.fit(xs, ys, {
      epochs: options.epochs || 100,
      batchSize: options.batchSize || 32,
      validationSplit: options.validationSplit || 0.3,
      classWeight: options.classWeights,
      callbacks: {
        onBatchEnd: async (batch, logs) => {
          const predictions = this.model.predict(xs);
          this.metrics.update(predictions, ys);
          predictions.dispose();
        },
        onEpochEnd: async (epoch, logs) => {
          const shouldStop = this.earlyStopping.onEpochEnd(epoch, logs, this.model);
          if (shouldStop) {
            console.log('Early stopping triggered');
          }
        }
      }
    });

    return {
      history,
      metrics: this.metrics.getMetrics()
    };
  }

  // Add method to set learning rate
  async setLearningRate(newLR) {
    if (this.model && this.model.optimizer) {
      const optimizer = this.model.optimizer;
      
      // Handle different optimizer types
      if (typeof optimizer.setLearningRate === 'function') {
        optimizer.setLearningRate(newLR);
      } else {
        // For optimizers that store LR directly
        optimizer.learningRate = newLR;
      }
      
      return true;
    }
    return false;
  }
}

export default PokerModel; 