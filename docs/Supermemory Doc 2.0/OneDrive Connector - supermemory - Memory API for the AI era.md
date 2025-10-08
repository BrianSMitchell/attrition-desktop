# OneDrive Connector - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/connectors/onedrive
**Scraped:** 2025-10-08 18:01:14

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connectors

OneDrive Connector

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
  * 1\. Create OneDrive Connection
  * 2\. Handle Microsoft OAuth
  * 3\. Monitor Sync Status
  * Supported Document Types
  * Microsoft Word Documents
  * Excel Spreadsheets
  * PowerPoint Presentations
  * Sync Mechanism
  * Manual Sync Trigger
  * Delete Connection
  * Advanced Configuration
  * Custom Microsoft App
  * Document Filtering
  * Optimization Tips



Connect OneDrive to automatically sync Word documents, Excel spreadsheets, and PowerPoint presentations into your Supermemory knowledge base. Supports both personal and business accounts with scheduled synchronization.

## 

​

Quick Setup

### 

​

1\. Create OneDrive Connection

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const connection = await client.connections.create('onedrive', {
      redirectUrl: 'https://yourapp.com/auth/onedrive/callback',
      containerTags: ['user-123', 'onedrive-sync'],
      documentLimit: 1500,
      metadata: {
        source: 'onedrive',
        accountType: 'business',
        department: 'marketing'
      }
    });
    
    // Redirect user to Microsoft OAuth
    window.location.href = connection.authLink;
    // Output: Redirects to OAuth provider
    // Output: Redirects to https://login.microsoftonline.com/oauth2/authorize?...
    

### 

​

2\. Handle Microsoft OAuth

After user grants permissions, Microsoft redirects to your callback URL. The connection is automatically established and initial sync begins.

### 

​

3\. Monitor Sync Status

Typescript

Python

cURL

Copy

Ask AI
    
    
      // Check connection details
      const connection = await client.connections.getByTags('onedrive', {
        containerTags: ['user-123', 'onedrive-sync']
      });
    
    
      // List synced Office documents
      const documents = await client.connections.listDocuments('onedrive', {
        containerTags: ['user-123', 'onedrive-sync']
      });
    

## 

​

Supported Document Types

### 

​

Microsoft Word Documents

  * **Rich text formatting** converted to markdown
  * **Headers and styles** preserved as markdown hierarchy
  * **Images and charts** extracted and referenced
  * **Tables** converted to markdown tables



### 

​

Excel Spreadsheets

  * **Worksheet data** converted to structured markdown
  * **Multiple sheets** processed separately
  * **Charts and graphs** extracted as images
  * **Formulas** converted to calculated values
  * **Cell formatting** simplified in markdown



### 

​

PowerPoint Presentations

  * **Slide content** converted to structured markdown
  * **Speaker notes** included when present
  * **Images and media** extracted and referenced
  * **Embedded objects** processed when possible



## 

​

Sync Mechanism

Webhooks lead to real-time syncing of changes in documents. You may also manually trigger a sync.

### 

​

Manual Sync Trigger

Typescript

Python

cURL

Copy

Ask AI
    
    
      // Trigger immediate sync for all OneDrive connections
      await client.connections.import('onedrive');
    
      // Trigger sync for specific user
      await client.connections.import('onedrive', {
        containerTags: ['user-123']
      });
    
      console.log('Manual sync initiated - documents will update within 5-10 minutes');
    

## 

​

Delete Connection

Remove a OneDrive connection when no longer needed:

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Delete by connection ID
    const result = await client.connections.delete('connection_id_123');
    console.log('Deleted connection:', result.id);
    
    // Delete by provider and container tags
    const providerResult = await client.connections.deleteByProvider('onedrive', {
      containerTags: ['user-123']
    });
    console.log('Deleted OneDrive connection for user');
    

Deleting a connection will:

  * Stop all future syncs from OneDrive
  * Remove the OAuth authorization
  * Keep existing synced documents in Supermemory (they won’t be deleted)



## 

​

Advanced Configuration

### 

​

Custom Microsoft App

For production deployments, configure your own Microsoft application:

Typescript

Python

cURL

Copy

Ask AI
    
    
      // First, update organization settings with your Microsoft app credentials
      await client.settings.update({
        onedriveCustomKeyEnabled: true,
        onedriveClientId: 'your-microsoft-app-id',
        onedriveClientSecret: 'your-microsoft-app-secret'
      });
    
      // Then create connections using your custom app
      const connection = await client.connections.create('onedrive', {
        redirectUrl: 'https://yourapp.com/callback',
        containerTags: ['org-456', 'user-789'],
        metadata: { customApp: true }
      });
    

### 

​

Document Filtering

Control which OneDrive documents get synced:

Typescript

Python

cURL

Copy

Ask AI
    
    
      // Configure filtering for Office documents
      await client.settings.update({
        shouldLLMFilter: true,
        includeItems: {
          fileTypes: ['docx', 'xlsx', 'pptx'],
          folderNames: ['Projects', 'Documentation', 'Reports'],
          titlePatterns: ['*Proposal*', '*Specification*', '*Analysis*']
        },
        excludeItems: {
          folderNames: ['Archive', 'Templates', 'Personal'],
          titlePatterns: ['*Draft*', '*Old*', '*Backup*', '*~$*']
        },
        filterPrompt: "Sync professional business documents, project files, reports, and presentations. Skip personal files, drafts, temporary files, and archived content."
      });
    

### 

​

Optimization Tips

  1. **Set realistic document limits** based on storage and usage
  2. **Use targeted filtering** to sync only business-critical documents
  3. **Monitor sync health** regularly due to scheduled nature
  4. **Trigger manual syncs** when immediate updates are needed
  5. **Consider account type** when setting expectations



**OneDrive-Specific Benefits:**

  * Supports both personal and business Microsoft accounts
  * Processes all major Office document formats
  * Preserves document structure and formatting
  * Handles large enterprise document collections



**Important Limitations:**

  * Large Office documents may take significant time to process
  * Complex Excel formulas may not convert perfectly to markdown
  * Microsoft API rate limits may slow sync for large accounts



Was this page helpful?

YesNo

[Google Drive Connector](/docs/connectors/google-drive)[Connector Troubleshooting](/docs/connectors/troubleshooting)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
