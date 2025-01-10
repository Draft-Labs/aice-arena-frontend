// Set test environment
process.env.NODE_ENV = 'test';

// Import browser version of TensorFlow.js
import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';

async function testTrainingOptimization() {
  console.log('Testing training optimization...');
  let trainer = null;
  let model = null;
  
  try {
    // Initialize TensorFlow.js
    console.log('\nInitializing TensorFlow.js...');
    await tf.ready();
    console.log('TensorFlow.js ready');
    
    // Register CPU backend
    await tf.registerBackend('cpu', () => new tf.MathBackendCPU());
    await tf.setBackend('cpu');
    console.log('Using backend:', tf.getBackend());
    
    // Initialize model
    console.log('\nInitializing model...');
    model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');
    
    // Test different batch sizes
    const batchSizes = [16, 32, 64];
    const results = [];
    
    for (const batchSize of batchSizes) {
      console.log(`\nTesting batch size: ${batchSize}`);
      
      trainer = new PokerTrainer(model, {
        epochs: 3,
        batchSize: batchSize,
        learningRate: 0.001
      });
      
      const startTime = Date.now();
      const metrics = await trainer.train();
      const endTime = Date.now();
      
      results.push({
        batchSize,
        timePerEpoch: (endTime - startTime) / 3,
        finalLoss: metrics.loss[metrics.loss.length - 1],
        finalAccuracy: metrics.accuracy[metrics.accuracy.length - 1]
      });
      
      // Clean up trainer
      trainer.dispose();
      trainer = null;
    }
    
    // Log results
    console.log('\nOptimization Results:');
    results.forEach(result => {
      console.log(`Batch Size ${result.batchSize}:`, {
        timePerEpoch: `${result.timePerEpoch.toFixed(2)}ms`,
        loss: result.finalLoss.toFixed(4),
        accuracy: result.finalAccuracy.toFixed(4)
      });
    });

    return {
      success: true,
      message: 'Training optimization tests completed',
      results
    };

  } catch (error) {
    console.error('Optimization test error:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    // Clean up resources
    if (trainer) {
      console.log('Disposing trainer...');
      trainer.dispose();
    }
    if (model && model.model) {
      console.log('Disposing model...');
      model.model.dispose();
    }
    
    // Final cleanup
    console.log('Disposing variables...');
    tf.disposeVariables();
  }
}

// Run the test
console.log('Starting optimization tests...');
testTrainingOptimization()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 