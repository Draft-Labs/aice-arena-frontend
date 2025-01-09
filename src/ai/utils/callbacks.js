class EarlyStopping {
  constructor(options = {}) {
    this.patience = options.patience || 5;
    this.minDelta = options.minDelta || 0.001;
    this.monitor = options.monitor || 'val_loss';
    this.mode = options.mode || 'min';
    this.verbose = options.verbose || false;
    
    this.reset();
  }

  reset() {
    this.wait = 0;
    this.stopped_epoch = 0;
    this.best = this.mode === 'min' ? Infinity : -Infinity;
    this.bestWeights = null;
  }

  // Check if improvement is significant
  hasImproved(current, best) {
    if (this.mode === 'min') {
      return current < best - this.minDelta;
    }
    return current > best + this.minDelta;
  }

  // Called after each epoch
  onEpochEnd(epoch, logs, model) {
    const current = logs[this.monitor];
    
    if (this.hasImproved(current, this.best)) {
      this.best = current;
      this.wait = 0;
      // Save best weights
      this.bestWeights = model.getWeights().map(w => w.clone());
    } else {
      this.wait++;
      if (this.verbose) {
        console.log(`EarlyStopping: patience ${this.wait}/${this.patience}`);
      }
      
      if (this.wait >= this.patience) {
        this.stopped_epoch = epoch;
        model.stopTraining = true;
        // Restore best weights
        if (this.bestWeights) {
          model.setWeights(this.bestWeights);
        }
        if (this.verbose) {
          console.log(`EarlyStopping: stopping at epoch ${epoch}`);
        }
      }
    }
    
    return model.stopTraining;
  }
}

export default EarlyStopping; 