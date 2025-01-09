import PokerDataLoader from '../training/dataLoader';
import PokerDataFetcher from '../data/dataFetcher';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

async function testDataLoader() {
  console.log('Testing data loader...');
  
  try {
    const loader = new PokerDataLoader({
      batchSize: 16,
      validationSplit: 0.2
    });
    
    const fetcher = new PokerDataFetcher();
    
    // Test batch generation
    console.log('\nTesting batch generation...');
    const batchIterator = loader.generateBatches(fetcher);
    const firstBatch = await batchIterator.next();
    
    console.log('Batch shapes:', {
      inputs: firstBatch.value.xs.shape,
      labels: firstBatch.value.ys.shape,
      expectedInputDims: [null, INPUT_SIZE],
      expectedLabelDims: [null, OUTPUT_SIZE]
    });

    // Test data distribution
    const labels = await firstBatch.value.ys.array();
    const actionCounts = labels.reduce((counts, label) => {
      const action = label.indexOf(1);
      counts[action] = (counts[action] || 0) + 1;
      return counts;
    }, {});

    console.log('\nAction distribution:', actionCounts);

    // Clean up
    firstBatch.value.xs.dispose();
    firstBatch.value.ys.dispose();

    return {
      success: true,
      message: 'Data loader tests completed successfully'
    };

  } catch (error) {
    console.error('Test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testDataLoader().then(result => {
  console.log('\nTest result:', result);
}); 