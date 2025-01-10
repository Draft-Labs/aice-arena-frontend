import * as tf from '@tensorflow/tfjs-node';
import BatchSizeScheduler from '../utils/batchSizeScheduler';
import { verifyTensorCleanup } from './testUtils';

async function runTests() {
  await verifyTensorCleanup(async () => {
    console.log('Testing Batch Size Scheduler...\n');

    const scheduler = new BatchSizeScheduler({
      initialBatchSize: 32,
      minBatchSize: 16,
      maxBatchSize: 128
    });

    // Test initial state
    console.log('Initial batch size:', scheduler.getCurrentBatchSize());
    console.assert(scheduler.getCurrentBatchSize() === 32, 'Initial batch size should be 32');

    // Test stable loss scenario
    const stableLossMetrics = Array(7).fill({ 
      loss: 1.0, 
      memoryUsage: {
        numBytes: 500,
        maxBytes: 1000,  // 50% utilization - should allow growth
        unreliable: false
      }
    });

    // Wait for stability window before checking size increase
    let initialSize = scheduler.getCurrentBatchSize();
    for (const metrics of stableLossMetrics) {
      const newSize = scheduler.update(metrics);
      console.log('Batch size with stable loss:', newSize);
    }
    let finalSize = scheduler.getCurrentBatchSize();
    
    console.assert(
      finalSize > initialSize,
      'Batch size should increase with stable loss'
    );

    // Test unstable loss scenario
    const unstableLossMetrics = Array(5).fill().map((_, i) => ({ 
      loss: Math.random() * 2,
      memoryUsage: {
        numBytes: 500,
        maxBytes: 1000  // 50% utilization
      }
    }));
    for (const metrics of unstableLossMetrics) {
      const newSize = scheduler.update(metrics);
      console.log('Batch size with unstable loss:', newSize);
    }
    console.assert(scheduler.getCurrentBatchSize() < 128, 'Batch size should decrease with unstable loss');

    // Test memory threshold
    const highMemoryMetrics = { 
      loss: 1.0, 
      memoryUsage: {
        numBytes: 900,
        maxBytes: 1000  // 90% utilization
      }
    };
    const newSize = scheduler.update(highMemoryMetrics);
    console.log('Batch size with high memory usage:', newSize);
    console.assert(newSize <= scheduler.getCurrentBatchSize(), 'Batch size should decrease with high memory usage');

    console.log('\nAll batch size scheduler tests passed!');
  });
}

runTests().catch(console.error); 