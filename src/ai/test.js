import { testEnvironmentSetup } from './utils/testEnvironment';

async function runTests() {
  console.log('Starting AI environment tests...');
  
  const result = await testEnvironmentSetup();
  
  if (result.success) {
    console.log('✅ All tests passed:', result.message);
  } else {
    console.error('❌ Tests failed:', result.message);
  }
}

runTests(); 