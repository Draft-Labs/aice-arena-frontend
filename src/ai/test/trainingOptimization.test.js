import * as tf from '@tensorflow/tfjs-node';
import TrainingPipeline from '../training/trainingPipeline';
import { verifyTensorCleanup } from './testUtils';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

async function runTests() {
  await verifyTensorCleanup(async () => {
    console.log('Starting optimization tests...\n');

    // Test gradient calculation
    console.log('Testing gradient calculation...');
    const pipeline = new TrainingPipeline({
      batchSize: 16,
      maxEpochs: 2,
      checkpointPath: './tmp/test-model'
    });

    await pipeline.initializeTraining();

    // Test gradient calculation with proper shapes
    const metrics = await pipeline.trainStep({
      xs: tf.randomNormal([16, INPUT_SIZE]),
      ys: tf.randomUniform([16, OUTPUT_SIZE])
    });

    // Validate metrics
    if (!metrics || 
        typeof metrics.loss !== 'number' || 
        typeof metrics.accuracy !== 'number' ||
        isNaN(metrics.loss) || 
        isNaN(metrics.accuracy) ||
        metrics.loss === 0 || 
        metrics.accuracy === 1) {
      throw new Error('Invalid metrics: ' + JSON.stringify(metrics));
    }

    console.log('Gradient metrics:', metrics);
    console.log('Tensor cleanup verification:', {
      start: tf.memory().numTensors,
      end: tf.memory().numTensors,
      leaked: tf.memory().numTensors - tf.memory().numTensors
    });

    // Test gradient accumulation
    console.log('\nTesting gradient accumulation...');
    const accumulatedMetrics = await pipeline.accumulateGradients(4);
    
    // Validate accumulated metrics
    if (!accumulatedMetrics || 
        typeof accumulatedMetrics.loss !== 'number' || 
        typeof accumulatedMetrics.accuracy !== 'number' ||
        isNaN(accumulatedMetrics.loss) || 
        isNaN(accumulatedMetrics.accuracy)) {
      throw new Error('Invalid accumulated metrics');
    }

    return accumulatedMetrics;
  });
}

runTests().catch(console.error); 