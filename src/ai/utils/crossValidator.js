import * as tf from '@tensorflow/tfjs';

class CrossValidator {
  constructor(options = {}) {
    this.kFolds = options.kFolds || 5;
    this.shuffle = options.shuffle !== false;
    this.seed = options.seed || 42;
  }

  /**
   * Split data into k folds
   * @param {Array} data - Array of training examples
   * @returns {Array<Array>} Array of k folds
   */
  splitFolds(data) {
    // Shuffle data if enabled
    let indices = Array.from({ length: data.length }, (_, i) => i);
    
    if (this.shuffle) {
      tf.util.shuffle(indices);
    }

    // Split into k roughly equal folds
    const foldSize = Math.floor(data.length / this.kFolds);
    const folds = [];
    
    for (let i = 0; i < this.kFolds; i++) {
      const start = i * foldSize;
      const end = i === this.kFolds - 1 ? data.length : start + foldSize;
      const foldIndices = indices.slice(start, end);
      folds.push(foldIndices.map(idx => data[idx]));
    }

    return folds;
  }

  /**
   * Generate train/validation splits for k-fold cross validation
   * @param {Array} data - Training data
   * @returns {Generator} Yields {trainData, validationData} for each fold
   */
  *generateFolds(data) {
    const folds = this.splitFolds(data);
    
    for (let i = 0; i < this.kFolds; i++) {
      // Use fold i as validation, rest as training
      const validationData = folds[i];
      const trainData = folds
        .filter((_, idx) => idx !== i)
        .flat();

      yield {
        trainData,
        validationData,
        foldIndex: i
      };
    }
  }
}

export default CrossValidator; 