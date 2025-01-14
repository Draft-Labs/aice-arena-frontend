import * as tf from '@tensorflow/tfjs';
import PokerDataLoader from '../training/dataLoader.js';

async function testDataLoader() {
  console.log('Testing data loader...');
  
  const loader = new PokerDataLoader({
    batchSize: 32
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

    // Clean up tensors
    tf.dispose([batch.xs, batch.ys]);

    return {
      success: true,
      message: 'Data loader test passed',
      shapes: { xs: xsShape, ys: ysShape }
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

// Run the test
console.log('Starting data loader test...');
testDataLoader()
  .then(result => console.log('\nTest result:', result))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  }); 