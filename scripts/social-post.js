#!/usr/bin/env node

/**
 * Attrition MMO - Social Media Posting Workflow
 * 
 * This script helps you create custom social media posts for:
 * - Feature announcements
 * - Development updates  
 * - Community engagement
 * - Marketing content
 * - Hype building
 * 
 * Usage: node scripts/social-post.js
 */

const { TwitterPoster } = require('../.github/scripts/post-to-twitter.js');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

class SocialMediaWorkflow {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Pre-defined post templates
    this.templates = {
      feature: {
        name: "🎮 New Feature Announcement",
        template: "🚀 Exciting news for Attrition commanders! We just added {feature}! {description} Try it out and let us know what you think! #AttritionMMO #SpaceGame #GameDev #NewFeature"
      },
      progress: {
        name: "⚙️ Development Progress",
        template: "📈 Development update: We're making great progress on {area}! {details} The universe is getting bigger and better! #GameDev #AttritionMMO #Progress #IndieGame"
      },
      community: {
        name: "🤝 Community Engagement", 
        template: "👋 Commanders! {message} What would you like to see next in Attrition? Drop your ideas below! #Community #AttritionMMO #SpaceMMO #Feedback"
      },
      hype: {
        name: "🔥 Hype & Marketing",
        template: "🌌 Ready to conquer the galaxy? Attrition offers {highlight}! {call_to_action} #SpaceMMO #AttritionMMO #GalaxyConquest #Gaming"
      },
      milestone: {
        name: "🏆 Milestone Achievement",
        template: "🎉 Milestone achieved! {achievement} Thank you to our amazing community for supporting Attrition! {next_goal} #Milestone #AttritionMMO #Community #Achievement"
      },
      behind_scenes: {
        name: "🛠️ Behind the Scenes",
        template: "👨‍💻 Behind the scenes: {insight} Building an MMO is challenging but incredibly rewarding! {fun_fact} #BehindTheScenes #GameDev #AttritionMMO #IndieLife"
      },
      question: {
        name: "❓ Community Question",
        template: "🤔 Question for our commanders: {question} We love hearing from our community! Your input shapes Attrition's future! #Community #Question #AttritionMMO #Feedback"
      },
      custom: {
        name: "✍️ Custom Post",
        template: "{message}"
      }
    };
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async showTemplates() {
    console.log('\n🎯 Available Post Types:');
    console.log('=======================');
    
    Object.entries(this.templates).forEach(([key, template], index) => {
      console.log(`${index + 1}. ${template.name}`);
    });
    
    console.log('\nType the number to select a template, or type "custom" for a completely custom post.');
  }

