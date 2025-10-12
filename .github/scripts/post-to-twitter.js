#!/usr/bin/env node

/**
 * Twitter posting script for Attrition MMO social media automation
 * This script posts updates about code commits and releases to Twitter
 */

const https = require('https');

class TwitterPoster {
  constructor() {
    // Twitter API v2 credentials from environment variables
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiKeySecret = process.env.TWITTER_API_KEY_SECRET;
    this.accessToken = process.env.TWITTER_ACCESS_TOKEN;
    this.accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!this.bearerToken) {
      throw new Error('Missing Twitter API credentials. Please set TWITTER_BEARER_TOKEN environment variable.');
    }
  }

  /**
   * Posts a tweet using Twitter API v2
   * @param {string} text - The tweet text
   * @returns {Promise<Object>} - Twitter API response
   */
  async postTweet(text) {
    // Ensure tweet doesn't exceed Twitter's character limit
    if (text.length > 280) {
      console.log(`⚠️  Tweet is ${text.length} characters, truncating to 280...`);
      text = text.substring(0, 277) + '...';
    }

    const data = JSON.stringify({
      text: text
    });

    const options = {
      hostname: 'api.twitter.com',
      path: '/2/tweets',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseBody = '';
        
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(responseBody);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              console.log('✅ Tweet posted successfully!');
              console.log(`🔗 Tweet ID: ${response.data.id}`);
              resolve(response);
            } else {
              console.error('❌ Twitter API error:', response);
              reject(new Error(`Twitter API error: ${res.statusCode} - ${responseBody}`));
            }
          } catch (error) {
            console.error('❌ Error parsing Twitter response:', error);
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Network error posting to Twitter:', error);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Validates that the tweet text is appropriate
   * @param {string} text - Tweet text to validate
   * @returns {boolean} - Whether the tweet is valid
   */
  validateTweet(text) {
    if (!text || text.trim().length === 0) {
      console.error('❌ Tweet text is empty');
      return false;
    }

    if (text.length > 280) {
      console.log(`⚠️  Tweet is ${text.length} characters (will be truncated)`);
    }

    // Basic content filtering (you can expand this)
    const bannedWords = ['test', 'debug', 'temporary'];
    const lowerText = text.toLowerCase();
    
    for (const word of bannedWords) {
      if (lowerText.includes(word)) {
        console.log(`⚠️  Tweet contains "${word}" - might be a test commit`);
        return false;
      }
    }

    return true;
  }
}

async function main() {
  try {
    // Get tweet text from command line argument or environment variable
    const tweetText = process.argv[2] || process.env.TWEET_TEXT;
    
    if (!tweetText) {
      console.error('❌ No tweet text provided. Usage: node post-to-twitter.js "Your tweet text"');
      process.exit(1);
    }

    console.log('🐦 Preparing to post tweet...');
    console.log('📝 Tweet text:', tweetText);
    console.log('📊 Character count:', tweetText.length);

    const poster = new TwitterPoster();
    
    // Validate tweet before posting
    if (!poster.validateTweet(tweetText)) {
      console.log('⏭️  Skipping tweet due to validation failure');
      process.exit(0);
    }

    // Post the tweet
    const response = await poster.postTweet(tweetText);
    
    console.log('🎉 Social media update complete!');
    
    // Output for GitHub Actions
    console.log(`::notice::Tweet posted successfully with ID ${response.data.id}`);
    
  } catch (error) {
    console.error('❌ Error posting to Twitter:', error.message);
    
    // Don't fail the entire workflow if Twitter posting fails
    console.log('::warning::Twitter posting failed, but continuing workflow');
    process.exit(0);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { TwitterPoster };