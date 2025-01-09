// Set test environment
process.env.NODE_ENV = 'test';

import * as tf from '@tensorflow/tfjs-node';
import TrainingPipeline from '../training/trainingPipeline';
import { ACTIONS } from '../utils/constants';

async function testTrainingPipeline() {
  console.log('Testing training pipeline...');
  
  try {
    // Initialize pipeline with test configuration
    const pipeline = new TrainingPipeline({
      maxEpochs: 2,
      batchSize: 16,
      validationFrequency: 1,
      checkpointFrequency: 1,
      validationSteps: 2,
      patience: 3,
      learningRate: 0.0002,
      classWeights: {
        [ACTIONS.FOLD]: 1.0,
        [ACTIONS.CHECK]: 1.0,
        [ACTIONS.CALL]: 1.2,
        [ACTIONS.RAISE]: 1.5
      }
    });

    // Test initialization
    console.log('\nTesting pipeline initialization...');
    await pipeline.initializeTraining();
    console.log('Config:', pipeline.config);
    console.log('Initial state:', {
      epoch: pipeline.state.currentEpoch,
      learningRate: pipeline.state.learningRate,
      backend: tf.getBackend()
    });

    // Test single epoch
    console.log('\nTesting single training epoch...');
    await pipeline.runEpoch();
    console.log('After epoch:', {
      loss: pipeline.state.history.loss[0],
      accuracy: pipeline.state.history.accuracy[0],
      memoryUsage: pipeline.state.history.memoryUsage[0]
    });

    // Test validation
    console.log('\nTesting validation...');
    const valMetrics = await pipeline.validate();
    console.log('Validation metrics:', valMetrics);

    // Test checkpoint saving
    console.log('\nTesting checkpoint saving...');
    await pipeline.saveCheckpoint('test');
    console.log('Checkpoints:', pipeline.state.checkpoints);

    // Test full training loop
    console.log('\nTesting complete training loop...');
    const finalState = await pipeline.train();
    console.log('Training completed:', {
      epochs: finalState.currentEpoch,
      finalLoss: finalState.history.loss[finalState.currentEpoch - 1],
      bestLoss: finalState.bestLoss,
      learningRate: finalState.learningRate
    });

    // Test memory cleanup
    console.log('\nTesting cleanup...');
    const beforeMemory = tf.memory();
    await pipeline.cleanup();
    const afterMemory = tf.memory();
    console.log('Memory usage:', {
      before: beforeMemory.numBytes,
      after: afterMemory.numBytes,
      tensorsFreed: beforeMemory.numTensors - afterMemory.numTensors
    });

    return {
      success: true,
      message: 'Training pipeline tests completed successfully',
      metrics: {
        finalLoss: finalState.history.loss[finalState.currentEpoch - 1],
        finalAccuracy: finalState.history.accuracy[finalState.currentEpoch - 1],
        bestLoss: finalState.bestLoss,
        checkpoints: finalState.checkpoints.length
      }
    };

  } catch (error) {
    console.error('Pipeline test error:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

// Add test utilities
async function verifyTensorCleanup() {
  const tensorsStart = tf.memory().numTensors;
  await testTrainingPipeline();
  const tensorsEnd = tf.memory().numTensors;
  
  console.log('\nTensor cleanup verification:', {
    start: tensorsStart,
    end: tensorsEnd,
    leaked: tensorsEnd - tensorsStart
  });
}

// Run tests
console.log('Starting training pipeline tests...');
verifyTensorCleanup().then(() => {
  console.log('\nAll tests completed');
}); 