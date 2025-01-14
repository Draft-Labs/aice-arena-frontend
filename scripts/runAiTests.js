import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

const tests = [
  { name: 'Data Processing', command: 'test:ai-data' },
  { name: 'Hand Evaluation', command: 'test:ai-hand' },
  { name: 'Input Transformation', command: 'test:ai-input' },
  { name: 'Model Architecture', command: 'test:ai-model' },
  { name: 'Data Loading', command: 'test:ai-data-loader' },
  { name: 'Training Pipeline', command: 'test:ai-pipeline' },
  { name: 'Training Optimization', command: 'test:ai-optimization' },
  { name: 'Batch Processing', command: 'test:ai-batch' },
  { name: 'Data Augmentation', command: 'test:ai-augmentation' },
  { name: 'Cross Validation', command: 'test:ai-cv' },
  { name: 'Architecture Search', command: 'test:ai-arch' },
  { name: 'Hand Collection', command: 'test:ai-collector' },
  { name: 'Data Processing', command: 'test:ai-processor' },
  { name: 'Learning Rate', command: 'test:ai-scheduler' },
  { name: 'Model Metrics', command: 'test:ai-metrics' },
  { name: 'Scenario Testing', command: 'test:ai-scenario' },
  { name: 'Strategy Verification', command: 'test:ai-strategy' },
  { name: 'Small Scale Training', command: 'test:ai-small-scale' },
  { name: 'Hand History Parser', command: 'test:ai-parser', optional: true },
  { name: 'Card Conversion', command: 'test:ai-cards', optional: true }
];

async function runTests() {
  console.log('Starting AI Test Suite\n');
  const startTime = performance.now();
  const results = [];
  let failedTests = 0;
  let skippedTests = 0;

  for (const test of tests) {
    const testStart = performance.now();
    console.log(`\n🔄 Running ${test.name}...`);
    
    try {
      execSync(`npm run ${test.command}`, { stdio: 'inherit' });
      const duration = ((performance.now() - testStart) / 1000).toFixed(2);
      results.push({ name: test.name, status: 'PASS', duration });
      console.log(`✅ ${test.name} passed (${duration}s)`);
    } catch (error) {
      const duration = ((performance.now() - testStart) / 1000).toFixed(2);
      if (test.optional) {
        console.warn(`⚠️ ${test.name} skipped (${duration}s) - Optional test`);
        results.push({ name: test.name, status: 'SKIP', duration });
        skippedTests++;
      } else {
        results.push({ name: test.name, status: 'FAIL', duration, error: error.message });
        console.error(`❌ ${test.name} failed (${duration}s)`);
        failedTests++;
      }
    }
  }

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n----------------------------------------');
  console.log('AI Test Suite Results');
  console.log('----------------------------------------');
  console.log(`Total Duration: ${totalDuration}s`);
  console.log(`Tests Run: ${tests.length}`);
  console.log(`Passed: ${tests.length - failedTests - skippedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Skipped: ${skippedTests}`);
  console.log('----------------------------------------\n');

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'SKIP' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name.padEnd(25)} ${result.status} (${result.duration}s)`);
  });

  if (failedTests > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(failure => {
        console.log(`\n❌ ${failure.name}`);
        console.log(`   Error: ${failure.error}`);
      });
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
}); 