# Search Parameters - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/parameters
**Scraped:** 2025-10-08 18:01:21

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search Memories

Search Parameters

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

    * [Overview](/docs/search/overview)
    * [Search Parameters](/docs/search/parameters)
    * [Response Schema](/docs/search/response-schema)
    * [Query Rewriting](/docs/search/query-rewriting)
    * [Reranking](/docs/search/reranking)
    * Examples

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

  * Common Parameters
  * Document Search Parameters (POST /v3/search)
  * Memory Search Parameters (POST /v4/search)



Complete parameter reference for all three search endpoints: document search, memory search, and execute search.

## 

​

Common Parameters

These parameters work across all search endpoints:

​

q

string

required

**Search query string** The text you want to search for. Can be natural language, keywords, or questions.

Copy

Ask AI
    
    
    q: "machine learning neural networks"
    q: "What are the applications of quantum computing?"
    q: "python tutorial beginner"
    

​

limit

number

default:"10"

**Maximum number of results to return** Controls how many results you get back. Higher limits increase response time and size.

Copy

Ask AI
    
    
    limit: 5    // Fast, focused results
    limit: 20   // Comprehensive results
    limit: 100  // Maximum recommended
    

​

containerTags

Array<string>

**Filter by container tags** Organizational tags for filtering results. Uses **exact array matching** \- must match all tags in the same order.

Copy

Ask AI
    
    
    containerTags: ["user_123"]                    // Single tag
    containerTags: ["user_123", "project_ai"]      // Multiple tags (exact match)
    

​

filters

string

**Metadata filtering with SQL-like structure** JSON string containing AND/OR logic for filtering by metadata fields. Uses the same structure as memory listing filters.

Copy

Ask AI
    
    
    filters: JSON.stringify({
      AND: [
        { key: "category", value: "tutorial", negate: false },
        { key: "difficulty", value: "beginner", negate: false }
      ]
    })
    

See [Metadata Filtering Guide](/docs/search/filtering) for complete syntax and examples.

​

rerank

boolean

default:"false"

**Re-score results for better relevance** Applies a secondary ranking algorithm to improve result quality. Adds ~100-200ms latency but increases accuracy.

Copy

Ask AI
    
    
    rerank: true   // Better accuracy, slower
    rerank: false  // Faster, standard accuracy
    

​

rewriteQuery

boolean

default:"false"

**Expand and improve the query** Rewrites your query to find more relevant results. Particularly useful for abbreviations and domain-specific terms. **Adds ~400ms latency**.

Copy

Ask AI
    
    
    // Query rewriting examples:
    "ML" → "machine learning artificial intelligence"
    "JS" → "JavaScript programming language"
    "API" → "application programming interface REST"
    

Query rewriting significantly increases latency. Only use when search quality is more important than speed.

## 

​

Document Search Parameters (POST `/v3/search`)

These parameters are specific to `client.search.documents()`:

​

chunkThreshold

number

default:"0.5"

**Sensitivity for chunk selection** Controls which text chunks are included in results:

  * **0.0** = Least sensitive (more chunks, more results)
  * **1.0** = Most sensitive (fewer chunks, higher quality)



Copy

Ask AI
    
    
    chunkThreshold: 0.2   // Broad search, many chunks
    chunkThreshold: 0.8   // Precise search, only relevant chunks
    

​

documentThreshold

number

default:"0.5"

**Sensitivity for document selection** Controls which documents are considered for search:

  * **0.0** = Search more documents (comprehensive)
  * **1.0** = Search only highly relevant documents (focused)



Copy

Ask AI
    
    
    documentThreshold: 0.1   // Cast wide net
    documentThreshold: 0.9   // Only very relevant documents
    

​

docId

string

**Search within a specific document** Limit search to chunks within a single document. Useful for finding content in large documents.

Copy

Ask AI
    
    
    docId: "doc_abc123"  // Only search this document
    

​

onlyMatchingChunks

boolean

default:"false"

**Return only exact matching chunks** By default, Supermemory includes surrounding chunks for context. Set to `true` to get only the exact matching text.

Copy

Ask AI
    
    
    onlyMatchingChunks: false  // Include context chunks (default)
    onlyMatchingChunks: true   // Only matching chunks
    

Context chunks help LLMs understand the full meaning. Only disable if you need precise text extraction.

​

includeFullDocs

boolean

default:"false"

**Include complete document content** Adds the full document text to each result. Useful for chatbots that need complete context.

Copy

Ask AI
    
    
    includeFullDocs: true   // Full document in response
    includeFullDocs: false  // Only chunks and metadata
    

Including full documents can make responses very large. Use sparingly and with appropriate limits.

​

includeSummary

boolean

default:"false"

**Include document summaries** Adds AI-generated document summaries to results. Good middle-ground between chunks and full documents.

Copy

Ask AI
    
    
    includeSummary: true   // Include document summaries
    includeSummary: false  // No summaries
    

​

filters

string

**Filter by metadata using SQL queries**

Copy

Ask AI
    
    
    // Use this instead:
    filters: JSON.stringify({
      OR: [
        { key: "category", value: "technology", negate: false },
        { key: "category", value: "science", negate: false }
      ]
    })
    

## 

​

Memory Search Parameters (POST `/v4/search`)

These parameters are specific to `client.search.memories()`:

​

threshold

number

default:"0.5"

**Sensitivity for memory selection** Controls which memories are returned based on similarity:

  * **0.0** = Return more memories (broad search)
  * **1.0** = Return only highly similar memories (precise search)



Copy

Ask AI
    
    
    threshold: 0.3   // Broader memory search
    threshold: 0.8   // Only very similar memories
    

​

containerTag

string

**Filter by single container tag** Note: Memory search uses `containerTag` (singular) while document search uses `containerTags` (plural array).

Copy

Ask AI
    
    
    containerTag: "user_123"  // Single tag for memory search
    

​

include

object

**Control what additional data to include** Object specifying what contextual information to include with memory results.

​

include.documents

boolean

default:"false"

Include associated documents for each memory

​

include.relatedMemories

boolean

default:"false"

Include parent and child memories (contextual relationships)

​

include.summaries

boolean

default:"false"

Include memory summaries

Copy

Ask AI
    
    
    include: {
      documents: true,        // Show related documents
      relatedMemories: true,  // Show parent/child memories
      summaries: true         // Include summaries
    }
    

Was this page helpful?

YesNo

[Overview](/docs/search/overview)[Response Schema](/docs/search/response-schema)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
