import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';

async function testOptimization() {
  console.log('Starting optimization test...');
  console.log('Testing different batch sizes...\n');

  try {
    // Initialize TensorFlow.js for browser
    console.log('Initializing TensorFlow.js...');
    await tf.ready();
    console.log('TensorFlow.js ready');

    // Ensure we're using WebGL backend if available, fallback to CPU
    if (tf.getBackend() !== 'webgl') {
      try {
        await tf.setBackend('webgl');
      } catch (e) {
        console.log('WebGL not available, using CPU backend');
        await tf.setBackend('cpu');
      }
    }
    console.log('Using backend:', tf.getBackend());

    const batchSizes = [16, 32];
    const results = [];

    for (const batchSize of batchSizes) {
      console.log(`\nTesting batch size: ${batchSize}`);
      
      // Initialize new model for each test
      console.log('Initializing model...');
      const model = new PokerModel();
      await model.buildModel();
      console.log('Model initialized');

      // Create trainer with current batch size
      const trainer = new PokerTrainer(model, {
        epochs: 3,
        batchSize: batchSize,
        learningRate: 0.001
      });
      console.log('Trainer initialized');

      // Test training
      console.log('\nStarting training...');
      const metrics = await trainer.train();
      
      console.log('Training completed');
      console.log('Final metrics:', {
        loss: metrics.loss[metrics.loss.length - 1].toFixed(4),
        accuracy: metrics.accuracy[metrics.accuracy.length - 1].toFixed(4)
      });

      // Store results
      results.push({
        batchSize,
        finalLoss: metrics.loss[metrics.loss.length - 1],
        finalAccuracy: metrics.accuracy[metrics.accuracy.length - 1]
      });

      // Clean up after each test
      try {
        console.log('\nCleaning up resources...');
        trainer.dispose();
        model.dispose();
        tf.disposeVariables();
        console.log('Cleanup completed');
      } catch (cleanupError) {
        console.warn('Warning during cleanup:', cleanupError);
      }
    }

    return {
      success: true,
      message: 'Optimization test completed successfully',
      results
    };

  } catch (error) {
    console.error('Optimization test error:', error);
    // Ensure cleanup even on error
    tf.disposeVariables();
    return {
      success: false,
      message: error.message
    };
  }
}

// Run the test
testOptimization()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('\nTest error:', error);
    tf.disposeVariables();
    process.exit(1);
  }); 