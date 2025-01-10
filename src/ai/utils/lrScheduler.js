import * as tf from '@tensorflow/tfjs';

class LRScheduler {
  constructor(initialLR, options = {}) {
    this.initialLR = initialLR;
    this.currentLR = initialLR;
    this.schedule = options.schedule || 'exponential';
    this.decayRate = options.decayRate || 0.1;
    this.minLR = options.minLR || 1e-7;
    this.warmupSteps = options.warmupSteps || 1000;
  }

  update(step) {
    console.log('\nLR Scheduler Update:', {
      step,
      warmupSteps: this.warmupSteps,
      initialLR: this.initialLR,
      currentLR: this.currentLR,
      schedule: this.schedule,
      decayRate: this.decayRate,
      minLR: this.minLR
    });

    // Warmup period - linear increase
    if (step < this.warmupSteps) {
      // Linear warmup from 1% to 100% of initial LR
      const startLR = this.initialLR * 0.01;
      const warmupProgress = Math.min(1, step / this.warmupSteps);
      this.currentLR = startLR + (this.initialLR - startLR) * warmupProgress;
      console.log('Warmup calculation:', {
        startLR,
        warmupProgress,
        newLR: this.currentLR
      });
      return this.currentLR;
    }

    // After warmup - apply decay
    switch (this.schedule) {
      case 'exponential':
        const stepsAfterWarmup = step - this.warmupSteps;
        const decayFactor = Math.pow(1 - this.decayRate, stepsAfterWarmup);
        const beforeClip = this.initialLR * decayFactor;
        this.currentLR = Math.max(
          beforeClip,
          this.minLR
        );
        console.log('Exponential decay calculation:', {
          stepsAfterWarmup,
          decayFactor,
          beforeClip,
          afterClip: this.currentLR
        });
        break;

      case 'step':
        const decaySteps = Math.floor((step - this.warmupSteps) / 2) + 1;
        const stepBeforeClip = this.initialLR * Math.pow(0.5, decaySteps);
        this.currentLR = Math.max(
          stepBeforeClip,
          this.minLR
        );
        console.log('Step decay calculation:', {
          decaySteps,
          beforeClip: stepBeforeClip,
          afterClip: this.currentLR
        });
        break;
    }

    console.log('Final LR:', this.currentLR);
    return this.currentLR;
  }
}

export default LRScheduler; 