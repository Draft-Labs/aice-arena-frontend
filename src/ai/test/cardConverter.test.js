import { CardConverter } from '../utils/cardConverter';

async function testCardConverter() {
  console.log('Testing card converter...');
  
  try {
    const converter = new CardConverter();
    // Add your test cases here
    
    return {
      success: true,
      message: 'Card converter tests passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

testCardConverter().catch(console.error); 