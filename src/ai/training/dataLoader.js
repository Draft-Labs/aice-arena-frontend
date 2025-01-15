import * as tf from '@tensorflow/tfjs';

class PokerDataLoader {
  constructor(config = {}) {
    this.batchSize = config.batchSize || 32;
    this.validationSplit = config.validationSplit || 0.2;
    this.currentIndex = 0;
    this.data = {
      inputs: [],
      labels: [],
      validationInputs: [],
      validationLabels: []
    };
    this.isDataLoaded = false;
  }

  async loadData(numHands = 1000) {
    if (numHands <= 0) {
      console.warn('Invalid number of hands, using default of 1000');
      numHands = 1000;
    }

    // Clear existing data
    this.data = {
      inputs: [],
      labels: [],
      validationInputs: [],
      validationLabels: []
    };

    // Generate sample training data
    for (let i = 0; i < numHands; i++) {
      const input = Array.from({length: 373}, () => Math.random());
      const label = Array.from({length: 4}, () => 0);
      label[Math.floor(Math.random() * 4)] = 1;
      
      this.data.inputs.push(input);
      this.data.labels.push(label);
    }

    // Ensure we have at least one batch worth of data
    if (this.data.inputs.length < this.batchSize) {
      throw new Error(`Not enough data for one batch. Need at least ${this.batchSize} samples.`);
    }

    // Shuffle data
    const indices = Array.from({length: numHands}, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Split into training and validation
    const validationSize = Math.floor(numHands * this.validationSplit);
    const validationIndices = indices.slice(0, validationSize);
    const trainingIndices = indices.slice(validationSize);

    // Update data arrays
    this.data.validationInputs = validationIndices.map(i => this.data.inputs[i]);
    this.data.validationLabels = validationIndices.map(i => this.data.labels[i]);
    this.data.inputs = trainingIndices.map(i => this.data.inputs[i]);
    this.data.labels = trainingIndices.map(i => this.data.labels[i]);
    
    this.isDataLoaded = true;
    return true;
  }

  async nextBatch() {
    if (!this.isDataLoaded) {
      await this.loadData();
    }

    return tf.tidy(() => {
      const batchStart = this.currentIndex;
      const batchEnd = Math.min(batchStart + this.batchSize, this.data.inputs.length);
      
      const batchInputs = this.data.inputs.slice(batchStart, batchEnd);
      const batchLabels = this.data.labels.slice(batchStart, batchEnd);
      
      if (batchInputs.length === 0) {
        this.currentIndex = 0;
        return this.nextBatch();
      }

      this.currentIndex = batchEnd % this.data.inputs.length;

      return {
        xs: tf.tensor2d(batchInputs, [batchInputs.length, 373]),
        ys: tf.tensor2d(batchLabels, [batchLabels.length, 4])
      };
    });
  }

  getValidationData() {
    if (!this.isDataLoaded) {
      throw new Error('No validation data available. Call loadData() first.');
    }

    return tf.tidy(() => ({
      xs: tf.tensor2d(this.data.validationInputs, [this.data.validationInputs.length, 373]),
      ys: tf.tensor2d(this.data.validationLabels, [this.data.validationLabels.length, 4])
    }));
  }

  reset() {
    this.currentIndex = 0;
  }

  dispose() {
    tf.dispose([this.data.inputs, this.data.labels, 
                this.data.validationInputs, this.data.validationLabels]);
    this.isDataLoaded = false;
  }
}

export default PokerDataLoader; 