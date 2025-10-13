import { ERROR_MESSAGES } from '../constants/response-formats';

/**
 * ESLint Plugin Live Development Demo
 * Demonstrates real-time quality feedback and automated enforcement
 */

// This file contains intentional violations to demonstrate the ESLint plugin

// VIOLATION 1: Excessive logging (should trigger no-excessive-logging rule)
console.log('🚀 Starting demo application');
console.log('📦 Loading modules...');
console.log('🔧 Initializing configuration');
console.log('⚡ Setting up database connection');
console.log('🎯 Configuring game engine');
console.log('🎮 Loading game assets');
console.log('🌟 Initializing UI components');
console.log('✅ Demo application started successfully');

// VIOLATION 2: Complex function (should trigger max-complexity rule)
function overlyComplexGameLogic(playerData, gameState, config) {
  if (playerData) {
    if (gameState) {
      if (config) {
        if (playerData.id) {
          if (gameState.status === 'active') {
            if (config.difficulty) {
              if (playerData.level > 5) {
                if (gameState.resources) {
                  if (config.features) {
                    if (playerData.inventory) {
                      if (gameState.map) {
                        if (config.settings) {
                          if (playerData.achievements) {
                            if (gameState.weather) {
                              if (config.multiplayer) {
                                if (playerData.friends) {
                                  if (gameState.leaderboard) {
                                    if (config.tutorial) {
                                      if (playerData.progress) {
                                        return processGameLogic(playerData, gameState, config);
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return null;
}

// VIOLATION 3: ID consistency issues (should trigger id-consistency rule)
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

function createGameEntities() {
  // Inconsistent ID patterns - mixing ObjectId and string IDs
  const playerId = new ObjectId(); // ❌ Should use UUID
  const gameId = 'game_' + Date.now(); // ❌ Should use UUID format
  const sessionId = 'sess_' + Math.random().toString(36); // ❌ Should use UUID format

  return {
    playerId,    // ObjectId - inconsistent
    gameId,      // String with prefix - inconsistent
    sessionId    // String with prefix - inconsistent
  };
}

// VIOLATION 4: Legacy database patterns (should trigger no-legacy-database-checks rule)
function legacyDatabaseOperations() {
  // ❌ Direct database operations without service layer
  const directQuery = `
    SELECT * FROM users
    WHERE last_login < '2023-01-01'
    AND status = 'inactive'
  `;

  // ❌ Legacy table name patterns
  const legacyTableName = 'user_accounts';
  const legacyColumnName = 'user_name';

  return {
    query: directQuery,
    table: legacyTableName,
    column: legacyColumnName
  };
}

// VIOLATION 5: Missing service extraction (should trigger service-extraction-required rule)
class GameController {
  constructor() {
    this.db = require('./database'); // ❌ Direct database dependency
    this.cache = require('./cache'); // ❌ Direct cache dependency
  }

  async handleGameAction(action, data) {
    // ❌ Business logic mixed with controller logic
    const user = await this.db.users.findById(data.userId);
    if (!user) throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);

    if (action === 'start') {
      // Complex game logic directly in controller
      const gameState = await this.db.games.findById(data.gameId);
      const config = await this.db.config.findOne({ type: 'game' });

      if (gameState && config) {
        // More business logic...
        await this.db.games.updateOne(
          { _id: data.gameId },
          { $set: { status: 'started', startedAt: new Date() }}
        );

        // Cache operations mixed in
        await this.cache.set(`game:${data.gameId}`, gameState);

        return { success: true };
      }
    }
  }
}

module.exports = {
  overlyComplexGameLogic,
  createGameEntities,
  legacyDatabaseOperations,
  GameController
};

