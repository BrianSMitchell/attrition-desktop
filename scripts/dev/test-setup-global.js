// Global test setup for the monorepo
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.TZ = 'UTC';

  // Ensure logs and temp directories exist
  const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
  ensureDir(path.join(process.cwd(), 'logs'));
  ensureDir(path.join(process.cwd(), 'temp'));

  // Optionally load .env.test
  const dotenvPath = path.join(process.cwd(), '.env.test');
  if (fs.existsSync(dotenvPath)) {
    // Dynamically require dotenv to avoid dependency if not needed
    try {
      require('dotenv').config({ path: dotenvPath });
      console.log('Loaded .env.test for test environment');
    } catch (e) {
      // dotenv not installed - skip
    }
  }

  console.log('Global test setup complete');
};
