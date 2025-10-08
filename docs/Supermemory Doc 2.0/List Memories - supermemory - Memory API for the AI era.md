# List Memories - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/list-memories/overview
**Scraped:** 2025-10-08 18:01:08

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

List Memories

List Memories

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

  * Quick Start
  * Response Schema
  * Memory Object Fields
  * Key Parameters
  * Examples



Retrieve paginated memories with filtering and sorting options from your Supermemory account.

## 

​

Quick Start

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const memories = await client.memories.list({ limit: 10 });
    console.log(memories);
    

## 

​

Response Schema

The endpoint returns a structured response containing your memories and pagination information:

Copy

Ask AI
    
    
    {
      "memories": [
        {
          "id": "abc123",
          "connectionId": null,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:35:00.000Z",
          "customId": "ml-basics-001",
          "title": "Introduction to Machine Learning",
          "summary": "This document introduces machine learning as a subset of artificial intelligence...",
          "status": "done",
          "type": "text",
          "metadata": {
            "category": "education",
            "priority": "high",
            "source": "research-notes"
          },
          "containerTags": ["user_123", "ai-research"]
        }
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 3,
        "totalItems": 25,
        "limit": 10
      }
    }
    

### 

​

Memory Object Fields

Core Fields

Field| Type| Description  
---|---|---  
`id`| string| Unique identifier for the memory  
`status`| ProcessingStatus| Current processing status (`queued`, `extracting`, `chunking`, `embedding`, `indexing`, `done`, `failed`)  
`type`| MemoryType| Content type (`text`, `pdf`, `webpage`, `video`, `image`, etc.)  
`title`| string | null| Auto-generated or custom title  
`summary`| string | null| AI-generated summary of content  
`createdAt`| string| ISO 8601 creation timestamp  
`updatedAt`| string| ISO 8601 last update timestamp  
  
Optional Fields

Field| Type| Description  
---|---|---  
`customId`| string | null| Your custom identifier for the memory  
`connectionId`| string | null| ID of connector that created this memory  
`metadata`| object | null| Custom key-value metadata you provided  
`containerTags`| string[]| Tags for organizing and filtering memories  
  
## 

​

Key Parameters

All parameters are optional and sent in the request body since this endpoint uses `POST`:

​

limit

number/string

default:"50"

**Number of items per page.** Controls how many memories are returned in a single request. Maximum recommended: 200 for optimal performance.

​

page

number/string

default:"1"

**Page number to fetch (1-indexed).** Use with `limit` to paginate through large result sets.

​

containerTags

string[]

**Filter by tags.** Memories must match ALL provided tags. Use for filtering by user ID, project, or custom organization tags.

​

sort

string

default:"createdAt"

**Sort field.** Options: `"createdAt"` (when memory was added) or `"updatedAt"` (when memory was last modified).

​

order

string

default:"desc"

**Sort direction.** Use `"desc"` for newest first, `"asc"` for oldest first.

​

filters

string

**Advanced filtering.** Filter based on metadata with advanced SQL logic.

## 

​

Examples

## [Basic ListingSimple memory retrieval with default settings](/docs/list-memories/examples/basic)## [FilteringFilter by tags, status, and other criteria](/docs/list-memories/examples/filtering)## [PaginationHandle large datasets with pagination](/docs/list-memories/examples/pagination)## [Status MonitoringTrack processing status across memories](/docs/list-memories/examples/monitoring)

The `/v3/documents/list` endpoint uses **POST** method, not GET. This allows for complex filtering parameters in the request body.

Was this page helpful?

YesNo

[Track Processing Status](/docs/memory-api/track-progress)[Basic Listing](/docs/list-memories/examples/basic)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
