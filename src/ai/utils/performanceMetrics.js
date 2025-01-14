import * as tf from '@tensorflow/tfjs';

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      training: {
        loss: [],
        accuracy: [],
        timePerBatch: [],
        memoryUsage: [],
        gradientNorm: [],
        learningRate: []
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
      },
      epoch: {
        current: 0,
        total: 0,
        startTime: null
      }
    };
  }

  startEpoch(epochNumber, totalEpochs) {
    this.metrics.epoch.current = epochNumber;
    this.metrics.epoch.total = totalEpochs;
    this.metrics.epoch.startTime = Date.now();
  }

  update(predictions, labels, currentLR = null) {
    return tf.tidy(() => {
      const accuracy = this.calculateAccuracy(predictions, labels);
      const loss = this.calculateLoss(predictions, labels);
      const timePerBatch = Date.now() - (this.lastBatchTime || Date.now());
      this.lastBatchTime = Date.now();
      
      this.metrics.training.accuracy.push(accuracy);
      this.metrics.training.loss.push(loss);
      this.metrics.training.memoryUsage.push(tf.memory().numBytes);
      this.metrics.training.timePerBatch.push(timePerBatch);
      
      if (currentLR !== null) {
        this.metrics.training.learningRate.push(currentLR);
      }

      // Calculate gradient norm if we're in training mode
      if (predictions.trainable) {
        const gradients = tf.grads(loss);
        const gradientNorm = tf.norm(gradients).dataSync()[0];
        this.metrics.training.gradientNorm.push(gradientNorm);
      }
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
    const epochTime = (Date.now() - (this.metrics.epoch.startTime || Date.now())) / 1000;
    
    return {
      training: {
        loss: this.metrics.training.loss[this.metrics.training.loss.length - 1],
        accuracy: this.metrics.training.accuracy[this.metrics.training.accuracy.length - 1],
        memoryUsage: this.metrics.training.memoryUsage[this.metrics.training.memoryUsage.length - 1],
        averageTimePerBatch: this.calculateAverage(this.metrics.training.timePerBatch),
        learningRate: this.metrics.training.learningRate[this.metrics.training.learningRate.length - 1],
        gradientNorm: this.calculateAverage(this.metrics.training.gradientNorm)
      },
      validation: {
        streetAccuracy: this.metrics.validation.streetAccuracy,
        betSizingError: this.metrics.validation.betSizingError[this.metrics.validation.betSizingError.length - 1]
      },
      epoch: {
        current: this.metrics.epoch.current,
        total: this.metrics.epoch.total,
        timeElapsed: epochTime
      }
    };
  }

  calculateAverage(array) {
    return array.length > 0 
      ? array.reduce((a, b) => a + b) / array.length 
      : 0;
  }
}

export default PerformanceMetrics; 