import * as tf from '@tensorflow/tfjs';

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

  update(predictions, labels) {
    return tf.tidy(() => {
      const accuracy = this.calculateAccuracy(predictions, labels);
      const loss = this.calculateLoss(predictions, labels);
      
      this.metrics.training.accuracy.push(accuracy);
      this.metrics.training.loss.push(loss);
      this.metrics.training.memoryUsage.push(tf.memory().numBytes);
    });
  }

  calculateAccuracy(predictions, labels) {
    return tf.tidy(() => {
      const predIndices = predictions.argMax(1);
      const labelIndices = labels.argMax(1);
      return predIndices.equal(labelIndices).mean().dataSync()[0];
    });
  }

  calculateLoss(predictions, labels) {
    return tf.tidy(() => {
      return tf.losses.softmaxCrossEntropy(labels, predictions).dataSync()[0];
    });
  }

  getMetrics() {
    return {
      training: {
        loss: this.metrics.training.loss[this.metrics.training.loss.length - 1],
        accuracy: this.metrics.training.accuracy[this.metrics.training.accuracy.length - 1],
        memoryUsage: this.metrics.training.memoryUsage[this.metrics.training.memoryUsage.length - 1]
      },
      validation: {
        streetAccuracy: this.metrics.validation.streetAccuracy,
        betSizingError: this.metrics.validation.betSizingError[this.metrics.validation.betSizingError.length - 1]
      }
    };
  }
}

export default PerformanceMetrics; 