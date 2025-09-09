#!/usr/bin/env node

/**
 * Test Database Utilities
 * Provides utilities for managing test database state
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

class TestDatabaseUtils {
    constructor(dbUri = 'mongodb://localhost:27017/attrition-test') {
        this.dbUri = dbUri;
        this.client = null;
        this.db = null;
    }

    /**
     * Connect to the test database
     */
    async connect() {
        try {
            this.client = new MongoClient(this.dbUri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 5000
            });
            
            await this.client.connect();
            this.db = this.client.db();
            console.log('Connected to test database');
            return this.db;
        } catch (error) {
            console.error('Failed to connect to test database:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the test database
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('Disconnected from test database');
        }
    }

    /**
     * Clean all collections in the test database
     */
    async cleanDatabase() {
        if (!this.db) await this.connect();

        try {
            const collections = await this.db.collections();
            const dropPromises = collections.map(collection => collection.drop());
            await Promise.all(dropPromises);
            console.log(`Cleaned ${collections.length} collections from test database`);
        } catch (error) {
            console.error('Error cleaning database:', error);
            throw error;
        }
    }

    /**
     * Seed test users
     */
    async seedUsers(count = 5) {
        if (!this.db) await this.connect();

        const users = [];
        const hashedPassword = await bcrypt.hash('testpass123', 10);

        for (let i = 1; i <= count; i++) {
            users.push({
                email: `testuser${i}@example.com`,
                username: `testuser${i}`,
                passwordHash: hashedPassword,
                gameProfile: {
                    empireId: null,
                    credits: 1000,
                    experience: 0
                },
                createdAt: new Date(),
                lastLogin: new Date(),
                isAdmin: i === 1 // First user is admin
            });
        }

        const result = await this.db.collection('users').insertMany(users);
        console.log(`Seeded ${result.insertedCount} test users`);
        return result.insertedIds;
    }

    /**
     * Seed test empires
     */
    async seedEmpires(userIds, count = 3) {
        if (!this.db) await this.connect();
        if (!userIds || userIds.length === 0) {
            throw new Error('Need user IDs to create empires');
        }

        const empires = [];
        const empireNames = ['Galactic Republic', 'Solar Federation', 'Star Alliance', 'Cosmic Empire', 'Nebula Dynasty'];

        for (let i = 0; i < Math.min(count, userIds.length); i++) {
            empires.push({
                userId: userIds[i],
                name: empireNames[i] || `Test Empire ${i + 1}`,
                homeSystem: null, // Will be set when star systems are created
                territories: [],
                fleets: [],
                resources: {
                    credits: 5000,
                    minerals: 1000,
                    energy: 1000,
                    research: 100
                },
                technology: {
                    military: 1,
                    economic: 1,
                    exploration: 1
                },
                createdAt: new Date(),
                lastActive: new Date()
            });
        }

        const result = await this.db.collection('empires').insertMany(empires);
        
        // Update users with empire IDs
        for (let i = 0; i < result.insertedIds.length; i++) {
            await this.db.collection('users').updateOne(
                { _id: userIds[i] },
                { $set: { 'gameProfile.empireId': result.insertedIds[i] } }
            );
        }

        console.log(`Seeded ${result.insertedCount} test empires`);
        return result.insertedIds;
    }

    /**
     * Seed test star systems
     */
    async seedStarSystems(count = 10) {
        if (!this.db) await this.connect();

        const systems = [];
        const systemNames = [
            'Alpha Centauri', 'Beta Orionis', 'Gamma Draconis', 'Delta Vega',
            'Epsilon Eridani', 'Zeta Reticuli', 'Eta Cassiopeiae', 'Theta Serpentis',
            'Iota Carinae', 'Kappa Phoenicis'
        ];

        for (let i = 0; i < count; i++) {
            systems.push({
                name: systemNames[i] || `System-${i + 1}`,
                position: {
                    x: Math.random() * 1000 - 500,
                    y: Math.random() * 1000 - 500,
                    z: Math.random() * 100 - 50
                },
                planets: Math.floor(Math.random() * 8) + 1,
                resources: {
                    minerals: Math.floor(Math.random() * 1000) + 100,
                    energy: Math.floor(Math.random() * 800) + 50,
                    research: Math.floor(Math.random() * 200) + 10
                },
                controlledBy: null, // Can be assigned to empires later
                discovered: i < 3, // First few systems are discovered
                createdAt: new Date()
            });
        }

        const result = await this.db.collection('starsystems').insertMany(systems);
        console.log(`Seeded ${result.insertedCount} test star systems`);
        return result.insertedIds;
    }

    /**
     * Create a complete test dataset
     */
    async seedAll() {
        console.log('🌱 Starting complete test database seeding...');
        
        await this.cleanDatabase();
        
        const userIds = Object.values(await this.seedUsers(5));
        const empireIds = Object.values(await this.seedEmpires(userIds, 3));
        const systemIds = Object.values(await this.seedStarSystems(10));

        // Assign home systems to empires
        for (let i = 0; i < empireIds.length && i < systemIds.length; i++) {
            await this.db.collection('empires').updateOne(
                { _id: empireIds[i] },
                { $set: { homeSystem: systemIds[i] } }
            );
            
            await this.db.collection('starsystems').updateOne(
                { _id: systemIds[i] },
                { $set: { controlledBy: empireIds[i] } }
            );
        }

        console.log('✅ Complete test database seeding finished');
        return {
            users: userIds,
            empires: empireIds,
            systems: systemIds
        };
    }

    /**
     * Get test user credentials for authentication tests
     */
    getTestCredentials() {
        return {
            admin: {
                email: 'testuser1@example.com',
                password: 'testpass123',
                username: 'testuser1'
            },
            user: {
                email: 'testuser2@example.com', 
                password: 'testpass123',
                username: 'testuser2'
            }
        };
    }

    /**
     * Verify database state
     */
    async verifyState() {
        if (!this.db) await this.connect();

        const counts = {
            users: await this.db.collection('users').countDocuments(),
            empires: await this.db.collection('empires').countDocuments(),
            systems: await this.db.collection('starsystems').countDocuments()
        };

        console.log('Database state:', counts);
        return counts;
    }
}

// CLI interface
if (require.main === module) {
    const command = process.argv[2];
    const utils = new TestDatabaseUtils();

    async function runCommand() {
        try {
            switch (command) {
                case 'clean':
                    await utils.cleanDatabase();
                    break;
                case 'seed':
                    await utils.seedAll();
                    break;
                case 'verify':
                    await utils.verifyState();
                    break;
                default:
                    console.log('Usage: node test-db-utils.js <command>');
                    console.log('Commands: clean, seed, verify');
            }
        } catch (error) {
            console.error('Command failed:', error);
            process.exit(1);
        } finally {
            await utils.disconnect();
        }
    }

    runCommand();
}

module.exports = TestDatabaseUtils;
