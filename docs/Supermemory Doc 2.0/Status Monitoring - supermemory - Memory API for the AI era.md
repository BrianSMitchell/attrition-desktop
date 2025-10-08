# Status Monitoring - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/list-memories/examples/monitoring
**Scraped:** 2025-10-08 18:01:09

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Status Monitoring

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

    * [Overview](/docs/list-memories/overview)
    * Examples

      * [Basic Listing](/docs/list-memories/examples/basic)
      * [Filtering Memories](/docs/list-memories/examples/filtering)
      * [Pagination](/docs/list-memories/examples/pagination)
      * [Status Monitoring](/docs/list-memories/examples/monitoring)
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

  * Status Overview
  * Filter Processing Memories
  * Failed Memories



Monitor memory processing status and track completion rates using the list endpoint.

## 

​

Status Overview

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const response = await client.memories.list({ limit: 100 });
    
    const statusCounts = response.memories.reduce((acc: any, memory) => {
      acc[memory.status] = (acc[memory.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Status breakdown:', statusCounts);
    

## 

​

Filter Processing Memories

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const response = await client.memories.list({ limit: 100 });
    
    const processing = response.memories.filter(m =>
      ['queued', 'extracting', 'chunking', 'embedding', 'indexing'].includes(m.status)
    );
    
    console.log(`${processing.length} memories currently processing`);
    

## 

​

Failed Memories

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const failedMemories = await client.memories.list({
      filters: "status:failed",
      limit: 50
    });
    
    failedMemories.memories.forEach(memory => {
      console.log(`Failed: ${memory.id} - ${memory.title || 'Untitled'}`);
    });
    

For real-time monitoring of individual memories, use the [Track Processing Status](/docs/memory-api/track-progress) guide.

Was this page helpful?

YesNo

[Pagination](/docs/list-memories/examples/pagination)[Update & Delete Memories](/docs/update-delete-memories/overview)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
