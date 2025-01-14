import * as tf from '@tensorflow/tfjs';
import { ACTIONS } from './constants.js';

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      training: {
        loss: [],
        accuracy: [],
        timePerBatch: [],
        memoryUsage: [],
        gradientNorm: []
      },
      validation: {
        streetAccuracy: {
          preflop: [],
          flop: [],
          turn: [],
          river: []
        },
        positionMetrics: {},
        betSizingError: [],
        handStrengthCorrelation: []
      }
    };
  }

  updateTrainingMetrics(batch, predictions, loss, startTime) {
    const batchTime = Date.now() - startTime;
    const memoryInfo = tf.memory();
    
    this.metrics.training.timePerBatch.push(batchTime);
    this.metrics.training.loss.push(loss);
    this.metrics.training.memoryUsage.push(memoryInfo.numBytes);
    
    // Calculate gradient norm
    const gradients = tf.grads(loss);
    const gradientNorm = tf.norm(gradients).dataSync()[0];
    this.metrics.training.gradientNorm.push(gradientNorm);
  }

  getFormattedMetrics() {
    return {
      training: {
        averageLoss: this.calculateAverage(this.metrics.training.loss),
        averageTimePerBatch: this.calculateAverage(this.metrics.training.timePerBatch),
        memoryUsage: Math.max(...this.metrics.training.memoryUsage) / (1024 * 1024),
        gradientNorm: this.calculateAverage(this.metrics.training.gradientNorm)
      },
      validation: {
        streetAccuracy: Object.fromEntries(
          Object.entries(this.metrics.validation.streetAccuracy)
            .map(([street, values]) => [street, this.calculateAverage(values)])
        )
      }
    };
  }
}

export default PerformanceMetrics; 