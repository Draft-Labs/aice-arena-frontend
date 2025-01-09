import * as tf from '@tensorflow/tfjs';
import { INPUT_SIZE, OUTPUT_SIZE } from '../utils/constants';

class DataLoader {
  constructor(batchSize = 32) {
    this.batchSize = batchSize;
    this.currentIndex = 0;
  }

  async *generateBatches(dataFetcher) {
    while (true) {
      try {
        console.log('DataLoader: Fetching batch...');
        
        // Get data from fetcher using fetchData
        const data = await dataFetcher.fetchData(this.batchSize);
        console.log('DataLoader: Received data:', {
          length: data?.length,
          sampleData: data?.[0],
          isValid: !!data
        });

        if (!data || !data.length) {
          console.warn('DataLoader: No more data available');
          return;
        }

        // Process into tensors with explicit shapes
        console.log('DataLoader: Creating tensors...');
        const tensors = tf.tidy(() => {
          // Create tensors with proper shapes
          const xs = tf.tensor2d(
            data.map(d => Array.isArray(d.input) ? d.input : new Array(INPUT_SIZE).fill(0)),
            [data.length, INPUT_SIZE]
          );
          const ys = tf.tensor2d(
            data.map(d => Array.isArray(d.output) ? d.output : new Array(OUTPUT_SIZE).fill(0)),
            [data.length, OUTPUT_SIZE]
          );
          
          console.log('DataLoader: Tensors created:', {
            xs: xs.shape,
            ys: ys.shape
          });
          
          return { xs, ys };
        });

        yield tensors;  // Yield tensors directly instead of wrapping in value/done
        
      } catch (error) {
        console.error('DataLoader: Error generating batch:', {
          error,
          stack: error.stack
        });
        throw error;
      }
    }
  }

  reset() {
    this.currentIndex = 0;
  }
}

export default DataLoader; 