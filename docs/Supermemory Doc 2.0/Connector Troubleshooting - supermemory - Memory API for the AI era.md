# Connector Troubleshooting - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/connectors/troubleshooting
**Scraped:** 2025-10-08 18:01:16

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connectors

Connector Troubleshooting

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

  * Quick Health Check
  * Common Issues
  * OAuth Callback Fails
  * Documents Not Syncing
  * Permission Denied Errors
  * Sync Takes Too Long
  * Provider-Specific Issues
  * Google Drive
  * Notion
  * OneDrive
  * Best Practices



Quick guide to resolve common connector issues with authentication, syncing, and permissions.

## 

​

Quick Health Check

Check if your connectors are working properly:

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const connections = await client.connections.list({
      containerTags: ['user-123']
    });
    
    connections.forEach(conn => {
      console.log(`${conn.provider}: ${conn.email} - Connected ${conn.createdAt}`);
    });
    
    // Check for stuck documents
    const documents = await client.connections.listDocuments('notion', {
      containerTags: ['user-123']
    });
    
    const failed = documents.filter(doc => doc.status === 'failed');
    if (failed.length > 0) {
      console.log(`⚠️ ${failed.length} documents failed to sync`);
    }
    

## 

​

Common Issues

### 

​

OAuth Callback Fails

**Problem:** “Invalid redirect URI” error after user grants permissions **Solution:** Ensure your redirect URL matches EXACTLY what’s configured in your OAuth app:

Copy

Ask AI
    
    
    // correct - exact match with OAuth app settings
    const connection = await client.connections.create('notion', {
      redirectUrl: 'https://yourapp.com/auth/notion/callback',
      containerTags: ['user-123']
    });
    
    // Wrong - URL doesn't match
    // redirectUrl: 'https://yourapp.com/callback'
    

**Prevention:**

  * Use HTTPS for production URLs
  * Copy the exact URL from your OAuth app settings
  * Test the flow in development first



### 

​

Documents Not Syncing

**Problem:** Documents stuck in “queued” or “extracting” status for over 30 minutes **Solution:** Trigger a manual sync:

Copy

Ask AI
    
    
    // Force sync for stuck documents
    await client.connections.import('notion', {
      containerTags: ['user-123']
    });
    

If documents consistently fail:

  * Check if files are over 50MB (may timeout)
  * Verify you have permission to access the documents
  * Ensure the document type is supported



### 

​

Permission Denied Errors

**Problem:** Some documents show “permission denied” or aren’t syncing **Solution:** Re-authenticate with proper permissions:

Copy

Ask AI
    
    
    // Delete and recreate connection
    await client.connections.deleteByProvider('google-drive', {
      containerTags: ['user-123']
    });
    
    const newConnection = await client.connections.create('google-drive', {
      redirectUrl: 'https://yourapp.com/callback',
      containerTags: ['user-123']
    });
    
    // User must re-authenticate
    window.location.href = newConnection.authLink;
    

### 

​

Sync Takes Too Long

**Problem:** Hundreds of documents taking hours to sync **Solution:** Set reasonable document limits:

Copy

Ask AI
    
    
    const connection = await client.connections.create('onedrive', {
      redirectUrl: 'https://yourapp.com/callback',
      containerTags: ['user-123'],
      documentLimit: 500  // Start with fewer documents
    });
    

## 

​

Provider-Specific Issues

### 

​

Google Drive

**Shared Drive Issues** Shared drives require special permissions. Make sure:

  * User has access to the shared drive
  * OAuth app has drive.readonly scope
  * User is a member of the shared drive



### 

​

Notion

**Database Not Syncing** Notion databases need explicit permission. If databases aren’t syncing:

  1. Go to Notion workspace settings
  2. Find your integration under “Connections”
  3. Click on the integration
  4. Select specific pages/databases to share
  5. Re-sync after granting access

**Workspace Access** For full workspace access, a workspace admin must:

  1. Approve the integration
  2. Grant access to all pages
  3. Enable “Read content” permission



### 

​

OneDrive

**Business vs Personal Accounts** Business accounts may have additional restrictions:

  * Admin consent might be required
  * Some SharePoint sites may be restricted
  * Compliance policies may block certain files



## 

​

Best Practices

  1. **Set reasonable document limits** \- Start with 500-1000 documents
  2. **Use descriptive container tags** \- Makes debugging easier
  3. **Monitor failed documents** \- Check weekly for sync issues
  4. **Handle rate limits gracefully** \- Implement exponential backoff
  5. **Test OAuth in development** \- Ensure redirect URLs work before production



Was this page helpful?

YesNo

[OneDrive Connector](/docs/connectors/onedrive)[Organization Settings](/docs/org-settings)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
