import * as tf from '@tensorflow/tfjs-node';
import TrainingPipeline from '../training/trainingPipeline';
import { verifyTensorCleanup } from './testUtils';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

async function runTests() {
  // Initialize backend
  await tf.ready();
  
  await verifyTensorCleanup(async () => {
    console.log('Testing LR Scheduler Integration...\n');

    // Create pipeline with scheduler config
    const pipeline = new TrainingPipeline({
      learningRate: 0.1,
      schedule: 'exponential',
      decayRate: 0.5,
      minLR: 0.001,
      warmupSteps: 2,
      batchSize: 16,
      maxEpochs: 10
    });

    // Verify scheduler initialization
    console.log('Scheduler config:', {
      initialLR: pipeline.scheduler.initialLR,
      schedule: pipeline.scheduler.schedule,
      decayRate: pipeline.scheduler.decayRate,
      minLR: pipeline.scheduler.minLR,
      warmupSteps: pipeline.scheduler.warmupSteps
    });

    await pipeline.initializeTraining();

    // Test initial learning rate
    console.log('Initial LR:', pipeline.state.learningRate);
    console.assert(pipeline.state.learningRate === 0.1, 'Initial LR should be 0.1');

    // Create test batch with explicit backend
    const testBatch = tf.tidy(() => ({
      xs: tf.randomNormal([16, INPUT_SIZE]),
      ys: tf.oneHot(tf.randomUniform([16], 0, OUTPUT_SIZE, 'int32'), OUTPUT_SIZE)
    }));

    // Test warmup period
    for (let i = 0; i < 2; i++) {
      await pipeline.trainStep(testBatch);
      console.log(`Warmup step ${i + 1} LR:`, pipeline.state.learningRate);
    }

    // Test decay period
    for (let i = 2; i < 7; i++) {
      await pipeline.trainStep(testBatch);
      console.log(`Decay step ${i + 1} LR:`, pipeline.state.learningRate);
      console.assert(
        pipeline.state.learningRate < 0.1,
        'LR should decrease during decay'
      );
    }

    // Verify minimum learning rate
    console.assert(
      pipeline.state.learningRate >= 0.001,
      'LR should not go below minimum'
    );

    // Clean up test tensors
    tf.dispose([testBatch.xs, testBatch.ys]);

    console.log('\nAll scheduler integration tests passed!');
  });
}

runTests().catch(console.error); 