import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE, ACTIONS } from '../utils/constants';
import ModelMetrics from '../utils/metrics';
import EarlyStopping from '../utils/callbacks';

class PokerModel {
  constructor() {
    this.model = null;
    this.inputShape = [INPUT_SIZE];
    this.outputShape = OUTPUT_SIZE;
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
          inputShape: [373],  // Input features
          units: 512,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 256,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 128,
          activation: 'relu',
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({
          units: 4,  // Output classes
          activation: 'softmax',
          kernelInitializer: 'glorotNormal'
        })
      ]
    });

    // Compile model
    this.model.compile({
      optimizer: tf.train.adam(0.0002),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
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
    
    // Ensure input is a tensor and has correct shape
    const inputTensor = tf.tidy(() => {
      // If input is already a tensor, use it directly
      if (input instanceof tf.Tensor) {
        return input;
      }
      
      // Validate input
      if (!input) {
        throw new Error('Input cannot be null or undefined');
      }
      
      // If input is an array or array-like object
      if (Array.isArray(input) || ArrayBuffer.isView(input)) {
        return tf.tensor2d(input, [-1, this.inputShape[0]]);
      }
      
      // If input has arraySync method (e.g. another tensor-like object)
      if (input.arraySync) {
        return tf.tensor2d(input.arraySync(), [-1, this.inputShape[0]]);
      }
      
      throw new Error('Invalid input type. Expected tensor, array, or tensor-like object');
    });
    
    // Make prediction
    try {
      return this.model.predict(inputTensor);
    } finally {
      // Clean up if we created a new tensor
      if (!(input instanceof tf.Tensor)) {
        inputTensor.dispose();
      }
    }
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