import CrossValidator from '../utils/crossValidator';
import { verifyTensorCleanup } from './testUtils';

async function testCrossValidation() {
  await verifyTensorCleanup(async () => {
    console.log('Testing cross validation...');

    // Create test data
    const data = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      value: Math.random()
    }));

    const validator = new CrossValidator({ kFolds: 5 });

    // Test fold generation
    let foldCount = 0;
    let totalTrainSize = 0;
    let totalValidSize = 0;

    for (const { trainData, validationData, foldIndex } of validator.generateFolds(data)) {
      console.log(`\nFold ${foldIndex + 1}:`);
      console.log(`Train size: ${trainData.length}`);
      console.log(`Validation size: ${validationData.length}`);

      // Verify no overlap between train and validation
      const trainIds = new Set(trainData.map(d => d.id));
      const validIds = new Set(validationData.map(d => d.id));
      const intersection = [...trainIds].filter(id => validIds.has(id));
      
      console.assert(
        intersection.length === 0,
        'Train and validation sets should not overlap'
      );

      // Verify sizes
      console.assert(
        Math.abs(validationData.length - data.length / 5) <= 1,
        'Validation set should be ~20% of data'
      );

      totalTrainSize += trainData.length;
      totalValidSize += validationData.length;
      foldCount++;
    }

    // Verify we got the right number of folds
    console.assert(foldCount === 5, 'Should generate 5 folds');

    // Verify total sizes
    console.assert(
      totalTrainSize === data.length * 4,
      'Total train size should be 400 (80% * 5 folds)'
    );
    console.assert(
      totalValidSize === data.length,
      'Total validation size should be 100 (20% * 5 folds)'
    );

    console.log('\nAll cross validation tests passed!');
  });
}

testCrossValidation().catch(console.error); 