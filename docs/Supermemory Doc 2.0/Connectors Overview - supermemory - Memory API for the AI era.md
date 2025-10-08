# Connectors Overview - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/connectors
**Scraped:** 2025-10-08 18:01:39

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connectors

Connectors Overview

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

  * Supported Connectors
  * Quick Start
  * 1\. Create Connection
  * 2\. Handle OAuth Callback
  * 3\. Monitor Sync Status
  * How Connectors Work
  * Authentication Flow
  * Document Processing Pipeline
  * Sync Mechanisms
  * Connection Management
  * List All Connections
  * Delete Connections



Connect external platforms to automatically sync documents into Supermemory. Supported connectors include Google Drive, Notion, and OneDrive with real-time synchronization and intelligent content processing.

## 

​

Supported Connectors

## [Google Drive**Google Docs, Slides, Sheets** Real-time sync via webhooks. Supports shared drives, nested folders, and collaborative documents.](/docs/connectors/google-drive)## [Notion**Pages, Databases, Blocks** Instant sync of workspace content. Handles rich formatting, embeds, and database properties.](/docs/connectors/notion)## [OneDrive**Word, Excel, PowerPoint** Scheduled sync every 4 hours. Supports personal and business accounts with file versioning.](/docs/connectors/onedrive)

## 

​

Quick Start

### 

​

1\. Create Connection

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const connection = await client.connections.create('notion', {
      redirectUrl: 'https://yourapp.com/callback',
      containerTags: ['user-123', 'workspace-alpha'],
      documentLimit: 5000,
      metadata: { department: 'sales' }
    });
    
    // Redirect user to complete OAuth
    console.log('Auth URL:', connection.authLink);
    console.log('Expires in:', connection.expiresIn);
    // Output: Auth URL: https://api.notion.com/v1/oauth/authorize?...
    // Output: Expires in: 1 hour
    

### 

​

2\. Handle OAuth Callback

After user completes OAuth, the connection is automatically established and sync begins.

### 

​

3\. Monitor Sync Status

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    // List all connections using SDK
    const connections = await client.connections.list({
      containerTags: ['user-123', 'workspace-alpha']
    });
    
    connections.forEach(conn => {
      console.log('Connection:', conn.id);
      console.log('Provider:', conn.provider);
      console.log('Email:', conn.email);
      console.log('Created:', conn.createdAt);
    });
    
    // List synced documents (memories) using SDK
    const memories = await client.memories.list({
      containerTags: ['user-123', 'workspace-alpha']
    });
    
    console.log(`Synced ${memories.memories.length} documents`);
    // Output: Synced 45 documents
    

## 

​

How Connectors Work

### 

​

Authentication Flow

  1. **Create Connection** : Call `/v3/connections/{provider}` to get OAuth URL
  2. **User Authorization** : Redirect user to complete OAuth flow
  3. **Automatic Setup** : Connection established, sync begins immediately
  4. **Continuous Sync** : Real-time updates via webhooks + scheduled sync every 4 hours



### 

​

Document Processing Pipeline

### 

​

Sync Mechanisms

Provider| Real-time Sync| Scheduled Sync| Manual Sync  
---|---|---|---  
**Google Drive**|  ✅ Webhooks (7-day expiry)| ✅ Every 4 hours| ✅ On-demand  
**Notion**|  ✅ Webhooks| ✅ Every 4 hours| ✅ On-demand  
**OneDrive**|  ✅ Webhooks (30-day expiry)| ✅ Every 4 hours| ✅ On-demand  
  
## 

​

Connection Management

### 

​

List All Connections

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const connections = await client.connections.list({
      containerTags: ['org-123']
    });
    

### 

​

Delete Connections

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    // Delete by connection ID using SDK
    const result = await client.connections.delete(connectionId);
    
    console.log('Deleted:', result.id, result.provider);
    // Output: Deleted: conn_abc123 notion
    

Was this page helpful?

YesNo

[Update & Delete Memories](/docs/update-delete-memories/overview)[Notion Connector](/docs/connectors/notion)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
