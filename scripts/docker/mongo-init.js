// MongoDB initialization script for Docker development
// This script runs when the MongoDB container is first created

print('Starting MongoDB initialization for Attrition development...');

// Switch to the game database
db = db.getSiblingDB('space-empire-mmo');

// Create collections with validation (optional)
db.createCollection('users');
db.createCollection('games');
db.createCollection('planets');
db.createCollection('players');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });
db.games.createIndex({ "gameId": 1 }, { unique: true });
db.games.createIndex({ "createdAt": 1 });
db.players.createIndex({ "gameId": 1, "userId": 1 }, { unique: true });
db.planets.createIndex({ "gameId": 1 });
db.planets.createIndex({ "coordinates.x": 1, "coordinates.y": 1, "gameId": 1 });

print('MongoDB initialization completed successfully!');
print('Database: space-empire-mmo');
print('Collections created: users, games, planets, players');
print('Indexes created for performance optimization');

// Optional: Insert test data for development
print('Inserting development test data...');

// You can add test users, games, etc. here if needed
// Example:
/*
db.users.insertOne({
  username: "testdev",
  email: "test@dev.local",
  passwordHash: "$2a$12$...", // pre-hashed password
  createdAt: new Date(),
  updatedAt: new Date()
});
*/

print('Development data insertion completed!');
