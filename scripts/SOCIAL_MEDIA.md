# Attrition MMO - Social Media Posting Workflows

This directory contains tools for managing social media content for your MMO project.

## 🎯 Two Types of Social Media Posting

### 1. **Automated Posts** (via GitHub Actions)
- **Triggers**: Code pushes, releases
- **Content**: Development updates, progress tracking
- **Management**: Automatic, no manual intervention needed
- **Example**: *"🔧 Core update pushed to Attrition! 📝 Fix authentication system 🔧 3 files updated 👨‍💻 by BrianSMitchell"*

### 2. **Custom Posts** (via Local Workflow)
- **Triggers**: Manual, when you want to post
- **Content**: Feature announcements, community engagement, marketing
- **Management**: Interactive workflow with templates
- **Example**: *"🚀 Exciting news for Attrition commanders! We just added fleet formations! Now you can coordinate massive battles with strategic positioning!"*

## 🚀 Quick Start - Custom Posting

### Option 1: PowerShell Script (Easiest)
```powershell
./scripts/post.ps1
```

### Option 2: Node.js Direct
```bash
# Set credentials first (in PowerShell)
$env:TWITTER_API_KEY = "your_key"
$env:TWITTER_API_KEY_SECRET = "your_secret" 
$env:TWITTER_ACCESS_TOKEN = "your_token"
$env:TWITTER_ACCESS_TOKEN_SECRET = "your_token_secret"

# Run the workflow
node scripts/social-post.js
```

## 📝 Available Post Templates

### 1. 🎮 **New Feature Announcement**
Perfect for when you release new gameplay features.
- **Fields**: feature name, description
- **Example**: *"🚀 Exciting news for Attrition commanders! We just added {feature}! {description}"*

### 2. ⚙️ **Development Progress** 
Share what you're working on to build excitement.
- **Fields**: area of development, details
- **Example**: *"📈 Development update: We're making great progress on {area}! {details}"*

### 3. 🤝 **Community Engagement**
Ask questions and get feedback from players.
- **Fields**: message/question
- **Example**: *"👋 Commanders! {message} What would you like to see next in Attrition?"*

### 4. 🔥 **Hype & Marketing**
Build excitement and attract new players.
- **Fields**: highlight, call to action
- **Example**: *"🌌 Ready to conquer the galaxy? Attrition offers {highlight}! {call_to_action}"*

### 5. 🏆 **Milestone Achievement**
Celebrate significant achievements.
- **Fields**: achievement, next goal
- **Example**: *"🎉 Milestone achieved! {achievement} Thank you to our amazing community!"*

### 6. 🛠️ **Behind the Scenes**
Share development insights and build connection.
- **Fields**: insight, fun fact
- **Example**: *"👨‍💻 Behind the scenes: {insight} Building an MMO is challenging but rewarding!"*

### 7. ❓ **Community Question**
Engage with polls and questions.
- **Fields**: question
- **Example**: *"🤔 Question for our commanders: {question} Your input shapes Attrition's future!"*

### 8. ✍️ **Custom Post**
Complete creative freedom for any message.
- **Fields**: message (multi-line supported)

## 🔧 Workflow Features

### **Interactive Process**
1. **Template Selection**: Choose from 8 pre-made templates
2. **Content Creation**: Fill in template fields or write custom content
3. **Hashtag Management**: Add relevant hashtags automatically
4. **Preview & Edit**: See exactly how your post will look
5. **Character Count**: Automatic Twitter limit checking
6. **Confirmation**: Review before posting
7. **Auto-Save**: Keep a record of all your posts

### **Smart Features**
- **Character Limit Handling**: Auto-truncation if needed
- **Hashtag Suggestions**: Consistent branding hashtags
- **Post History**: All posts saved to `social-posts/` directory
- **Error Recovery**: Graceful handling of API issues
- **Security**: Credentials only stored in memory during session

## 📁 File Structure

```
scripts/
├── social-post.js      # Main workflow script
├── post.ps1           # PowerShell wrapper for easy use
└── SOCIAL_MEDIA.md    # This documentation

social-posts/          # Created automatically
├── post-2024-10-12-1697123456.md
└── post-2024-10-12-1697123789.md
```

## 🎯 Example Usage Scenarios

### **Feature Launch**
```
./scripts/post.ps1
> Select: 1 (New Feature Announcement)
> feature: "Real-time space battles"
> description: "Engage in epic fleet combat with live tactical combat systems! No more turn-based waiting!"
> Result: Engaging announcement with proper hashtags
```

### **Community Building**
```
./scripts/post.ps1
> Select: 3 (Community Engagement) 
> message: "We're planning the next major update and want YOUR input!"
> Add hashtags: "poll feedback"
> Result: Community-focused post that drives engagement
```

### **Hype Building**
```
./scripts/post.ps1
> Select: 4 (Hype & Marketing)
> highlight: "massive multiplayer battles with up to 1000 players"
> call_to_action: "Join the closed beta and command your fleet today!"
> Result: Marketing post that attracts new players
```

## 💡 Best Practices

### **Content Strategy**
- **Mix content types**: Don't just post features, engage with community
- **Timing**: Post when your audience is most active
- **Consistency**: Regular posting keeps your community engaged
- **Authenticity**: Share real development progress and challenges

### **Hashtag Strategy**
Always include:
- `#AttritionMMO` (your brand)
- `#GameDev` (development community)
- `#MMO` or `#SpaceMMO` (genre)
- `#IndieGame` (indie game community)

### **Engagement Tips**
- Ask questions to drive comments
- Share behind-the-scenes content
- Celebrate milestones with your community
- Respond to comments and feedback

## 🔒 Security

- **Credentials**: Never stored on disk, only in memory during session
- **PowerShell Script**: Uses secure input methods
- **API Keys**: Same security as GitHub Actions setup
- **Post History**: Only content is saved, never credentials

## 🛠️ Troubleshooting

### **Common Issues**

1. **Missing Credentials**
   - Ensure all 4 Twitter API credentials are set
   - Use the PowerShell script for easier credential management

2. **Twitter API Errors**
   - Check if your Twitter app has write permissions
   - Verify tokens are not expired
   - Ensure you're not hitting rate limits

3. **Character Limit Issues**
   - Use the built-in truncation feature
   - Edit content to fit within 280 characters
   - Consider breaking long messages into threads (future feature)

### **Getting Help**
- Check the generated post files in `social-posts/` directory
- Review Twitter API documentation for credential setup
- Test with a short custom post first to verify everything works

## 🚀 Future Enhancements

Ideas for expanding the workflow:
- **Thread Support**: For longer-form content
- **Image Attachments**: Screenshots and development photos  
- **Scheduling**: Queue posts for optimal timing
- **Analytics**: Track engagement metrics
- **Multi-Platform**: Support for Discord, Reddit, etc.

---

**Happy posting! 🚀 May your MMO community grow and thrive!**