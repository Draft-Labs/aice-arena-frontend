import PokerModel from '../models/pokerModel';
import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

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

    // Test training step
    console.log('\nTesting training step...');
    const xs = tf.randomNormal([32, INPUT_SIZE]);
    const ys = tf.randomUniform([32, OUTPUT_SIZE]);
    
    const history = await net.fit(xs, ys, {
      epochs: 1,
      batchSize: 32,
      validationSplit: 0.2
    });

    console.log('Training metrics:', history.history);

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