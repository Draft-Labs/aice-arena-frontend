import * as tf from '@tensorflow/tfjs';
import PokerDataLoader from '../training/dataLoader.js';

async function testDataLoader() {
  console.log('Testing data loader...');
  
  const loader = new PokerDataLoader({
    batchSize: 32,
    validationSplit: 0.2
  });

  try {
    // Test data loading
    console.log('\nTesting data loading...');
    await loader.loadData(1000); // Specify number of hands to generate
    
    // Test batch generation
    console.log('\nTesting batch generation...');
    const batch = await loader.nextBatch();
    
    // Validate batch structure
    if (!batch.xs || !batch.ys) {
      throw new Error('Invalid batch structure');
    }
    
    // Validate tensor shapes
    const xsShape = batch.xs.shape;
    const ysShape = batch.ys.shape;
    
    console.log('\nBatch shapes:', {
      xs: xsShape,
      ys: ysShape
    });

    // Validate dimensions
    if (xsShape[1] !== 373) {
      throw new Error(`Invalid input dimension: ${xsShape[1]}, expected 373`);
    }
    if (ysShape[1] !== 4) {
      throw new Error(`Invalid output dimension: ${ysShape[1]}, expected 4`);
    }

    // Test data values
    const xsData = await batch.xs.data();
    const ysData = await batch.ys.data();
    
    console.log('\nData statistics:', {
      xsMean: tf.mean(batch.xs).dataSync()[0],
      ysMean: tf.mean(batch.ys).dataSync()[0],
      xsMin: tf.min(batch.xs).dataSync()[0],
      xsMax: tf.max(batch.xs).dataSync()[0]
    });

    // Test validation data
    console.log('\nTesting validation data...');
    const validationData = loader.getValidationData();
    const valXsShape = validationData.xs.shape;
    const valYsShape = validationData.ys.shape;

    console.log('Validation data shapes:', {
      xs: valXsShape,
      ys: valYsShape
    });

    if (valXsShape[1] !== 373) {
      throw new Error(`Invalid validation input dimension: ${valXsShape[1]}, expected 373`);
    }
    if (valYsShape[1] !== 4) {
      throw new Error(`Invalid validation output dimension: ${valYsShape[1]}, expected 4`);
    }

    // Clean up tensors
    tf.dispose([batch.xs, batch.ys, validationData.xs, validationData.ys]);

    return {
      success: true,
      message: 'Data loader test passed',
      shapes: { xs: xsShape, ys: ysShape, valXs: valXsShape, valYs: valYsShape }
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    loader.dispose();
  }
}

async function testDataLoaderWithDifferentBatchSizes() {
  console.log('Testing data loader with different batch sizes...');
  
  const batchSizes = [16, 32, 64];
  for (const batchSize of batchSizes) {
    console.log(`\nTesting with batch size: ${batchSize}`);
    const loader = new PokerDataLoader({
      batchSize,
      validationSplit: 0.2
    });

    try {
      await loader.loadData(1000);
      const batch = await loader.nextBatch();

      if (!batch.xs || !batch.ys) {
        throw new Error('Invalid batch structure');
      }

      const xsShape = batch.xs.shape;
      const ysShape = batch.ys.shape;

      console.log('Batch shapes:', {
        xs: xsShape,
        ys: ysShape
      });

      if (xsShape[0] !== batchSize) {
        throw new Error(`Invalid batch size: ${xsShape[0]}, expected ${batchSize}`);
      }

      tf.dispose([batch.xs, batch.ys]);
    } catch (error) {
      console.error(`Test failed for batch size ${batchSize}:`, error);
    } finally {
      loader.dispose();
    }
  }
}

async function testDataLoaderEdgeCases() {
  console.log('Testing data loader with edge cases...');

  const loader = new PokerDataLoader({
    batchSize: 32,
    validationSplit: 0.2
  });

  try {
    console.log('\nTesting with zero hands...');
    await loader.loadData(0);
    const batch = await loader.nextBatch();
    if (batch.xs.shape[0] !== 0) {
      throw new Error('Expected zero batch size for zero hands');
    }

    console.log('\nTesting with negative hands...');
    await loader.loadData(-100);
  } catch (error) {
    console.error('Expected error for negative hands:', error.message);
  } finally {
    loader.dispose();
  }
}

async function testDataLoaderIntegrity() {
  console.log('Testing data loader integrity...');

  const loader = new PokerDataLoader({
    batchSize: 32,
    validationSplit: 0.2
  });

  try {
    await loader.loadData(1000);
    const firstBatch = await loader.nextBatch();
    const secondBatch = await loader.nextBatch();

    if (tf.equal(firstBatch.xs, secondBatch.xs).all().dataSync()[0]) {
      throw new Error('Batches should not be identical');
    }

    tf.dispose([firstBatch.xs, firstBatch.ys, secondBatch.xs, secondBatch.ys]);
  } catch (error) {
    console.error('Data integrity test failed:', error);
  } finally {
    loader.dispose();
  }
}

async function runAllTests() {
  await testDataLoader();
  await testDataLoaderWithDifferentBatchSizes();
  await testDataLoaderEdgeCases();
  await testDataLoaderIntegrity();
}

console.log('Starting all data loader tests...');
runAllTests()
  .then(() => console.log('All tests completed'))
  .catch(error => console.error('Some tests failed:', error)); 