# Documents Search (/v3/search) - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/examples/document-search
**Scraped:** 2025-10-08 18:01:04

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Documents Search (/v3/search)

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

      * [Documents Search (/v3/search)](/docs/search/examples/document-search)
      * [Memories Search (/v4/search)](/docs/search/examples/memory-search)
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

  * Basic Implementation
  * Container Tags Filtering
  * Metadata Filtering
  * Array Contains Filtering
  * Threshold Control
  * Query Rewriting
  * Reranking
  * Document-Specific Search
  * Full Context Options
  * Complete Advanced Example



Documents search (`POST /v3/search`) provides maximum control over search behavior with extensive parameters for fine-tuning results.

## 

​

Basic Implementation

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const results = await client.search.documents({
      q: "machine learning neural networks",
      limit: 5
    });
    
    console.log(`Found ${results.total} documents in ${results.timing}ms`);
    
    // Sample output structure
    results.results.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.title} (Score: ${doc.score})`);
      console.log(`   ${doc.chunks.length} chunks found`);
    });
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_ml_guide_2024",
          "title": "Machine Learning with Neural Networks: A Comprehensive Guide",
          "score": 0.89,
          "chunks": [
            {
              "content": "Neural networks are computational models inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information through weighted connections...",
              "score": 0.92,
              "isRelevant": true
            },
            {
              "content": "Deep learning, a subset of machine learning, uses neural networks with multiple hidden layers to learn complex patterns in data...",
              "score": 0.87,
              "isRelevant": true
            }
          ],
          "createdAt": "2024-01-15T10:30:00Z",
          "metadata": {
            "category": "ai",
            "difficulty": "intermediate"
          }
        }
      ],
      "total": 12,
      "timing": 156
    }
    

## 

​

Container Tags Filtering

Container tags are the primary way to isolate search results by user, project, or organization. **Key behaviors:**

  * **Array-based** : Unlike `/v4/search`, this endpoint accepts multiple container tags as an array
  * **Exact array matching** : Documents must have the EXACT same container tags array to match



  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "quarterly reports",
      containerTags: ["user_123"],
      limit: 10
    });
    

## 

​

Metadata Filtering

Metadata filtering allows complex conditions on structured data attached to your documents. This uses SQL-like query construction in the backend, requiring explicit AND/OR structures. **Filter structure rules:**

  * **Must wrap conditions** in AND or OR arrays, even for single conditions
  * **Supports string matching** (exact), numeric operators, and array contains
  * **Negate any condition** with `negate: true`
  * **Combines with container tags** \- both filters are applied



  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "machine learning",
      filters: {
        AND: [
          {
            key: "category",
            value: "technology",
            negate: false
          },
          {
            filterType: "numeric",
            key: "readingTime",
            value: "5",
            negate: false,
            numericOperator: "<="
          }
        ]
      },
      limit: 10
    });
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_tech_trends_2024",
          "title": "Technology Trends in Machine Learning",
          "score": 0.91,
          "chunks": [
            {
              "content": "Machine learning continues to evolve with new architectures and optimization techniques. Reading time for this comprehensive overview is approximately 8 minutes...",
              "score": 0.88,
              "isRelevant": true
            }
          ],
          "metadata": {
            "category": "technology",
            "readingTime": 8,
            "difficulty": "intermediate",
            "published": true
          }
        }
      ],
      "total": 6,
      "timing": 189
    }
    

## 

​

Array Contains Filtering

When your metadata includes arrays (like participant lists, tags, or categories), use `array_contains` to check if the array includes a specific value.

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "meeting discussion",
      filters: {
        AND: [
          {
            key: "participants",
            value: "john.doe",
            filterType: "array_contains"
          }
        ]
      },
      limit: 5
    });
    

## 

​

Threshold Control

Control result quality with sensitivity thresholds:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "artificial intelligence",
      documentThreshold: 0.7,  // Higher = fewer, more relevant documents
      chunkThreshold: 0.8,     // Higher = fewer, more relevant chunks
      limit: 10
    });
    

## 

​

Query Rewriting

Improve search accuracy with automatic query rewriting:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "What is the capital of France?",
      rewriteQuery: true,  // +400ms latency but better results
      limit: 5
    });
    

Query rewriting generates multiple query variations and searches through all of them, then merges results. No additional cost but adds ~400ms latency.

## 

​

Reranking

Improve result quality with secondary ranking:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "machine learning applications",
      rerank: true,  // Apply secondary ranking algorithm
      limit: 10
    });
    

## 

​

Document-Specific Search

Search within a specific large document:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "neural networks",
      docId: "doc_123",  // Search only within this document
      limit: 10
    });
    

## 

​

Full Context Options

Include complete document content and summaries:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "research findings",
      includeFullDocs: true,    // Include complete document content
      includeSummary: true,     // Include document summaries
      onlyMatchingChunks: false, // Include all chunks, not just matching ones
      limit: 5
    });
    

## 

​

Complete Advanced Example

Combining all features for maximum control:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "machine learning performance metrics",
      containerTags: ["research_project"],
      filters: {
        AND: [
          { key: "category", value: "ai", negate: false },
          { key: "status", value: "published", negate: false }
        ]
      },
      documentThreshold: 0.6,
      chunkThreshold: 0.7,
      rewriteQuery: true,
      rerank: true,
      includeFullDocs: false,
      includeSummary: true,
      onlyMatchingChunks: true,
      limit: 10
    });
    

Was this page helpful?

YesNo

[Reranking](/docs/search/reranking)[Memories Search (/v4/search)](/docs/search/examples/memory-search)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
