import { HandHistoryParser } from '../utils/handHistoryParser.js';

async function testHandHistoryParser() {
  console.log('Testing hand history parser...');
  
  try {
    const parser = new HandHistoryParser();
    const sampleHand = `
      PokerStars Hand #176359783262: Hold'em No Limit ($0.50/$1.00)
      Table 'Altair' 6-max Seat #3 is the button
      Seat 1: Player1 ($100)
      Seat 2: Player2 ($150)
      Seat 3: Player3 ($200)
    `;
    
    const result = parser.parse(sampleHand);
    
    console.assert(result.success, 'Parser should successfully parse hand');
    console.assert(Array.isArray(result.hands), 'Should return array of hands');
    
    return {
      success: true,
      message: 'Hand history parser tests passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

testHandHistoryParser().catch(console.error); 