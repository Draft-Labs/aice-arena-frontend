import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

class PokerModel {
  constructor() {
    this.model = null;
    this.inputShape = [INPUT_SIZE];
    this.outputShape = OUTPUT_SIZE;
  }

  // Create the model architecture
  buildModel() {
    this.model = tf.sequential({
      layers: [
        // Input layer
        tf.layers.dense({
          inputShape: this.inputShape,
          units: 512,
          kernelInitializer: 'glorotNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.activation({ activation: 'relu' }),
        
        // Hidden layers
        tf.layers.dense({ units: 256 }),
        tf.layers.batchNormalization(),
        tf.layers.activation({ activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        
        tf.layers.dense({ units: 128 }),
        tf.layers.batchNormalization(),
        tf.layers.activation({ activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        
        // Output layer
        tf.layers.dense({
          units: this.outputShape,
          activation: 'softmax'
        })
      ]
    });

    // Configure training with learning rate schedule
    const initialLearningRate = 0.001;
    const decay = initialLearningRate / 100;
    const optimizer = tf.train.adam(initialLearningRate, 0.9, 0.999, undefined, decay);

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
}

export default PokerModel; 