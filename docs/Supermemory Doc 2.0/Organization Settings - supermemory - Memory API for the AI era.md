# Organization Settings - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/org-settings
**Scraped:** 2025-10-08 18:00:10

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

Organization Settings

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [Your Dashboard](https://console.supermemory.ai)
  * [Developer Platform](/docs/intro)



##### Getting Started

  * [Overview](/docs/intro)
  * [Memory API vs Router](/docs/routervsapi)
  * [Quickstart](/docs/quickstart)
  * [Memory vs RAG](/docs/memory-vs-rag)



##### Memory API

  * [How Supermemory Works](/docs/how-it-works)
  * Add Memories

  * Search Memories

  * [Grouping and filtering](/docs/search/filtering)
  * [Track Processing Status](/docs/memory-api/track-progress)
  * List Memories

  * [Update & Delete Memories](/docs/update-delete-memories/overview)
  * Connectors

  * [Organization Settings](/docs/org-settings)
  * [Analytics & Monitoring](/docs/analytics)
  * [Use Cases](/docs/overview/use-cases)



##### Memory Router

  * [Overview](/docs/memory-router/overview)
  * [Usage](/docs/memory-router/usage)
  * [Use with Memory API](/docs/memory-router/with-memory-api)



##### Migration Guides

  * [From Mem0](/docs/migration/from-mem0)



##### Deployment

  * [Self Hosting](/docs/deployment/self-hosting)



On this page

  * Why Settings Matter
  * Example: Brand Guidelines Use Case
  * API Endpoints
  * Get Current Settings
  * Update Settings
  * Content Filtering Settings
  * Basic Filtering
  * Intelligent LLM Filtering
  * Connector OAuth Settings
  * Google Drive Custom OAuth
  * Notion Custom OAuth
  * OneDrive Custom OAuth
  * Best Practices
  * 1\. Set Before Bulk Import
  * 2\. Be Specific in Filter Prompts
  * 3\. Test OAuth Credentials
  * 4\. Monitor Filter Effectiveness
  * Important Notes
  * Related Documentation



Organization settings control how Supermemory processes content across your entire organization. These settings apply to all memories and connectors, helping you:

  * Filter content before indexing
  * Configure custom OAuth applications for connectors
  * Set organization-wide processing rules
  * Control what gets indexed and what gets excluded



Settings are organization-wide and apply to all users and memories within your organization.

## 

​

Why Settings Matter

The settings endpoint is crucial for teaching Supermemory about your specific use case. It helps Supermemory understand:

  * **What you are** : Your organization’s specific use case and purpose
  * **What to expect** : The types of content and information flowing through your system
  * **How to interpret** : Context for understanding queries in your specific use case
  * **What to prioritize** : Which content matters most for your users



### 

​

Example: Brand Guidelines Use Case

Without proper settings, when a user searches “what are our values?”, Supermemory might return random documents mentioning “values”. But with proper configuration:

Copy

Ask AI
    
    
    await client.settings.update({
      shouldLLMFilter: true,
      filterPrompt: `You are managing brand guidelines for Brand.ai.
        You will receive all outbound content from our organization.
        
        When users search, they're looking for:
        - "What are our values?" → Return official brand values document
        - "What's our tone of voice?" → Return brand voice guidelines
        - "How do we describe our mission?" → Return approved mission statements
        
        Focus on the latest approved brand materials, not drafts or outdated versions.`
    });
    

Now Supermemory understands that:

  * Searches about “values” refer to brand values, not financial values
  * “Tone” means brand voice, not audio settings
  * Priority should be given to official, approved content

This context dramatically improves search relevance and ensures users get the right information for their specific use case.

## 

​

API Endpoints

### 

​

Get Current Settings

Retrieve your organization’s current settings configuration.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const settings = await client.settings.get();
    console.log('Current settings:', settings);
    

### 

​

Update Settings

Update your organization’s settings. You only need to include the fields you want to change.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const updatedSettings = await client.settings.update({
      shouldLLMFilter: true,
      filterPrompt: "Only index technical documentation and code",
      includeItems: ["*.md", "*.ts", "*.py"],
      excludeItems: ["node_modules", ".git", "*.test.*"]
    });
    
    console.log('Updated fields:', updatedSettings.updated);
    

## 

​

Content Filtering Settings

Control what content gets indexed into Supermemory.

### 

​

Basic Filtering

Use include/exclude patterns to filter content:

Copy

Ask AI
    
    
    await client.settings.update({
      includeItems: [
        "*.md",           // All markdown files
        "*.mdx",          // MDX documentation
        "docs/**",        // Everything in docs folder
        "src/**/*.ts"     // TypeScript files in src
      ],
      excludeItems: [
        "node_modules",   // Dependencies
        ".git",           // Version control
        "*.test.*",       // Test files
        "build/**",       // Build outputs
        "*.tmp"           // Temporary files
      ]
    });
    

### 

​

Intelligent LLM Filtering

Enable AI-powered content filtering for semantic understanding:

Copy

Ask AI
    
    
    await client.settings.update({
      shouldLLMFilter: true,
      filterPrompt: `You are filtering content for a technical documentation system.
        
        Include:
        - API documentation
        - Code examples and tutorials
        - Technical guides and references
        - Architecture documentation
        
        Exclude:
        - Marketing materials
        - Internal meeting notes
        - Personal information
        - Outdated or deprecated content
        
        Focus on content that helps developers understand and use our APIs.`
    });
    

## 

​

Connector OAuth Settings

Configure custom OAuth applications for connector integrations.

### 

​

Google Drive Custom OAuth

Copy

Ask AI
    
    
    await client.settings.update({
      googleDriveCustomKeyEnabled: true,
      googleDriveClientId: "your-client-id.apps.googleusercontent.com",
      googleDriveClientSecret: "your-client-secret"
    });
    

### 

​

Notion Custom OAuth

Copy

Ask AI
    
    
    await client.settings.update({
      notionCustomKeyEnabled: true,
      notionClientId: "your-notion-oauth-client-id",
      notionClientSecret: "your-notion-oauth-client-secret"
    });
    

### 

​

OneDrive Custom OAuth

Copy

Ask AI
    
    
    await client.settings.update({
      onedriveCustomKeyEnabled: true,
      onedriveClientId: "your-azure-app-id",
      onedriveClientSecret: "your-azure-app-secret"
    });
    

## 

​

Best Practices

### 

​

1\. Set Before Bulk Import

Configure settings before importing large amounts of content. Changes don’t retroactively affect existing memories.

### 

​

2\. Be Specific in Filter Prompts

Provide clear context about your organization and expected search patterns:

Copy

Ask AI
    
    
    // Good - Specific and contextual
    filterPrompt: `Technical documentation for developers.
      Include: API references, code examples, error solutions.
      Exclude: marketing content, personal data, test files.
      Users search for: implementation details, troubleshooting, best practices.`
    
    // Bad - Too vague
    filterPrompt: "Only important content"
    

### 

​

3\. Test OAuth Credentials

Always test custom OAuth credentials in development before production:

Copy

Ask AI
    
    
    // Test connection after updating OAuth settings
    const testConnection = await client.connections.create('google-drive', {
      redirectUrl: 'https://yourapp.com/callback',
      containerTags: ['test-connection']
    });
    

### 

​

4\. Monitor Filter Effectiveness

Check what’s being indexed to ensure filters work as expected:

Copy

Ask AI
    
    
    const memories = await client.memories.list({
      containerTags: ['your-tags'],
      limit: 10
    });
    
    // Review what's actually being indexed
    memories.memories.forEach(memory => {
      console.log(`Indexed: ${memory.title} - ${memory.type}`);
    });
    

## 

​

Important Notes

**Settings Limitations:**

  * Changes are organization-wide, not per-user
  * Settings don’t retroactively process existing memories
  * OAuth credentials must be properly configured in respective platforms
  * Filter patterns are applied during content ingestion



## 

​

Related Documentation

  * [Connectors Overview](/docs/connectors/overview) \- Setting up external integrations
  * [Google Drive Setup](/docs/connectors/google-drive) \- Configure Google Drive OAuth
  * [Notion Setup](/docs/connectors/notion) \- Configure Notion OAuth
  * [OneDrive Setup](/docs/connectors/onedrive) \- Configure OneDrive OAuth



Was this page helpful?

YesNo

[Connector Troubleshooting](/docs/connectors/troubleshooting)[Analytics & Monitoring](/docs/analytics)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
