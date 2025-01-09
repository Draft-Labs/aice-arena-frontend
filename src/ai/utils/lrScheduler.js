import * as tf from '@tensorflow/tfjs';

class LRScheduler {
  constructor(initialLR, options = {}) {
    this.initialLR = initialLR;
    this.currentLR = initialLR;
    this.minLR = options.minLR || 1e-7;
    this.scheduleType = options.schedule || 'exponential';
    this.decayRate = options.decayRate || 0.1;
    this.decaySteps = options.decaySteps || 1000;
    this.warmupSteps = options.warmupSteps || 0;
  }

  // Step decay schedule
  stepDecay(epoch) {
    const decay = Math.pow(this.decayRate, Math.floor(epoch / this.decaySteps));
    return Math.max(this.initialLR * decay, this.minLR);
  }

  // Exponential decay schedule
  exponentialDecay(epoch) {
    const decay = Math.exp(-this.decayRate * epoch);
    return Math.max(this.initialLR * decay, this.minLR);
  }

  // Update learning rate based on current epoch
  update(epoch, metrics = {}) {
    let newLR;

    // Handle warmup period
    if (epoch < this.warmupSteps) {
      newLR = this.initialLR * (epoch + 1) / this.warmupSteps;
    } else {
      // Apply selected schedule
      switch (this.scheduleType) {
        case 'step':
          newLR = this.stepDecay(epoch - this.warmupSteps);
          break;
        case 'exponential':
          newLR = this.exponentialDecay(epoch - this.warmupSteps);
          break;
        default:
          newLR = this.currentLR;
      }
    }

    this.currentLR = newLR;
    return newLR;
  }

  // Get current learning rate
  getLearningRate() {
    return this.currentLR;
  }

  // Reset scheduler state
  reset() {
    this.currentLR = this.initialLR;
  }
}

export default LRScheduler; 