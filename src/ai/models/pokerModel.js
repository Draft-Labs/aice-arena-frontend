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
  buildModel() {
    // Add residual connections
    const input = tf.input({shape: this.inputShape});
    
    // First block
    let x = tf.layers.dense({
      units: 256,
      kernelInitializer: 'heNormal'
    }).apply(input);
    x = tf.layers.batchNormalization().apply(x);
    x = tf.layers.activation({activation: 'relu'}).apply(x);
    
    // Residual block 1
    const shortcut1 = x;
    x = tf.layers.dense({units: 256}).apply(x);
    x = tf.layers.batchNormalization().apply(x);
    x = tf.layers.activation({activation: 'relu'}).apply(x);
    x = tf.layers.dropout({rate: 0.1}).apply(x);
    x = tf.layers.add().apply([x, shortcut1]);
    
    // Residual block 2
    const shortcut2 = x;
    x = tf.layers.dense({units: 256}).apply(x);
    x = tf.layers.batchNormalization().apply(x);
    x = tf.layers.activation({activation: 'relu'}).apply(x);
    x = tf.layers.dropout({rate: 0.1}).apply(x);
    x = tf.layers.add().apply([x, shortcut2]);
    
    // Output
    x = tf.layers.dense({
      units: this.outputShape,
      activation: 'softmax'
    }).apply(x);
    
    this.model = tf.model({inputs: input, outputs: x});
    
    const optimizer = tf.train.adam(0.0002, 0.9, 0.999, 1e-7, {
      clipNorm: 1.0,
      clipValue: 0.5
    });
    
    this.model.compile({
      optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

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
    if (!this.model) throw new Error('Model not built');
    await this.model.save(path);
  }

  // Load model
  async load(path) {
    this.model = await tf.loadLayersModel(path);
    return this.model;
  }

  // Get action probabilities
  async predict(input) {
    if (!this.model) throw new Error('Model not built');
    
    const tensor = tf.tensor2d([input]);
    const prediction = this.model.predict(tensor);
    const probabilities = await prediction.data();
    
    tensor.dispose();
    prediction.dispose();
    
    return probabilities;
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
}

export default PokerModel; 