# Update & Delete Memories - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/update-delete-memories/overview
**Scraped:** 2025-10-08 18:00:08

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

Update & Delete Memories

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

  * Direct Updates
  * Upserts Using customId
  * Single Delete
  * Bulk Delete by IDs
  * Bulk Delete by Container Tags
  * Advanced Patterns
  * Soft Delete Implementation
  * Batch Processing for Large Operations
  * Best Practices
  * Update Operations
  * Delete Operations



Choose from direct updates, idempotent upserts, single deletions, and powerful bulk operations.

## 

​

Direct Updates

Update existing memories by their ID when you know the specific memory you want to modify. Changes trigger reprocessing through the full pipeline.

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    // Update by memory ID
    const updated = await client.memories.update('memory_id_123', {
      content: 'Updated content here',
      metadata: { version: 2, updated: true }
    });
    
    console.log(updated.status); // "queued" for reprocessing
    console.log(updated.id); // "memory_id_123"
    

## 

​

Upserts Using customId

Use `customId` for idempotent operations where the same `customId` with `add()` will update existing memory instead of creating duplicates.

Typescript

Python

cURL

Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const customId = 'user-note-001';
    
    // First call creates memory
    const created = await client.memories.add({
      content: 'Initial content',
      customId: customId,
      metadata: { version: 1 }
    });
    
    console.log('Created memory:', created.id);
    
    // Second call with same customId updates existing
    const updated = await client.memories.add({
      content: 'Updated content',
      customId: customId,         // Same customId = upsert
      metadata: { version: 2 }
    });
    

The `customId` enables idempotency across all endpoints. The `memoryId` doesn’t support idempotency, only the `customId` does.

## 

​

Single Delete

Delete individual memories by their ID. This is a permanent hard delete with no recovery mechanism.

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Hard delete - permanently removes memory
    await client.memories.delete('memory_id_123');
    console.log('Memory deleted successfully');
    

## 

​

Bulk Delete by IDs

Delete multiple memories at once by providing an array of memory IDs. Maximum of 100 IDs per request.

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Bulk delete by memory IDs
    const result = await client.memories.bulkDelete({
      ids: [
        'memory_id_1',
        'memory_id_2',
        'memory_id_3',
        'non_existent_id'  // This will be reported in errors
      ]
    });
    
    console.log('Bulk delete result:', result);
    // Output: {
    //   success: true,
    //   deletedCount: 3,
    //   errors: [
    //     { id: "non_existent_id", error: "Memory not found" }
    //   ]
    // }
    

## 

​

Bulk Delete by Container Tags

Delete all memories within specific container tags. This is useful for cleaning up entire projects or user data.

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Delete all memories in specific container tags
    const result = await client.memories.bulkDelete({
      containerTags: ['user-123', 'project-old', 'archived-content']
    });
    
    console.log('Bulk delete by tags result:', result);
    // Output: {
    //   success: true,
    //   deletedCount: 45,
    //   containerTags: ["user-123", "project-old", "archived-content"]
    // }
    

## 

​

Advanced Patterns

### 

​

Soft Delete Implementation

For applications requiring audit trails or recovery mechanisms, implement soft delete patterns using metadata:

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Soft delete pattern using metadata
    await client.memories.update('memory_id', {
      metadata: {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: 'user_123'
      }
    });
    
    // Filter out deleted memories in searches
    const activeMemories = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          { key: "deleted", value: "true", negate: true }
        ]
      })
    });
    
    console.log('Active memories:', activeMemories.results.length);
    

### 

​

Batch Processing for Large Operations

Typescript

Python

cURL

Copy

Ask AI
    
    
    // Batch delete large numbers of memories safely
    async function batchDeleteMemories(memoryIds: string[], batchSize = 100) {
      const results = [];
    
      for (let i = 0; i < memoryIds.length; i += batchSize) {
        const batch = memoryIds.slice(i, i + batchSize);
    
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(memoryIds.length/batchSize)}`);
    
        try {
          const result = await client.memories.bulkDelete({ ids: batch });
          results.push(result);
    
          // Brief delay between batches to avoid rate limiting
          if (i + batchSize < memoryIds.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
          results.push({ success: false, error: error.message, batch });
        }
      }
    
      // Aggregate results
      const totalDeleted = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.deletedCount || 0), 0);
    
      console.log(`Total deleted: ${totalDeleted} out of ${memoryIds.length}`);
      return { totalDeleted, results };
    }
    

## 

​

Best Practices

### 

​

Update Operations

  1. **Use customId for idempotent updates** \- Prevents duplicate memories and enables safe retries
  2. **Monitor processing status** \- Updates trigger full reprocessing pipeline
  3. **Handle metadata carefully** \- Updates replace specified metadata keys
  4. **Implement proper error handling** \- Memory may be deleted between operations



### 

​

Delete Operations

  1. **Hard delete is permanent** \- No recovery mechanism exists
  2. **Use bulk operations efficiently** \- Maximum 100 IDs per bulk delete request
  3. **Consider soft delete patterns** \- Use metadata flags for recoverable deletion
  4. **Batch large operations** \- Avoid rate limits with proper batching
  5. **Clean up application state** \- Update your UI/cache after deletions



Was this page helpful?

YesNo

[Status Monitoring](/docs/list-memories/examples/monitoring)[Overview](/docs/connectors/overview)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
