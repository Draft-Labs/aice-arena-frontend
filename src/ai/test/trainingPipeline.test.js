// Set test environment
process.env.NODE_ENV = 'test';

import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';
import PokerDataLoader from '../training/dataLoader.js';

async function testTrainingPipeline() {
  console.log('Testing training pipeline...');
  let dataLoader = null;
  let trainer = null;
  
  try {
    // Debug TensorFlow.js initialization
    console.log('\nInitializing TensorFlow.js...');
    await tf.ready();
    console.log('TensorFlow.js ready');
    
    // Force CPU backend for testing
    console.log('\nSetting backend...');
    console.log('Current backend:', tf.getBackend());
    await tf.setBackend('cpu');
    console.log('Backend set to:', tf.getBackend());
    
    // Debug memory state
    console.log('\nInitial memory state:');
    console.log(tf.memory());
    
    // Initialize components
    console.log('\nInitializing model...');
    const model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');
    
    trainer = new PokerTrainer(model, {
      epochs: 5,
      batchSize: 32,
      learningRate: 0.001
    });
    console.log('Trainer initialized');

    // Test training
    console.log('\nStarting training...');
    const metrics = await trainer.train();
    
    console.log('\nTraining completed');
    console.log('Final metrics:', {
      loss: metrics.loss[metrics.loss.length - 1].toFixed(4),
      accuracy: metrics.accuracy[metrics.accuracy.length - 1].toFixed(4)
    });
    
    // Debug memory state before prediction
    console.log('\nMemory state before prediction:');
    console.log(tf.memory());
    
    // Test prediction using simple tensor
    console.log('\nCreating input tensor...');
    const dummyInput = tf.zeros([1, 373]);
    console.log('Input tensor shape:', dummyInput.shape);
    
    console.log('Making prediction...');
    const prediction = model.predict(dummyInput);
    console.log('Prediction tensor shape:', prediction.shape);
    
    const result = {
      shape: prediction.shape,
      values: Array.from(prediction.dataSync()).map(v => v.toFixed(4))
    };

    // Clean up tensors immediately
    console.log('\nCleaning up tensors...');
    tf.dispose([dummyInput, prediction]);
    console.log('Tensors disposed');

    console.log('\nPrediction shape:', result.shape);
    console.log('Prediction values:', result.values);

    // Final memory state
    console.log('\nFinal memory state:');
    console.log(tf.memory());

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
    console.error('Error stack:', error.stack);
    console.error('Current backend:', tf.getBackend());
    console.error('Memory state at error:');
    console.error(tf.memory());
    return {
      success: false,
      message: error.message
    };
  } finally {
    // Clean up resources
    console.log('\nFinal cleanup...');
    if (trainer) {
      console.log('Disposing trainer...');
      trainer.dispose();
    }
    if (dataLoader) {
      console.log('Disposing dataLoader...');
      dataLoader.dispose();
    }
    
    // Clean up any remaining tensors
    console.log('Disposing variables...');
    tf.disposeVariables();
    console.log('Cleanup complete');
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