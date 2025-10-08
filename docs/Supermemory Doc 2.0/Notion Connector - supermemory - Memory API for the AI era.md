# Notion Connector - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/connectors/notion
**Scraped:** 2025-10-08 18:01:13

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connectors

Notion Connector

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
  * 1\. Create Notion Connection
  * 2\. Handle OAuth Flow
  * 3\. Monitor Sync Progress
  * Supported Content Types
  * Notion Pages
  * Notion Databases
  * Block Types
  * Delete Connection
  * Advanced Configuration
  * Custom Notion Integration
  * Content Filtering
  * Workspace Permissions
  * Database Integration
  * Database Properties
  * Optimization Strategies



Connect Notion workspaces to automatically sync pages, databases, and content blocks into your Supermemory knowledge base. Supports real-time updates, rich formatting, and database properties.

## 

​

Quick Setup

### 

​

1\. Create Notion Connection

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const connection = await client.connections.create('notion', {
      redirectUrl: 'https://yourapp.com/auth/notion/callback',
      containerTags: ['user-123', 'notion-workspace'],
      documentLimit: 2000,
      metadata: {
        source: 'notion',
        workspaceType: 'team',
        department: 'product'
      }
    });
    
    // Redirect user to Notion OAuth
    window.location.href = connection.authLink;
    

### 

​

2\. Handle OAuth Flow

After user grants workspace access, Notion redirects to your callback URL. The connection is automatically established.

### 

​

3\. Monitor Sync Progress

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Check connection details
    const connection = await client.connections.getByTags('notion', {
      containerTags: ['user-123', 'notion-workspace']
    });
    
    console.log('Connected workspace:', connection.email);
    console.log('Connection created:', connection.createdAt);
    
    // List synced pages and databases
    const documents = await client.connections.listDocuments('notion', {
      containerTags: ['user-123', 'notion-workspace']
    });
    

## 

​

Supported Content Types

### 

​

Notion Pages

  * **Rich text blocks** with formatting preserved
  * **Nested pages** and hierarchical structure
  * **Embedded content** (images, videos, files)
  * **Code blocks** with syntax highlighting
  * **Callouts and quotes** converted to markdown



### 

​

Notion Databases

  * **Database entries** synced as individual documents
  * **Properties** included in metadata
  * **Relations** between database entries
  * **Formulas and rollups** calculated values
  * **Multi-select and select** properties



### 

​

Block Types

Block Type| Processing| Markdown Output| | | | | |   
---|---|---|---|---|---|---|---|---  
**Text**|  Formatting preserved| `**bold**`, `*italic*`, `~~strikethrough~~`| | | | | |   
**Heading**|  Hierarchy maintained| `# H1`, `## H2`, `### H3`| | | | | |   
**Code**|  Language detected| `python\ncode here\n`| | | | | |   
**Quote**|  Blockquote format| `> quoted text`| | | | | |   
**Callout**|  Custom formatting| `> 💡 **Note:** callout text`| | | | | |   
**List**|  Structure preserved| `- item 1\n - nested item`| | | | | |   
**Table**|  Markdown tables| `| Col 1| Col 2| \n| \-------| \-------| `  
**Image**|  Referenced with metadata| `![alt text](url)`| | | | | |   
**Embed**|  Link with context| `[Embedded Content](url)`| | | | | |   
  
## 

​

Delete Connection

Remove a Notion connection when no longer needed:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Delete by connection ID
    const result = await client.connections.delete('connection_id_123');
    console.log('Deleted connection:', result.id);
    
    // Delete by provider and container tags
    const providerResult = await client.connections.deleteByProvider('notion', {
      containerTags: ['user-123']
    });
    console.log('Deleted Notion connection for user');
    

Deleting a connection will:

  * Stop all future syncs from Notion
  * Remove the OAuth authorization
  * Keep existing synced documents in Supermemory (they won’t be deleted)



## 

​

Advanced Configuration

### 

​

Custom Notion Integration

For production deployments, create your own Notion integration:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // First, update organization settings with your Notion app credentials
    await client.settings.update({
      notionCustomKeyEnabled: true,
      notionClientId: 'your-notion-client-id',
      notionClientSecret: 'your-notion-client-secret'
    });
    
    // Then create connections using your custom integration
    const connection = await client.connections.create('notion', {
      redirectUrl: 'https://yourapp.com/callback',
      containerTags: ['org-456', 'user-789'],
      metadata: { customIntegration: true }
    });
    

### 

​

Content Filtering

Control which Notion content gets synced:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Configure intelligent filtering for Notion content
    await client.settings.update({
      shouldLLMFilter: true,
      includeItems: {
        pageTypes: ['page', 'database'],
        titlePatterns: ['*Spec*', '*Documentation*', '*Meeting Notes*'],
        databases: ['Project Tracker', 'Knowledge Base', 'Team Wiki']
      },
      excludeItems: {
        titlePatterns: ['*Draft*', '*Personal*', '*Archive*'],
        databases: ['Personal Tasks', 'Scratchpad']
      },
      filterPrompt: "Sync professional documentation, project specs, meeting notes, and team knowledge. Skip personal notes, drafts, and archived content."
    });
    

## 

​

Workspace Permissions

Notion connector respects workspace permissions: Permission Level| Sync Behavior  
---|---  
**Admin**|  Full workspace access  
**Member**|  Pages with read access  
**Guest**|  Only shared pages  
**No Access**|  Removed from index  
  
## 

​

Database Integration

### 

​

Database Properties

Notion database properties are mapped to metadata:

Copy

Ask AI
    
    
    // Example: Project database with properties
    const documents = await client.connections.listDocuments('notion', {
      containerTags: ['user-123']
    });
    
    // Find database entries
    const projectEntries = documents.filter(doc =>
      doc.metadata?.database === 'Projects'
    );
    
    // Database properties become searchable metadata
    const projectWithStatus = await client.search.documents({
      q: "machine learning project",
      containerTags: ['user-123'],
      filters: JSON.stringify({
        AND: [
          { key: "status", value: "In Progress", negate: false },
          { key: "priority", value: "High", negate: false }
        ]
      })
    });
    

### 

​

Optimization Strategies

  1. **Set appropriate document limits** based on workspace size
  2. **Use targeted container tags** for efficient organization
  3. **Monitor database sync performance** for large datasets
  4. **Implement content filtering** to sync only relevant pages
  5. **Handle webhook delays** gracefully in your application



**Notion-Specific Benefits:**

  * Real-time sync via webhooks for instant updates
  * Rich formatting and block structure preserved
  * Database properties become searchable metadata
  * Hierarchical page structure maintained
  * Collaborative workspace support



**Important Limitations:**

  * Complex block formatting may be simplified in markdown conversion
  * Large databases can take significant time to sync initially
  * Workspace permissions affect which content is accessible
  * Notion API rate limits may affect sync speed for large workspaces
  * Embedded files and images are referenced, not stored directly



Was this page helpful?

YesNo

[Overview](/docs/connectors/overview)[Google Drive Connector](/docs/connectors/google-drive)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
