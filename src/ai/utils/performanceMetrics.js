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
        learningRate: {
          values: [],
          schedule: {
            warmupSteps: 0,
            initialLR: 0,
            currentLR: 0,
            minLR: 0,
            decayRate: 0
          }
        }
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
        startTime: null,
        bestValLoss: Infinity,
        patience: 5
      }
    };
    this.lastBatchTime = null;
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
        this.metrics.training.learningRate.values.push(currentLR);
      }

      // Calculate gradient norm if we're in training mode
      if (predictions.trainable) {
        return tf.tidy(() => {
          const gradients = tf.grads(loss);
          const gradientNorm = tf.norm(gradients).dataSync()[0];
          this.metrics.training.gradientNorm.push(gradientNorm);
          return { loss, accuracy, gradientNorm };
        });
      }

      return { loss, accuracy };
    });
  }

  updateValidation(valLoss, valAccuracy) {
    // Early stopping check
    if (valLoss < this.metrics.epoch.bestValLoss) {
      this.metrics.epoch.bestValLoss = valLoss;
      this.metrics.epoch.patience = 5; // Reset patience
      return true; // Model improved
    } else {
      this.metrics.epoch.patience--;
      return this.metrics.epoch.patience > 0; // Continue if patience remains
    }
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
        learningRate: {
          current: this.metrics.training.learningRate.values[this.metrics.training.learningRate.values.length - 1],
          schedule: this.metrics.training.learningRate.schedule
        },
        gradientNorm: this.calculateAverage(this.metrics.training.gradientNorm)
      },
      validation: {
        streetAccuracy: this.metrics.validation.streetAccuracy,
        betSizingError: this.metrics.validation.betSizingError[this.metrics.validation.betSizingError.length - 1],
        bestLoss: this.metrics.epoch.bestValLoss,
        patienceRemaining: this.metrics.epoch.patience
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

  reset() {
    this.metrics.training.loss = [];
    this.metrics.training.accuracy = [];
    this.metrics.training.timePerBatch = [];
    this.metrics.training.memoryUsage = [];
    this.metrics.training.gradientNorm = [];
    this.metrics.training.learningRate.values = [];
    this.metrics.epoch.bestValLoss = Infinity;
    this.metrics.epoch.patience = 5;
    this.lastBatchTime = null;
  }

  updateLearningRate(lrConfig) {
    const { currentLR, warmupSteps, initialLR, minLR, decayRate, schedule } = lrConfig;
    
    // Store previous values for change rate calculation
    const previousLR = this.metrics.training.learningRate.values[this.metrics.training.learningRate.values.length - 1] || currentLR;
    this.metrics.training.learningRate.values.push(currentLR);
    
    // Update schedule config
    this.metrics.training.learningRate.schedule = {
      warmupSteps,
      initialLR,
      currentLR,
      minLR,
      decayRate,
      schedule
    };

    // Validate warmup steps
    if (warmupSteps > 1000) {
      console.warn(`Warmup steps (${warmupSteps}) may be too high for dataset size`);
    }

    // Check learning rate bounds
    if (currentLR < minLR) {
      console.warn(`Learning rate ${currentLR} below minimum ${minLR}`);
    }
    if (currentLR > initialLR) {
      console.warn(`Learning rate ${currentLR} above initial ${initialLR}`);
    }

    // Calculate and validate learning rate change
    const lrChangeRate = (currentLR - previousLR) / previousLR;
    const isInWarmup = this.metrics.training.learningRate.values.length < warmupSteps;
    
    if (isInWarmup) {
      // Track warmup progress
      const warmupProgress = this.metrics.training.learningRate.values.length / warmupSteps;
      this.metrics.training.learningRate.schedule.warmupProgress = warmupProgress;
      
      // Warn if warmup is too slow
      if (warmupProgress > 0.1 && lrChangeRate < 0.01) {
        console.warn(`Learning rate increasing too slowly during warmup (change rate: ${lrChangeRate.toFixed(4)})`);
      }
    } else if (schedule === 'exponential' && decayRate >= 1.0) {
      console.warn(`Exponential decay rate (${decayRate}) should be less than 1.0 for proper decay`);
    }
  }
}

export default PerformanceMetrics; 