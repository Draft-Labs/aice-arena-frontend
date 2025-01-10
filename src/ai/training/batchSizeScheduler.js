class BatchSizeScheduler {
  constructor(config = {}) {
    this.initialBatchSize = config.initialBatchSize || 32;
    this.maxBatchSize = config.maxBatchSize || 128;
    this.minBatchSize = config.minBatchSize || 16;
    this.growthRate = config.growthRate || 2;
    this.performanceThreshold = config.performanceThreshold || 0.8;
    
    this.currentBatchSize = this.initialBatchSize;
    this.batchSizeHistory = [this.initialBatchSize];
    this.performanceHistory = [];
  }

  getCurrentBatchSize() {
    return this.currentBatchSize;
  }

  getBatchSizeHistory() {
    return this.batchSizeHistory;
  }

  update(performance) {
    this.performanceHistory.push(performance);

    // Only update batch size after collecting enough performance data
    if (this.performanceHistory.length >= 3) {
      const recentPerformance = this.performanceHistory.slice(-3);
      const averagePerformance = recentPerformance.reduce((a, b) => a + b) / recentPerformance.length;

      if (averagePerformance > this.performanceThreshold) {
        // Increase batch size if performance is good
        this.currentBatchSize = Math.min(
          this.maxBatchSize,
          this.currentBatchSize * this.growthRate
        );
      } else {
        // Decrease batch size if performance is poor
        this.currentBatchSize = Math.max(
          this.minBatchSize,
          this.currentBatchSize / this.growthRate
        );
      }

      // Round to nearest power of 2
      this.currentBatchSize = Math.pow(2, Math.round(Math.log2(this.currentBatchSize)));
    }

    this.batchSizeHistory.push(this.currentBatchSize);
    return this.currentBatchSize;
  }

  reset() {
    this.currentBatchSize = this.initialBatchSize;
    this.batchSizeHistory = [this.initialBatchSize];
    this.performanceHistory = [];
  }
}

export default BatchSizeScheduler; 