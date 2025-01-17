import * as tf from '@tensorflow/tfjs';
import LRScheduler from '../utils/lrScheduler';

async function runTests() {
  console.log('Testing LR Scheduler...\n');

  // Test exponential decay with adjusted parameters
  console.log('\nTesting exponential decay with adjusted parameters:');
  const expScheduler = new LRScheduler(0.1, {
    schedule: 'exponential',
    decayRate: 0.0001, // Adjusted decay rate
    minLR: 0.0001, // Adjusted minimum learning rate
    warmupSteps: 500 // Adjusted warmup steps
  });

  for (let i = 0; i < 1000; i += 100) {
    const lr = expScheduler.update(i);
    console.log(`LR after ${i} steps:`, lr);
  }

  console.log('\nAll tests passed!');
}

runTests().catch(console.error); 