  async selectTemplate() {
    this.showTemplates();
    
    const choice = await this.prompt('\n📝 Select a post type (1-8 or "custom"): ');
    
    const templateKeys = Object.keys(this.templates);
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < templateKeys.length) {
      return templateKeys[index];
    } else if (choice.toLowerCase() === 'custom') {
      return 'custom';
    } else {
      console.log('❌ Invalid choice. Please try again.');
      return this.selectTemplate();
    }
  }

  async fillTemplate(templateKey) {
    const template = this.templates[templateKey];
    console.log(`\n${template.name}`);
    console.log('='.repeat(template.name.length + 4));
    
    let content = template.template;
    const placeholders = content.match(/\{([^}]+)\}/g) || [];
    
    console.log('\n📝 Fill in the details:');
    
    for (const placeholder of placeholders) {
      const key = placeholder.slice(1, -1); // Remove { and }
      const value = await this.prompt(`   ${key}: `);
      content = content.replace(placeholder, value);
    }
    
    return content;
  }

  async customPost() {
    console.log('\n✍️ Custom Post');
    console.log('================');
    console.log('Write your custom message. You can use multiple lines.');
    console.log('When finished, type "END" on a new line.\n');
    
    let message = '';
    let line;
    
    do {
      line = await this.prompt('> ');
      if (line !== 'END') {
        message += (message ? '\n' : '') + line;
      }
    } while (line !== 'END');
    
    return message;
  }

  async addHashtags(content) {
    console.log('\n🏷️ Current hashtags in your post:');
    const existingHashtags = content.match(/#\w+/g) || [];
    console.log(existingHashtags.length > 0 ? existingHashtags.join(', ') : 'None');
    
    const additionalHashtags = await this.prompt('\n🏷️ Add more hashtags (separate with spaces, or press Enter to skip): ');
    
    if (additionalHashtags.trim()) {
      const hashtags = additionalHashtags.split(' ').map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      content += ' ' + hashtags;
    }
    
    return content;
  }

  async previewPost(content) {
    console.log('\n📱 Post Preview:');
    console.log('================');
    console.log(content);
    console.log(`\n📊 Character count: ${content.length}/280`);
    
    if (content.length > 280) {
      console.log('⚠️ Tweet is too long! Twitter limit is 280 characters.');
      const shouldTruncate = await this.prompt('✂️ Truncate to 280 characters? (y/n): ');
      if (shouldTruncate.toLowerCase() === 'y') {
        content = content.substring(0, 277) + '...';
        console.log('\n✂️ Truncated post:');
        console.log(content);
      }
    }
    
    return content;
  }

  async confirmPost(content) {
    const confirm = await this.prompt('\n🚀 Post this to Twitter/X? (y/n): ');
    return confirm.toLowerCase() === 'y';
  }

  async savePost(content) {
    const shouldSave = await this.prompt('\n💾 Save this post for future reference? (y/n): ');
    
    if (shouldSave.toLowerCase() === 'y') {
      const postsDir = path.join(__dirname, '..', 'social-posts');
      
      try {
        await fs.mkdir(postsDir, { recursive: true });
        
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `post-${timestamp}-${Date.now()}.md`;
        const filepath = path.join(postsDir, filename);
        
        const markdown = `# Social Media Post
        
**Date:** ${new Date().toLocaleString()}
**Platform:** Twitter/X
**Character Count:** ${content.length}

## Content

${content}

## Notes

Add any notes about this post here...
`;
        
        await fs.writeFile(filepath, markdown);
        console.log(`💾 Post saved to: ${filepath}`);
        
      } catch (error) {
        console.log('⚠️ Could not save post:', error.message);
      }
    }
  }

  async checkCredentials() {
    const required = ['TWITTER_API_KEY', 'TWITTER_API_KEY_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'];
    const missing = required.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      console.log('❌ Missing Twitter credentials:');
      missing.forEach(env => console.log(`   - ${env}`));
      console.log('\n📝 Set them using:');
      console.log('   $env:TWITTER_API_KEY = "your_key"');
      console.log('   $env:TWITTER_API_KEY_SECRET = "your_secret"');
      console.log('   $env:TWITTER_ACCESS_TOKEN = "your_token"');
      console.log('   $env:TWITTER_ACCESS_TOKEN_SECRET = "your_token_secret"');
      return false;
    }
    
    return true;
  }

  async postToTwitter(content) {
    try {
      const poster = new TwitterPoster();
      console.log('\n🐦 Posting to Twitter...');
      
      const response = await poster.postTweet(content);
      
      console.log('✅ Successfully posted to Twitter!');
      console.log(`🔗 Tweet ID: ${response.data.id}`);
      console.log(`🌐 View at: https://twitter.com/i/web/status/${response.data.id}`);
      
      return true;
      
    } catch (error) {
      console.log('❌ Failed to post to Twitter:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Check your Twitter API credentials');
      console.log('2. Ensure your Twitter app has write permissions');
      console.log('3. Verify your tokens are not expired');
      return false;
    }
  }

  async run() {
    console.log('🚀 Attrition MMO - Social Media Posting Workflow');
    console.log('='.repeat(50));
    console.log('Create engaging posts for your space MMO community!');
    
    // Check credentials first
    if (!(await this.checkCredentials())) {
      this.rl.close();
      return;
    }
    
    try {
      // Select template
      const templateKey = await this.selectTemplate();
      
      // Create content
      let content;
      if (templateKey === 'custom') {
        content = await this.customPost();
      } else {
        content = await this.fillTemplate(templateKey);
      }
      
      // Add hashtags
      content = await this.addHashtags(content);
      
      // Preview and confirm
      content = await this.previewPost(content);
      
      if (await this.confirmPost(content)) {
        const success = await this.postToTwitter(content);
        
        if (success) {
          await this.savePost(content);
          console.log('\n🎉 Post workflow complete! Your content is live!');
        }
      } else {
        console.log('📝 Post cancelled. Content was not published.');
        await this.savePost(content);
      }
      
    } catch (error) {
      console.log('❌ Workflow error:', error.message);
    } finally {
      this.rl.close();
    }
  }
}

// Run the workflow if this file is executed directly
if (require.main === module) {
  const workflow = new SocialMediaWorkflow();
  workflow.run();
}

module.exports = { SocialMediaWorkflow };