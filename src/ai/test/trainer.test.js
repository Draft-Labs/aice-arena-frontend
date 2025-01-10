import * as tf from '@tensorflow/tfjs-node';
import assert from 'assert';
import PokerTrainer from '../training/trainer.js';
import PokerModel from '../models/pokerModel.js';
import PokerDataFetcher from '../data/dataFetcher.js';

async function runTests() {
  console.log('Starting PokerTrainer tests...');
  
  try {
    // Test initialization
    console.log('\nTesting initialization...');
    const model = new PokerModel();
    model.buildModel();
    const trainer = new PokerTrainer(model, {
      epochs: 2,
      stepsPerEpoch: 5,
      batchSize: 16
    });

    assert(trainer.model !== undefined, 'Model should be defined');
    assert(trainer.dataLoader !== undefined, 'DataLoader should be defined');
    assert(trainer.dataFetcher !== undefined, 'DataFetcher should be defined');
    assert(trainer.epochs === 2, 'Epochs should be 2');
    assert(trainer.stepsPerEpoch === 5, 'StepsPerEpoch should be 5');
    console.log('✓ Initialization tests passed');

    // Test data variety first
    console.log('\nTesting data variety...');
    const fetcher = new PokerDataFetcher();
    const batch1 = await fetcher.fetchData(1);
    const batch2 = await fetcher.fetchData(1);

    assert(
      JSON.stringify(batch1) !== JSON.stringify(batch2),
      'Should generate different data each time'
    );

    // Test prediction variety
    const predictions = await trainer.trainStep({ 
      xs: tf.randomNormal([16, 373]), 
      ys: tf.oneHot(tf.randomUniform([16], 0, 4, 'int32'), 4) 
    });

    assert(
      predictions.loss > 0 && predictions.loss < 10,
      'Loss should be reasonable'
    );

    // Verify trainable variables
    const trainableVars = trainer.model.model.layers.map(layer => layer.getWeights())
      .flat()
      .filter(w => w.trainable);
      
    assert(
      trainableVars.length > 0,
      'Model should have trainable variables'
    );

    // Test training step
    console.log('\nTesting training step...');
    const xs = tf.randomNormal([16, 373]);
    const ys = tf.oneHot(tf.randomUniform([16], 0, 4, 'int32'), 4);
    const batch = { xs, ys };

    const metrics = await trainer.trainStep(batch);
    assert(typeof metrics.loss === 'number', 'Loss should be a number');
    assert(typeof metrics.accuracy === 'number', 'Accuracy should be a number');
    console.log('✓ Training step tests passed');

    // Test full training loop
    console.log('\nTesting full training loop...');
    const trainingMetrics = await trainer.train();

    // Verify metrics
    assert(Array.isArray(trainingMetrics.loss), 'Loss metrics should be an array');
    assert(Array.isArray(trainingMetrics.accuracy), 'Accuracy metrics should be an array');
    assert(trainingMetrics.loss.length === 2, 'Should have metrics for 2 epochs');

    // Verify non-zero metrics
    assert(
      trainingMetrics.loss.some(loss => loss > 0),
      'Loss should be non-zero during training'
    );
    assert(
      trainingMetrics.accuracy.some(acc => acc > 0),
      'Accuracy should be non-zero during training'
    );

    // Test tensor cleanup
    console.log('\nTesting tensor cleanup...');
    const initialTensors = tf.memory().numTensors;
    const initialBytes = tf.memory().numBytes;

    console.log('Initial tensor state:', {
      tensors: initialTensors,
      bytes: initialBytes
    });

    tf.engine().startScope();
    try {
      await trainer.train();
    } finally {
      tf.engine().endScope();
    }

    trainer.dispose();

    const finalTensors = tf.memory().numTensors;
    const finalBytes = tf.memory().numBytes;

    console.log('Final tensor state:', {
      tensors: finalTensors,
      bytes: finalBytes
    });

    assert(
      finalTensors <= initialTensors, 
      `Tensor leak detected: ${finalTensors - initialTensors} tensors remaining`
    );
    console.log('✓ Tensor cleanup tests passed');

    // Clean up test tensors
    xs.dispose();
    ys.dispose();

    console.log('\n✅ All tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
}); 