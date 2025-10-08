# Pagination - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/list-memories/examples/pagination
**Scraped:** 2025-10-08 18:01:38

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Pagination

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

  * Basic Pagination
  * Loop Through Pages



Handle large memory collections efficiently using pagination to process data in manageable chunks.

## 

​

Basic Pagination

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Get first page
    const page1 = await client.memories.list({
      limit: 20,
      page: 1
    });
    
    // Get next page
    const page2 = await client.memories.list({
      limit: 20,
      page: 2
    });
    
    console.log(`Page 1: ${page1.memories.length} memories`);
    console.log(`Page 2: ${page2.memories.length} memories`);
    

## 

​

Loop Through Pages

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await client.memories.list({
        page: currentPage,
        limit: 50
      });
    
      console.log(`Page ${currentPage}: ${response.memories.length} memories`);
    
      hasMore = currentPage < response.pagination.totalPages;
      currentPage++;
    }
    

Use larger `limit` values (50-100) for pagination to reduce the number of API calls needed.

Was this page helpful?

YesNo

[Filtering Memories](/docs/list-memories/examples/filtering)[Status Monitoring](/docs/list-memories/examples/monitoring)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
