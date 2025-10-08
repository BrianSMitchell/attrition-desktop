# Search with Filters & Scoring - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/overview
**Scraped:** 2025-10-08 18:00:21

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search Memories

Search with Filters & Scoring

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

  * Search Endpoints Overview
  * Documents vs Memories Search: What’s the Difference?
  * Documents Search (/v3/search)
  * Memories Search (/v4/search)
  * Search Flow Architecture
  * Document Search (/v3/search) Flow
  * Memory Search (/v4/search) Flow
  * Key Concepts You Need to Understand
  * 1\. Thresholds (Sensitivity Control)
  * 2\. Chunk Context vs Exact Matching
  * 3\. Query Rewriting & Reranking
  * 4\. Container Tags vs Metadata Filters



## 

​

Search Endpoints Overview

## [Documents Search - Fast, Advanced RAG**POST /v3/search** Full-featured search with extensive control over ranking, filtering, thresholds, and result structure. Searches through and returns relevant documents. More flexibility.](/docs/search/examples/document-search)## [Memories Search**POST /v4/search** Minimal-latency search optimized for chatbots and conversational AI. Searches through and returns memories. Simple parameters, fast responses, easy to use.](/docs/search/examples/memory-search)

## 

​

Documents vs Memories Search: What’s the Difference?

The key difference between `/v3/search` and `/v4/search` is **documents vs memories**. `/v3/search` searches through the documents and returns matching chunks, whereas `/v4/search` searches through user’s memories, preferences and history.

  * **Documents:** Refer to the data you ingest like text, pdfs, videos, images, etc. They are sources of ground truth.
  * **Memories:** They are automatically extracted from your documents by Supermemory. Smaller information chunks inferred from documents and related to each other.

Refer to the [ingestion guide](/docs/memory-api/ingesting) to learn more about the difference between documents and memories.

### 

​

Documents Search (`/v3/search`)

**High quality documents search** \- extensive parameters for fine-tuning search behavior:

  * **Use cases** : Use this endpoint for use cases where “literal” document search is required.
    * Looking through legal/finance documents
    * Searching through items in google drive
    * Chat with documentation
  * With this endpoint, you get **Full Control** over
    * Thresholds,
    * Filtering
    * Reranking
    * Query rewriting



  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Documents search
    const results = await client.search.documents({
      q: "machine learning accuracy",
      limit: 10,
      documentThreshold: 0.7,
      chunkThreshold: 0.8,
      rerank: true,
      rewriteQuery: true,
      includeFullDocs: true,
      includeSummary: true,
      onlyMatchingChunks: false,
      containerTags: ["research"],
      filters: {
        AND: [{ key: "category", value: "ai", negate: false }]
      }
    });
    

Sample Response

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_abc123",
          "title": "Machine Learning Fundamentals",
          "type": "pdf",
          "score": 0.89,
          "chunks": [
            {
              "content": "Machine learning is a subset of artificial intelligence...",
              "score": 0.95,
              "isRelevant": true
            }
          ],
          "metadata": {
            "category": "education",
            "author": "Dr. Smith",
            "difficulty": "beginner"
          },
          "createdAt": "2024-01-15T10:30:00Z",
          "updatedAt": "2024-01-20T14:45:00Z"
        }
      ],
      "timing": 187,
      "total": 1
    }
    

The `/v3/search` endpoint returns the most relevant documents and chunks from those documents. Head over to the [response schema](/docs/search/response-schema) page to understand more about the response structure.

### 

​

Memories Search (`/v4/search`)

**Search through user memories** :

  * **Use cases** : Use this endpoint for use cases where understanding user context / preferences / memories is more important than literal document search.
    * Personalized chatbots (AI Companions)
    * Auto selecting based on what the user wants
    * Setting the tone of the conversation

