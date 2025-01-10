import * as tf from '@tensorflow/tfjs-node';
import { MODEL_CONFIG } from '../utils/constants.js';

class DataLoader {
  constructor(batchSize = 32) {
    this.batchSize = batchSize;
    this.currentIndex = 0;
    this.inputSize = MODEL_CONFIG.INPUT_SIZE;
    this.outputSize = MODEL_CONFIG.OUTPUT_SIZE;
    this.tensors = new Set(); // Use Set to avoid duplicates
  }

  async *generateBatches(dataFetcher) {
    while (true) {
      try {
        const data = await dataFetcher.fetchData(this.batchSize);
        
        if (!data || !data.length) {
          // Instead of returning, generate synthetic data for testing
          const syntheticData = Array(this.batchSize).fill(0).map(() => ({
            input: Array(373).fill(0).map(() => Math.random()),
            output: Array(4).fill(0).map((_, i) => i === Math.floor(Math.random() * 4) ? 1 : 0)
          }));
          
          const tensors = tf.tidy(() => {
            const xs = tf.tensor2d(syntheticData.map(d => d.input));
            const ys = tf.tensor2d(syntheticData.map(d => d.output));
            
            this.tensors.add(xs);
            this.tensors.add(ys);
            
            return { xs, ys };
          });

          yield tensors;
          continue;
        }

        // Process into tensors with explicit shapes
        const tensors = tf.tidy(() => {
          const xs = tf.tensor2d(
            data.map(d => Array.isArray(d.input) ? d.input : new Array(this.inputSize).fill(0)),
            [data.length, this.inputSize]
          );
          const ys = tf.tensor2d(
            data.map(d => Array.isArray(d.output) ? d.output : new Array(this.outputSize).fill(0)),
            [data.length, this.outputSize]
          );
          
          // Track tensors for cleanup
          this.tensors.add(xs);
          this.tensors.add(ys);
          
          return { xs, ys };
        });

        yield tensors;
        
      } catch (error) {
        console.error('DataLoader: Error generating batch:', error);
        throw error;
      }
    }
  }

  dispose() {
    // Clean up all tracked tensors
    for (const tensor of this.tensors) {
      if (tensor && !tensor.isDisposed) {
        tensor.dispose();
      }
    }
    this.tensors.clear();
  }

  reset() {
    this.currentIndex = 0;
    this.dispose(); // Clean up tensors on reset
  }
}

export default DataLoader; 