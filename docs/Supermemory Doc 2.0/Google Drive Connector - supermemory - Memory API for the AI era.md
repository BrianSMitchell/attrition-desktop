# Google Drive Connector - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/connectors/google-drive
**Scraped:** 2025-10-08 18:01:11

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connectors

Google Drive Connector

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

    * [Overview](/docs/connectors/overview)
    * [Notion Connector](/docs/connectors/notion)
    * [Google Drive Connector](/docs/connectors/google-drive)
    * [OneDrive Connector](/docs/connectors/onedrive)
    * [Connector Troubleshooting](/docs/connectors/troubleshooting)
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

  * Quick Setup
  * 1\. Create Google Drive Connection
  * 2\. Handle OAuth Callback
  * 3\. Check Connection Status
  * Supported Document Types
  * Connection Management
  * List All Connections
  * Delete Connection
  * Manual Sync
  * Advanced Configuration
  * Custom OAuth Application
  * Document Filtering



Connect Google Drive to sync documents into your Supermemory knowledge base with OAuth authentication and custom app support.

## 

​

Quick Setup

### 

​

1\. Create Google Drive Connection

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const connection = await client.connections.create('google-drive', {
      redirectUrl: 'https://yourapp.com/auth/google-drive/callback',
      containerTags: ['user-123', 'gdrive-sync'],
      documentLimit: 3000,
      metadata: {
        source: 'google-drive',
        department: 'engineering'
      }
    });
    
    // Redirect user to Google OAuth
    window.location.href = connection.authLink;
    console.log('Auth expires in:', connection.expiresIn);
    

### 

​

2\. Handle OAuth Callback

After user grants permissions, Google redirects to your callback URL. The connection is automatically established.

### 

​

3\. Check Connection Status

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Get connection details
    const connection = await client.connections.getByTags('google-drive', {
      containerTags: ['user-123', 'gdrive-sync']
    });
    

## 

​

Supported Document Types

Based on the API type definitions, Google Drive documents are identified with these types:

  * `google_doc` \- Google Docs
  * `google_slide` \- Google Slides
  * `google_sheet` \- Google Sheets



## 

​

Connection Management

### 

​

List All Connections

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // List all connections for specific container tags
    const connections = await client.connections.list({
      containerTags: ['user-123']
    });
    
    connections.forEach(conn => {
      console.log(`Provider: ${conn.provider}`);
      console.log(`ID: ${conn.id}`);
      console.log(`Email: ${conn.email}`);
      console.log(`Created: ${conn.createdAt}`);
      console.log(`Document limit: ${conn.documentLimit}`);
      console.log('---');
    });
    

### 

​

Delete Connection

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Delete by connection ID
    const result = await client.connections.deleteByID('connection_id_123');
    console.log('Deleted connection:', result.id);
    
    // Delete by provider and container tags
    const providerResult = await client.connections.deleteByProvider('google-drive', {
      containerTags: ['user-123']
    });
    console.log('Deleted provider connection:', providerResult.id);
    

Deleting a connection will:

  * Stop all future syncs from Google Drive
  * Remove the OAuth authorization
  * Keep existing synced documents in Supermemory (they won’t be deleted)



### 

​

Manual Sync

Trigger a manual synchronization:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Trigger sync for Google Drive connections
    await client.connections.import('google-drive');
    
    // Trigger sync for specific container tags
    await client.connections.import('google-drive', {
      containerTags: ['user-123']
    });
    
    console.log('Manual sync initiated');
    

## 

​

Advanced Configuration

### 

​

Custom OAuth Application

Configure your own Google OAuth app using the settings API:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Update organization settings with your Google OAuth app
    await client.settings.update({
      googleDriveCustomKeyEnabled: true,
      googleDriveClientId: 'your-google-client-id.googleusercontent.com',
      googleDriveClientSecret: 'your-google-client-secret'
    });
    
    // Get current settings
    const settings = await client.settings.get();
    console.log('Google Drive custom key enabled:', settings.googleDriveCustomKeyEnabled);
    console.log('Client ID configured:', !!settings.googleDriveClientId);
    

### 

​

Document Filtering

Configure filtering using the settings API:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    await client.settings.update({
      shouldLLMFilter: true,
      filterPrompt: "Only sync important business documents",
      includeItems: {
        // Your include patterns
      },
      excludeItems: {
        // Your exclude patterns
      }
    });
    

**Important Notes:**

  * OAuth tokens may expire - check `expiresAt` field
  * Document processing happens asynchronously
  * Use container tags consistently for filtering
  * Monitor document status for failed syncs



Was this page helpful?

YesNo

[Notion Connector](/docs/connectors/notion)[OneDrive Connector](/docs/connectors/onedrive)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
