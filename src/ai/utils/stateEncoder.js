import { encodeCards, normalizeValue } from './cardEncoder';

export function encodeGameState(gameState) {
  const {
    playerCards,
    communityCards,
    position,
    potSize,
    stackSize,
    lastAction
  } = gameState;

  // Validate card counts
  if (playerCards.length !== 2) {
    throw new Error(`Expected 2 player cards, got ${playerCards.length}`);
  }

  // Pad community cards to 5 if needed
  const paddedCommunityCards = [...communityCards];
  while (paddedCommunityCards.length < 5) {
    paddedCommunityCards.push(0); // Use 0 for unknown/future cards
  }

  // Encode cards
  const encodedPlayerCards = encodeCards(playerCards);
  const encodedCommunityCards = encodeCards(paddedCommunityCards);

  // Add debug logging
  console.log('Encoding details:', {
    playerCardsLength: encodedPlayerCards.length,
    communityCardsLength: encodedCommunityCards.length,
    position: 1,
    potSize: 1,
    stackSize: 1,
    actionLength: 3,
    totalLength: encodedPlayerCards.length + 
                 encodedCommunityCards.length + 
                 1 + 1 + 1 + 3,
    rawPlayerCards: playerCards,
    rawCommunityCards: paddedCommunityCards
  });

  // Normalize numeric values
  const normalizedPosition = normalizeValue(position, 6); // 6 max players
  const normalizedPot = normalizeValue(potSize, 1000); // Assume 1000 max pot
  const normalizedStack = normalizeValue(stackSize, 1000); // Assume 1000 max stack

  // Encode previous action (one-hot)
  const encodedAction = new Array(3).fill(0);
  if (lastAction !== undefined) {
    encodedAction[lastAction] = 1;
  }

  // Combine all features
  return [
    ...encodedPlayerCards,
    ...encodedCommunityCards,
    normalizedPosition,
    normalizedPot,
    normalizedStack,
    ...encodedAction
  ];
} 