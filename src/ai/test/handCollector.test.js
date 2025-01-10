import HandCollector from '../data/handCollector';
import path from 'path';

async function testHandCollection() {
  console.log('Testing hand collection...');

  const collector = new HandCollector({
    outputDir: 'test/data/hands'
  });

  // Test with sample hand history
  const sampleHand = `
PokerStars Hand #176485: Tournament #12345, $10+$1 Hold'em No Limit - Level I (10/20) - 2023/01/01 12:00:00 ET
Table '12345' 9-max Seat #3 is the button
Seat 1: Player1 (1500 in chips)
Seat 2: Player2 (1600 in chips)
Seat 3: Player3 (2000 in chips)
Player1: posts small blind 10
Player2: posts big blind 20
*** HOLE CARDS ***
Dealt to Player1 [Ah Kh]
Player3: raises 60 to 80
Player1: calls 70
Player2: folds
*** FLOP *** [7h 8h 9h]
Player1: checks
Player3: bets 120
Player1: calls 120
*** TURN *** [7h 8h 9h] [2c]
Player1: checks
Player3: checks
*** RIVER *** [7h 8h 9h 2c] [3d]
Player1: bets 240
Player3: folds
Player1 collected 650 from pot
`;

  const processed = collector.processHand(sampleHand);
  console.log('Processed hand:', JSON.stringify(processed, null, 2));

  console.assert(processed.gameType === 'tournament', 'Should detect tournament game');
  console.assert(processed.stages.length === 4, 'Should extract all streets (preflop, flop, turn, river)');
  console.assert(processed.actions.length > 0, 'Should extract actions');

  // Test statistics
  console.assert(collector.stats.totalHands === 1, 'Should track hand count');
  console.assert(collector.stats.byGameType.tournament === 1, 'Should track game types');

  // Verify each street is present
  console.assert(processed.stages.some(s => s.type === 'preflop'), 'Should have preflop');
  console.assert(processed.stages.some(s => s.type === 'flop'), 'Should have flop');
  console.assert(processed.stages.some(s => s.type === 'turn'), 'Should have turn');
  console.assert(processed.stages.some(s => s.type === 'river'), 'Should have river');

  // Verify actions are properly extracted
  console.assert(processed.actions.length === 10, 'Should extract all actions');
  console.assert(
    processed.stages[0].actions.length === 3,
    'Should have correct number of preflop actions'
  );

  console.log('Hand collection tests passed!');
}

testHandCollection().catch(console.error); 