Companies like Composio [Rube.app](https://rube.app) use memories search for letting the MCP automate better based on the user prompts before.

This endpoint works best for conversational AI use cases like chatbots.

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Memories search
    const results = await client.search.memories({
      q: "machine learning accuracy",
      limit: 5,
      containerTag: "research",
      threshold: 0.7,
      rerank: true
    });
    

Sample Response

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_xyz789",
          "memory": "Complete memory content about quantum computing applications...",
          "similarity": 0.87,
          "metadata": {
            "category": "research",
            "topic": "quantum-computing"
          },
          "updatedAt": "2024-01-18T09:15:00Z",
          "version": 3,
          "context": {
            "parents": [
              {
                "memory": "Earlier discussion about quantum theory basics...",
                "relation": "extends",
                "version": 2,
                "updatedAt": "2024-01-17T16:30:00Z"
              }
            ],
            "children": [
              {
                "memory": "Follow-up questions about quantum algorithms...",
                "relation": "derives",
                "version": 4,
                "updatedAt": "2024-01-19T11:20:00Z"
              }
            ]
          },
          "documents": [
            {
              "id": "doc_quantum_paper",
              "title": "Quantum Computing Applications",
              "type": "pdf",
              "createdAt": "2024-01-10T08:00:00Z"
            }
          ]
        }
      ],
      "timing": 156,
      "total": 1
    }
    
    

The `/v4/search` endpoint searches through and returns memories.

## 

​

Search Flow Architecture

### 

​

Document Search (`/v3/search`) Flow

### 

​

Memory Search (`/v4/search`) Flow

## 

​

Key Concepts You Need to Understand

### 

​

1\. Thresholds (Sensitivity Control)

Thresholds control result quality vs quantity:

  * **0.0** = Least sensitive (more results, lower quality)
  * **1.0** = Most sensitive (fewer results, higher quality)



Copy

Ask AI
    
    
    // Different threshold strategies
    const broadSearch = await client.search.documents({
      q: "machine learning",
      chunkThreshold: 0.2,      // Return more chunks
      documentThreshold: 0.1    // From more documents
    });
    
    const preciseSearch = await client.search.documents({
      q: "machine learning",
      chunkThreshold: 0.8,      // Only highly relevant chunks
      documentThreshold: 0.7    // From closely matching documents
    });
    

### 

​

2\. Chunk Context vs Exact Matching

By default, Supermemory returns chunks **with context** (surrounding text):

Copy

Ask AI
    
    
    // Default: includes surrounding chunks for context
    const contextualResults = await client.search.documents({
      q: "neural networks",
      onlyMatchingChunks: false  // Default
    });
    
    // Precise: only the exact matching text
    const exactResults = await client.search.documents({
      q: "neural networks",
      onlyMatchingChunks: true
    });
    

### 

​

3\. Query Rewriting & Reranking

**Query Rewriting** (+400ms latency):

  * Expands your query to find more relevant results
  * “ML” becomes “machine learning artificial intelligence”
  * Useful for abbreviations and domain-specific terms

**Reranking** :

  * Re-scores results using a different algorithm
  * More accurate but slower
  * Recommended for critical searches



### 

​

4\. Container Tags vs Metadata Filters

Two different filtering mechanisms: When to use container tags:

  * The user understanding graph is built on top of container tags. **The graph is formed on top of container tags.**
  * Container tags are used for organizational grouping and exact matching.
  * They are useful for categorizing content and ensuring precise results. When to use metadata filters:
  * When you need flexible conditions beyond exact matches.
  * Useful for filtering by attributes like date, author, or category.



Copy

Ask AI
    
    
    // Container tags: Organizational grouping (exact array matching)
    const userContent = await client.search.documents({
      q: "python tutorial",
      containerTag "user_123"  // Must match exactly
    });
    
    // Metadata filters: SQL-based queries (flexible conditions)
    const filteredContent = await client.search.documents({
      q: "python tutorial",
      filters: JSON.stringify({
        AND: [
          { key: "language", value: "python", negate: false },
          { key: "difficulty", value: "beginner", negate: false }
        ]
      })
    });
    

Was this page helpful?

YesNo

[File Upload](/docs/add-memories/examples/file-upload)[Search Parameters](/docs/search/parameters)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
