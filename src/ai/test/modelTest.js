import PokerModel from '../models/pokerModel';
import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE, ACTIONS } from '../utils/constants';

async function testModel() {
  console.log('Testing poker model...');
  
  try {
    const model = new PokerModel();
    
    // Test model building
    console.log('\nBuilding model...');
    const net = model.buildModel();
    model.summary();

    // Test forward pass
    console.log('\nTesting forward pass...');
    const testInput = tf.randomNormal([1, INPUT_SIZE]);
    const prediction = net.predict(testInput);
    
    console.log('Input shape:', testInput.shape);
    console.log('Output shape:', prediction.shape);
    console.log('Output:', await prediction.data());

    // Test training with metrics and early stopping
    console.log('\nTesting training step with metrics...');
    
    // Create synthetic training data
    const batchSize = 32;
    const xs = tf.randomNormal([batchSize, INPUT_SIZE]);
    
    // Create balanced one-hot encoded labels
    const labels = [];
    for (let i = 0; i < batchSize; i++) {
      const oneHot = new Array(OUTPUT_SIZE).fill(0);
      oneHot[i % OUTPUT_SIZE] = 1;  // Ensure valid one-hot encoding
      labels.push(oneHot);
    }
    const ys = tf.tensor2d(labels);

    // Training options
    const options = {
      epochs: 5,
      batchSize: 16,
      validationSplit: 0.3,
      classWeights: {
        [ACTIONS.FOLD]: 1.0,    // Neutral
        [ACTIONS.CHECK]: 1.0,   // Neutral
        [ACTIONS.CALL]: 1.5,    // Slight boost
        [ACTIONS.RAISE]: 2.0    // Moderate boost
      }
    };

    const result = await model.train(xs, ys, options);

    console.log('\nTraining history:', result.history);
    console.log('\nDetailed metrics:', {
      loss: result.metrics.loss.toFixed(4),
      accuracy: result.metrics.accuracy.toFixed(4),
      precision: Object.entries(result.metrics.precision)
        .map(([k,v]) => `${k}: ${v.toFixed(4)}`),
      recall: Object.entries(result.metrics.recall)
        .map(([k,v]) => `${k}: ${v.toFixed(4)}`),
      f1: Object.entries(result.metrics.f1)
        .map(([k,v]) => `${k}: ${v.toFixed(4)}`)
    });

    // Clean up tensors
    testInput.dispose();
    prediction.dispose();
    xs.dispose();
    ys.dispose();

    return {
      success: true,
      message: 'Model tests completed successfully'
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testModel().then(result => {
  console.log('\nTest result:', result);
}); 