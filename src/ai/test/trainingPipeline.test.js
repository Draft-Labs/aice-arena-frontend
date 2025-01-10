// Set test environment
process.env.NODE_ENV = 'test';

// Import browser version of TensorFlow.js
import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';
import PokerDataLoader from '../training/dataLoader.js';

async function testTrainingPipeline() {
  console.log('Testing training pipeline...');
  let dataLoader = null;
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
    
    // Initialize model with explicit backend
    console.log('\nInitializing model...');
    model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');
    
    // Create trainer with explicit backend reference
    trainer = new PokerTrainer(model, {
      epochs: 5,
      batchSize: 32,
      learningRate: 0.001
    });
    console.log('Trainer initialized');

    // Test training with backend check
    console.log('\nStarting training...');
    if (!tf.getBackend()) {
      throw new Error('Backend not available before training');
    }
    
    const metrics = await trainer.train();
    
    console.log('\nTraining completed');
    console.log('Final metrics:', {
      loss: metrics.loss[metrics.loss.length - 1].toFixed(4),
      accuracy: metrics.accuracy[metrics.accuracy.length - 1].toFixed(4)
    });
    
    // Ensure backend is still available
    await tf.setBackend('cpu');
    
    // Create a simple prediction input
    const input = tf.zeros([1, 373]);
    console.log('\nInput tensor created with shape:', input.shape);
    
    // Make prediction
    const prediction = model.predict(input);
    console.log('Prediction tensor created with shape:', prediction.shape);
    
    // Get prediction values
    const values = Array.from(prediction.dataSync()).map(v => v.toFixed(4));
    console.log('Prediction values:', values);
    
    // Clean up tensors
    tf.dispose([input, prediction]);

    return {
      success: true,
      message: 'Training pipeline test passed',
      metrics: {
        finalLoss: metrics.loss[metrics.loss.length - 1],
        finalAccuracy: metrics.accuracy[metrics.accuracy.length - 1]
      }
    };

  } catch (error) {
    console.error('Pipeline test error:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    // Clean up resources in reverse order
    if (trainer) {
      console.log('Disposing trainer...');
      trainer.dispose();
    }
    if (model && model.model) {
      console.log('Disposing model...');
      model.model.dispose();
    }
    if (dataLoader) {
      console.log('Disposing dataLoader...');
      dataLoader.dispose();
    }
    
    // Final cleanup
    console.log('Disposing variables...');
    tf.disposeVariables();
  }
}

// Run the test
console.log('Starting pipeline test...');
testTrainingPipeline()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 