import * as tf from '@tensorflow/tfjs';
import { PerformanceMetrics } from '../utils/metrics.js';

async function testModelMetrics() {
  console.log('Starting ModelMetrics tests...');
  let metrics;

  try {
    await tf.ready();
    await tf.setBackend('cpu');
    
    // Test 1: Metrics initialization
    console.log('\n1. Testing metrics initialization...');
    metrics = new PerformanceMetrics();
    
    console.assert(
      metrics.metrics.training.loss.length === 0,
      'Training loss array should start empty'
    );
    
    // Test 2: Training metrics update
    console.log('\n2. Testing training metrics update...');
    const testLoss = 1.5;
    const startTime = Date.now();
    
    tf.engine().startScope();
    const predictions = tf.tensor2d([[0.7, 0.3]]);
    const labels = tf.tensor2d([[1, 0]]);
    
    metrics.updateTrainingMetrics({xs: predictions, ys: labels}, predictions, testLoss, startTime);
    
    console.assert(
      metrics.metrics.training.loss[0] === testLoss,
      'Training loss not recorded correctly'
    );
    
    predictions.dispose();
    labels.dispose();
    tf.engine().endScope();

    // Test 3: Memory management
    console.log('\n3. Testing memory management...');
    const initialTensors = tf.memory().numTensors;
    console.assert(
      tf.memory().numTensors === initialTensors,
      'Should not leak tensors'
    );

    console.log('\n✅ All ModelMetrics tests passed successfully!');
    return { success: true };

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return { success: false, error: error.message };
  } finally {
    tf.disposeVariables();
  }
}

// Run the test
if (import.meta.vitest) {
  testModelMetrics();
} else {
  testModelMetrics()
    .then(result => {
      if (!result.success) process.exit(1);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
} 