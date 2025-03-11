import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { toast } from 'react-toastify';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyA938nUWEfj366te2LXD80kq28aQmVQbWg",
    authDomain: "casino-dapp-48c82.firebaseapp.com",
    projectId: "casino-dapp-48c82",
    storageBucket: "casino-dapp-48c82.firebasestorage.app",
    messagingSenderId: "131413974864",
    appId: "1:131413974864:web:28f2236e5c9e3d1229d655",
    measurementId: "G-ZQDDS6WF21"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Helper function to ensure authentication
export const ensureAuthenticated = async () => {
  try {
    if (!auth.currentUser) {
      console.log('No current user, attempting anonymous sign in...');
      const result = await signInAnonymously(auth);
      console.log('Anonymous sign in successful:', result.user.uid);
    }
    return auth.currentUser;
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.code === 'auth/configuration-not-found') {
      toast.error('Authentication not properly configured. Please contact support.');
    } else {
      toast.error(`Authentication error: ${error.message}`);
    }
    throw error;
  }
}; 

// Add this new function
export const saveTableName = async (tableId, tableName) => {
  try {
    await ensureAuthenticated();
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    await setDoc(tableRef, {
      name: tableName,
      createdAt: new Date().toISOString()
    });
    console.log('Table name saved successfully:', { tableId, tableName });
    return true;
  } catch (error) {
    console.error('Error saving table name:', error);
    throw error;
  }
};

// Add this function to fetch table name
export const getTableName = async (tableId) => {
  try {
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    const docSnap = await getDoc(tableRef);
    return docSnap.exists() ? docSnap.data().name : `Table ${tableId}`;
  } catch (error) {
    console.error('Error fetching table name:', error);
    return `Table ${tableId}`;
  }
};

// NEW FUNCTION: Update current turn in Firebase
export const updateCurrentTurn = async (tableId, currentTurnData) => {
  try {
    await ensureAuthenticated();
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    
    // Get the current document
    const docSnap = await getDoc(tableRef);
    
    if (docSnap.exists()) {
      // Update the existing document with turn data
      await updateDoc(tableRef, {
        currentTurn: currentTurnData.address,
        currentPosition: currentTurnData.position,
        gameState: currentTurnData.gameState,
        gamePhase: currentTurnData.gamePhase,
        lastUpdated: serverTimestamp()
      });
    } else {
      // Create the document if it doesn't exist
      await setDoc(tableRef, {
        name: `Table ${tableId}`,
        currentTurn: currentTurnData.address,
        currentPosition: currentTurnData.position,
        gameState: currentTurnData.gameState,
        gamePhase: currentTurnData.gamePhase,
        createdAt: new Date().toISOString(),
        lastUpdated: serverTimestamp()
      });
    }
    
    console.log('Current turn updated successfully:', { tableId, ...currentTurnData });
    return true;
  } catch (error) {
    console.error('Error updating current turn:', error);
    throw error;
  }
};

// NEW FUNCTION: Subscribe to turn updates
export const subscribeTurnUpdates = (tableId, callback) => {
  try {
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    
    // Set up real-time listener for turn changes
    const unsubscribe = onSnapshot(tableRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          currentTurn: data.currentTurn || null,
          currentPosition: data.currentPosition || 0,
          gameState: data.gameState || 0,
          gamePhase: data.gamePhase || 'Waiting',
          lastUpdated: data.lastUpdated || null
        });
      } else {
        console.log(`No Firebase data for table ${tableId}`);
      }
    }, (error) => {
      console.error('Error subscribing to turn updates:', error);
    });
    
    // Return the unsubscribe function to clean up the listener
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up turn subscription:', error);
    return () => {}; // Return empty function as fallback
  }
};

// NEW FUNCTION: Get current turn data from Firebase
export const getCurrentTurnData = async (tableId) => {
  try {
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    const docSnap = await getDoc(tableRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        currentTurn: data.currentTurn || null,
        currentPosition: data.currentPosition || 0,
        gameState: data.gameState || 0,
        gamePhase: data.gamePhase || 'Waiting',
        lastUpdated: data.lastUpdated || null
      };
    } else {
      console.log(`No Firebase data for table ${tableId}`);
      return null;
    }
  } catch (error) {
    console.error('Error getting current turn data:', error);
    return null;
  }
};

// NEW FUNCTION: Record a player's move
export const recordPlayerMove = async (tableId, moveData) => {
  try {
    await ensureAuthenticated();
    
    // First get the table document to check if it exists
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    const tableDoc = await getDoc(tableRef);
    
    // Create a unique move ID using current time and player address
    const moveId = `${Date.now()}-${moveData.playerAddress.slice(0, 6)}`;
    
    // Create a move object with all needed data
    const move = {
      moveId: moveId,
      playerAddress: moveData.playerAddress,
      playerName: moveData.playerName || moveData.playerAddress.slice(0, 8) + '...',
      action: moveData.action,
      amount: moveData.amount || null,
      timestamp: serverTimestamp(),
      position: moveData.position || 0
    };
    
    if (tableDoc.exists()) {
      // Update the table with the latest move
      await updateDoc(tableRef, {
        latestMove: move
      });
    } else {
      // Create the table document if it doesn't exist
      await setDoc(tableRef, {
        name: `Table ${tableId}`,
        createdAt: new Date().toISOString(),
        latestMove: move
      });
    }
    
    // Also add to move history collection
    const movesCollectionRef = collection(db, 'pokerTables', tableId.toString(), 'moves');
    await addDoc(movesCollectionRef, move);
    
    console.log('Player move recorded:', { tableId, moveId, ...moveData });
    return true;
  } catch (error) {
    console.error('Error recording player move:', error);
    throw error;
  }
};

// NEW FUNCTION: Subscribe to player moves
export const subscribeMoveUpdates = (tableId, callback) => {
  try {
    const tableRef = doc(db, 'pokerTables', tableId.toString());
    let lastMoveId = null;
    
    // Set up real-time listener for move changes
    const unsubscribe = onSnapshot(tableRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.latestMove) {
          // Check if this is a new move by comparing moveId
          if (data.latestMove.moveId !== lastMoveId) {
            // Store the current moveId to avoid duplicate processing
            lastMoveId = data.latestMove.moveId;
            console.log('New move detected with ID:', lastMoveId);
            
            // Call callback with move data
            callback(data.latestMove);
          } else {
            console.log('Ignoring duplicate move update for ID:', lastMoveId);
          }
        }
      }
    }, (error) => {
      console.error('Error subscribing to move updates:', error);
    });
    
    // Return the unsubscribe function to clean up the listener
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up move subscription:', error);
    return () => {}; // Return empty function as fallback
  }
};