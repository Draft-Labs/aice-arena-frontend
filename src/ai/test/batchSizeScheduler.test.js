// Set test environment
process.env.NODE_ENV = 'test';

// Import browser version of TensorFlow.js
import * as tf from '@tensorflow/tfjs';
import PokerModel from '../models/pokerModel.js';
import PokerTrainer from '../training/trainer.js';
import BatchSizeScheduler from '../training/batchSizeScheduler.js';

async function testBatchSizeScheduler() {
  console.log('Testing batch size scheduler...');
  let trainer = null;
  let model = null;
  let scheduler = null;
  
  try {
    // Initialize TensorFlow.js
    console.log('\nInitializing TensorFlow.js...');
    await tf.ready();
    console.log('TensorFlow.js ready');
    
    // Initialize scheduler
    scheduler = new BatchSizeScheduler({
      initialBatchSize: 16,
      maxBatchSize: 128,
      growthRate: 2,
      performanceThreshold: 0.8
    });
    
    // Initialize model
    console.log('\nInitializing model...');
    model = new PokerModel();
    await model.buildModel();
    console.log('Model initialized');
    
    // Test batch size adaptation
    let currentBatchSize = scheduler.getCurrentBatchSize();
    console.log('\nInitial batch size:', currentBatchSize);
    
    // Simulate training progress
    const performances = [0.75, 0.85, 0.90, 0.95];
    for (const performance of performances) {
      scheduler.update(performance);
      const newBatchSize = scheduler.getCurrentBatchSize();
      console.log(`Performance: ${performance.toFixed(2)} -> Batch size: ${newBatchSize}`);
    }
    
    // Test with actual training
    trainer = new PokerTrainer(model, {
      epochs: 2,
      batchSize: scheduler.getCurrentBatchSize(),
      learningRate: 0.001
    });
    
    const metrics = await trainer.train();
    
    // Update scheduler with final performance
    const finalAccuracy = metrics.accuracy[metrics.accuracy.length - 1];
    scheduler.update(finalAccuracy);

    return {
      success: true,
      message: 'Batch size scheduler tests completed',
      results: {
        finalBatchSize: scheduler.getCurrentBatchSize(),
        finalAccuracy,
        batchSizeHistory: scheduler.getBatchSizeHistory()
      }
    };

  } catch (error) {
    console.error('Scheduler test error:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    // Clean up resources
    if (trainer) {
      console.log('Disposing trainer...');
      trainer.dispose();
    }
    if (model && model.model) {
      console.log('Disposing model...');
      model.model.dispose();
    }
    
    // Final cleanup
    console.log('Disposing variables...');
    tf.disposeVariables();
  }
}

// Run the test
console.log('Starting batch size scheduler tests...');
testBatchSizeScheduler()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 