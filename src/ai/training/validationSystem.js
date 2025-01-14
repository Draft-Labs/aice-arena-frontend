class ValidationSystem {
  constructor(model, dataLoader) {
    this.model = model;
    this.dataLoader = dataLoader;
    this.metrics = new PerformanceMetrics();
  }

  async validateEpoch() {
    const validationData = await this.dataLoader.getValidationBatch();
    
    return tf.tidy(() => {
      const predictions = this.model.predict(validationData.xs);
      
      // Calculate various metrics
      const streetMetrics = this.calculateStreetMetrics(predictions, validationData);
      const positionMetrics = this.calculatePositionMetrics(predictions, validationData);
      const betSizingError = this.calculateBetSizingError(predictions, validationData);
      
      return {
        streetMetrics,
        positionMetrics,
        betSizingError
      };
    });
  }

  calculateStreetMetrics(predictions, validationData) {
    // Calculate accuracy for each street
    const streets = ['preflop', 'flop', 'turn', 'river'];
    return streets.reduce((metrics, street) => {
      const streetMask = validationData.metadata.street === street;
      const streetPreds = predictions.gather(streetMask);
      const streetLabels = validationData.ys.gather(streetMask);
      metrics[street] = this.calculateAccuracy(streetPreds, streetLabels);
      return metrics;
    }, {});
  }
} 