import assert from 'assert';
import { convertCardToIndex } from '../utils/cardConverter.js';

async function runTests() {
  console.log('Testing card conversion...');

  // Test all ranks and suits
  const expectedIndices = {
    '2h': 0,  '2d': 1,  '2c': 2,  '2s': 3,
    '3h': 4,  '3d': 5,  '3c': 6,  '3s': 7,
    '4h': 8,  '4d': 9,  '4c': 10, '4s': 11,
    '5h': 12, '5d': 13, '5c': 14, '5s': 15,
    '6h': 16, '6d': 17, '6c': 18, '6s': 19,
    '7h': 20, '7d': 21, '7c': 22, '7s': 23,
    '8h': 24, '8d': 25, '8c': 26, '8s': 27,
    '9h': 28, '9d': 29, '9c': 30, '9s': 31,
    'Th': 32, 'Td': 33, 'Tc': 34, 'Ts': 35,
    'Jh': 36, 'Jd': 37, 'Jc': 38, 'Js': 39,
    'Qh': 40, 'Qd': 41, 'Qc': 42, 'Qs': 43,
    'Kh': 44, 'Kd': 45, 'Kc': 46, 'Ks': 47,
    'Ah': 48, 'Ad': 49, 'Ac': 50, 'As': 51
  };

  for (const [card, expectedIndex] of Object.entries(expectedIndices)) {
    const actualIndex = convertCardToIndex(card);
    assert(
      actualIndex === expectedIndex,
      `${card} should convert to index ${expectedIndex}, got ${actualIndex}`
    );
  }

  console.log('✓ All card conversions passed');
}

runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
}); 