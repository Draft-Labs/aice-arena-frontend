import PokerDataFetcher from '../data/dataFetcher';
import { cardToString } from '../utils/cardConverter';
import { ACTIONS, POSITIONS } from '../utils/constants';

async function testDataFetching() {
  console.log('Testing data fetching...');
  
  const fetcher = new PokerDataFetcher();
  try {
    const hands = await fetcher.fetchData();
    
    const firstHand = hands[0];
    console.log('Sample hand:', {
      id: firstHand.id,
      players: firstHand.players.map(p => ({
        name: p.name,
        cards: p.cards.map(cardToString),
        position: firstHand.positions[p.name] || 'Unknown',
        relativePosition: Object.keys(POSITIONS)[
          firstHand.relativePositions[
            firstHand.players.findIndex(player => player.name === p.name)
          ]
        ],
        stack: firstHand.stacks[p.name]
      })),
      communityCards: firstHand.communityCards.map(cardToString),
      actions: firstHand.actions.map(a => ({
        player: a.player,
        action: Object.keys(ACTIONS)[a.action],
        amount: a.amount,
        position: firstHand.positions[a.player] || 'Unknown',
        relativePosition: Object.keys(POSITIONS)[a.relativePosition],
        potAfterAction: a.potAfterAction,
        stackAfterAction: a.stackAfterAction
      })),
      positions: firstHand.positions,
      currentRound: firstHand.currentRound,
      finalPotSize: firstHand.potSize,
      buttonPosition: firstHand.buttonPosition
    });
    
    console.log('Debug info:', {
      playerCount: firstHand.playerCount,
      buttonPosition: firstHand.buttonPosition,
      playerOrder: firstHand.players.map(p => ({
        name: p.name,
        position: p.position,
        relativePosition: Object.keys(POSITIONS)[firstHand.relativePositions[p.position]]
      })),
      positionMapping: firstHand.relativePositions
    });
    
    return {
      success: true,
      message: `Successfully loaded ${hands.length} hands`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

testDataFetching().then(result => {
  console.log('Test result:', result);
}); 