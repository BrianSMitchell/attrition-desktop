// Global test teardown for the monorepo
const path = require('path');
const fs = require('fs');

module.exports = async () => {
  // Clean up temp test files
  const tempDir = path.join(process.cwd(), 'temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Could not clean temp directory:', e.message);
    }
  }

  // Optional: Clean test databases if needed
  // This would require connecting to test DB and dropping collections

  console.log('Global test teardown complete');
};
