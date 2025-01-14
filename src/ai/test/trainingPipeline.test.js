// Set test environment
process.env.NODE_ENV = 'test';

// Import browser version of TensorFlow.js
import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';
import PerformanceMetrics from '../utils/performanceMetrics.js';

async function testTrainingPipeline() {
  console.log('Starting pipeline test...');
  console.log('Testing training pipeline...\n');
  
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

    // Initialize model
    console.log('\nInitializing model...');
    const model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');

    // Create trainer
    const trainer = new PokerTrainer(model, {
      epochs: 5,
      batchSize: 32,
      learningRate: 0.001
    });
    console.log('Trainer initialized\n');

    // Test training
    console.log('Starting training...');
    const metrics = await trainer.train();
    
    console.log('\nTraining completed');
    console.log('Final metrics:', { 
      loss: metrics.loss[metrics.loss.length - 1].toFixed(4),
      accuracy: metrics.accuracy[metrics.accuracy.length - 1].toFixed(4)
    });

    // Clean up
    try {
      console.log('\nCleaning up resources...');
      trainer.dispose();
      model.dispose();
      tf.disposeVariables();
      console.log('Cleanup completed');
    } catch (cleanupError) {
      console.warn('Warning during cleanup:', cleanupError);
    }

    return {
      success: true,
      message: 'Pipeline test completed successfully',
      metrics: {
        finalLoss: metrics.loss[metrics.loss.length - 1],
        finalAccuracy: metrics.accuracy[metrics.accuracy.length - 1]
      }
    };

  } catch (error) {
    console.error('Pipeline test error:', error);
    // Ensure cleanup even on error
    tf.disposeVariables();
    return {
      success: false,
      message: error.message
    };
  }
}

// Run the test
testTrainingPipeline()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('\nTest error:', error);
    tf.disposeVariables();
    process.exit(1);
  });

export default testTrainingPipeline; 