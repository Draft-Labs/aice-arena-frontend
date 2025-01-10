import * as tf from '@tensorflow/tfjs';

class BatchSizeScheduler {
  constructor(options = {}) {
    this.minBatchSize = options.minBatchSize || 16;
    this.maxBatchSize = options.maxBatchSize || 256;
    this.currentBatchSize = options.initialBatchSize || 32;
    this.growthFactor = options.growthFactor || 1.5;
    this.memoryThreshold = options.memoryThreshold || 0.8; // 80% of available memory
    this.stabilityWindow = options.stabilityWindow || 5;
    this.lossHistory = [];
  }

  // Update batch size based on training metrics
  update(metrics) {
    const { loss, memoryUsage } = metrics;
    this.lossHistory.push(loss);

    // Keep only recent history
    if (this.lossHistory.length > this.stabilityWindow) {
      this.lossHistory.shift();
    }

    // Check memory usage
    const memoryInfo = memoryUsage || tf.memory();
    const totalBytes = memoryInfo.maxBytes || (memoryInfo.numBytes * 2);
    const memoryUtilization = memoryInfo.numBytes / totalBytes;

    // Calculate loss stability
    const isStable = this.isLossStable();

    // Adjust batch size
    if (isStable && memoryUtilization < this.memoryThreshold) {
      if (this.lossHistory.length >= this.stabilityWindow) {
        const newSize = Math.min(
          this.maxBatchSize,
          Math.floor(this.currentBatchSize * this.growthFactor)
        );
        if (newSize > this.currentBatchSize) {
          this.currentBatchSize = newSize;
        }
      }
    } else if (!isStable || memoryUtilization > this.memoryThreshold) {
      this.decreaseBatchSize();
    }

    console.log('Batch size update:', {
      currentBatchSize: this.currentBatchSize,
      memoryUtilization: memoryUtilization.toFixed(2),
      isStable,
      lossHistory: this.lossHistory
    });

    return this.currentBatchSize;
  }

  // Check if loss is stable
  isLossStable() {
    if (this.lossHistory.length < this.stabilityWindow) {
      return false;
    }

    const recentLosses = this.lossHistory.slice(-this.stabilityWindow);
    const mean = recentLosses.reduce((a, b) => a + b) / this.stabilityWindow;
    const variance = recentLosses.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.stabilityWindow;
    
    return variance < 0.01; // Consider stable if variance is small
  }

  // Increase batch size
  increaseBatchSize() {
    const newSize = Math.min(
      this.maxBatchSize,
      Math.floor(this.currentBatchSize * this.growthFactor)
    );
    this.currentBatchSize = newSize;
  }

  // Decrease batch size
  decreaseBatchSize() {
    const newSize = Math.max(
      this.minBatchSize,
      Math.floor(this.currentBatchSize / this.growthFactor)
    );
    this.currentBatchSize = newSize;
  }

  // Get current batch size
  getCurrentBatchSize() {
    return this.currentBatchSize;
  }
}

export default BatchSizeScheduler; 