// Set test environment
process.env.NODE_ENV = 'test';

import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerDataLoader from '../training/dataLoader.js';
import { verifyTensorCleanup } from './testUtils.js';

function logTensorCount(label) {
  const info = tf.memory();
  console.log(`Tensor count at ${label}:`, {
    numTensors: info.numTensors,
    numDataBuffers: info.numDataBuffers,
    unreliable: info.unreliable,
  });
}

async function testSmallScaleTraining() {
  console.log('Starting small-scale training test...');
  let model = null;
  let dataLoader = null;
  let batch = null;
  let evalBatch = null;
  let evalResult = null;

  // Start a new tensor scope
  tf.engine().startScope();

  try {
    logTensorCount('start');

    // Initialize TensorFlow.js
    console.log('\nInitializing TensorFlow.js...');
    await tf.ready();
    console.log('TensorFlow.js ready');

    // Force CPU backend for consistent testing
    await tf.setBackend('cpu');
    console.log('Using backend:', tf.getBackend());
    logTensorCount('after backend setup');

    // Initialize model
    console.log('\nInitializing model...');
    model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');
    logTensorCount('after model init');

    // Initialize data loader with small dataset
    console.log('\nInitializing data loader...');
    dataLoader = new PokerDataLoader({
      batchSize: 32,
      validationSplit: 0.2
    });
    await dataLoader.loadData(100); // Start with 100 hands for testing
    console.log('Data loaded');
    logTensorCount('after data load');

    // Training configuration
    const trainConfig = {
      epochs: 2,
      batchSize: 32,
      validationSplit: 0.2,
      shuffle: true
    };

    // Test training
    console.log('\nStarting training...');
    tf.engine().startScope();  // New scope for training
    batch = await dataLoader.nextBatch();
    logTensorCount('after getting batch');
    
    await model.train(batch.xs, batch.ys, trainConfig);
    tf.engine().endScope();  // End training scope
    logTensorCount('after training');
    
    // Test evaluation using the underlying tf.js model
    console.log('\nEvaluating model...');
    tf.engine().startScope();  // New scope for evaluation
    evalBatch = await dataLoader.nextBatch();
    evalResult = await model.model.evaluate(evalBatch.xs, evalBatch.ys);
    
    const metrics = {
      loss: evalResult[0].dataSync()[0],
      accuracy: evalResult[1].dataSync()[0]
    };
    
    tf.engine().endScope();  // End evaluation scope
    logTensorCount('after evaluation');

    console.log('\nTraining completed');
    console.log('Final metrics:', {
      loss: metrics.loss.toFixed(4),
      accuracy: metrics.accuracy.toFixed(4)
    });

    return {
      success: true,
      message: 'Small-scale training test completed successfully',
      metrics
    };

  } catch (error) {
    console.error('Small-scale training test failed:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    try {
      logTensorCount('before cleanup');

      // Clean up in reverse order
      if (evalResult) {
        evalResult.forEach(tensor => {
          if (tensor && !tensor.isDisposed) {
            tensor.dispose();
          }
        });
        evalResult = null;
      }

      if (evalBatch) {
        if (evalBatch.xs && !evalBatch.xs.isDisposed) evalBatch.xs.dispose();
        if (evalBatch.ys && !evalBatch.ys.isDisposed) evalBatch.ys.dispose();
        evalBatch = null;
      }

      if (batch) {
        if (batch.xs && !batch.xs.isDisposed) batch.xs.dispose();
        if (batch.ys && !batch.ys.isDisposed) batch.ys.dispose();
        batch = null;
      }

      if (dataLoader) {
        await dataLoader.dispose();
        dataLoader = null;
      }

      if (model) {
        if (model.model && !model.model.isDisposed) {
          // Only dispose the top-level model, it will handle its layers
          model.model.dispose();
        }
        model = null;
      }

      // Force complete cleanup
      tf.engine().disposeVariables();
      tf.engine().reset();
      await tf.ready();
      
      logTensorCount('after final cleanup');
    } catch (cleanupError) {
      console.warn('Warning during cleanup:', cleanupError);
      // Try force cleanup even if there's an error
      tf.engine().disposeVariables();
      tf.engine().reset();
    }
  }
}

// Run the test with tensor cleanup verification
console.log('Starting small-scale training test suite...');
verifyTensorCleanup(async () => {
  const result = await testSmallScaleTraining();
  if (!result) {
    throw new Error('Test function returned undefined');
  }
  return result;
})
.then(result => {
  console.log('Test result:', result);
  if (!result.success) process.exit(1);
})
.catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 