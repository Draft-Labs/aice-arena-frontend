import * as tf from '@tensorflow/tfjs';
import PokerDataLoader from '../training/dataLoader.js';

async function testDataLoading() {
  console.log('Testing data loading...');
  
  const dataLoader = new PokerDataLoader({
    batchSize: 32
  });

  try {
    // Initialize data
    await dataLoader.loadData();
    
    // Test batch fetching
    const batch = await dataLoader.nextBatch();
    
    // Validate batch structure
    if (!batch.xs || !batch.ys) {
      throw new Error('Invalid batch structure');
    }

    // Validate tensor shapes
    const xsShape = batch.xs.shape;
    const ysShape = batch.ys.shape;
    
    console.log('Batch shapes:', {
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
    
    console.log('Data statistics:', {
      xsMean: tf.mean(batch.xs).dataSync()[0],
      ysMean: tf.mean(batch.ys).dataSync()[0],
      xsMin: tf.min(batch.xs).dataSync()[0],
      xsMax: tf.max(batch.xs).dataSync()[0]
    });

    return {
      success: true,
      message: 'Data loading test passed',
      shapes: { xs: xsShape, ys: ysShape }
    };

  } catch (error) {
    console.error('Data loading test failed:', error);
    return {
      success: false,
      message: error.message
    };
  } finally {
    dataLoader.dispose();
  }
}

// Run the test
console.log('Starting data test...');
testDataLoading()
  .then(result => console.log('Test result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 