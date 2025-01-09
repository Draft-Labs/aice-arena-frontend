import * as tf from '@tensorflow/tfjs';
import LRScheduler from '../utils/lrScheduler';
import { verifyTensorCleanup } from './testUtils';

async function runTests() {
  console.log('Testing LR Scheduler...\n');

  // Test step decay
  const stepScheduler = new LRScheduler(0.1, {
    schedule: 'step',
    decayRate: 0.5,
    decaySteps: 10
  });

  console.log('Testing step decay:');
  console.log('Initial LR:', stepScheduler.getLearningRate());
  console.assert(stepScheduler.getLearningRate() === 0.1, 'Initial LR should be 0.1');

  const lr10 = stepScheduler.update(10);
  console.log('LR after 10 epochs:', lr10);
  console.assert(lr10 === 0.05, 'LR after 10 epochs should be 0.05');

  const lr20 = stepScheduler.update(20);
  console.log('LR after 20 epochs:', lr20);
  console.assert(lr20 === 0.025, 'LR after 20 epochs should be 0.025');

  // Test exponential decay
  console.log('\nTesting exponential decay:');
  const expScheduler = new LRScheduler(0.1, {
    schedule: 'exponential',
    decayRate: 0.1
  });

  console.log('Initial LR:', expScheduler.getLearningRate());
  const lr1 = expScheduler.update(1);
  const lr2 = expScheduler.update(2);
  console.log('LR after 1 epoch:', lr1);
  console.log('LR after 2 epochs:', lr2);
  console.assert(lr2 < lr1, 'LR should decrease over time');
  console.assert(lr1 < 0.1, 'LR should be less than initial value');

  // Test minimum learning rate
  console.log('\nTesting minimum learning rate:');
  const minLRScheduler = new LRScheduler(0.1, {
    schedule: 'exponential',
    decayRate: 1.0,
    minLR: 0.01
  });

  for (let i = 0; i < 100; i++) {
    minLRScheduler.update(i);
  }
  
  const finalLR = minLRScheduler.getLearningRate();
  console.log('Final LR:', finalLR);
  console.assert(finalLR >= 0.01, 'LR should not go below minimum');

  console.log('\nAll tests passed!');
}

runTests().catch(console.error); 