# Query Rewriting - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/query-rewriting
**Scraped:** 2025-10-08 18:01:24

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search Memories

Query Rewriting

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

  * How Query Rewriting Works
  * Basic Query Rewriting
  * Natural Language Questions
  * Technical Term Expansion
  * Memory Search with Query Rewriting
  * Complex Multi-Concept Queries



Query rewriting automatically generates multiple variations of your search query to improve result coverage and accuracy. Supermemory creates several rewrites, searches through all of them, then merges and deduplicates the results.

## 

​

How Query Rewriting Works

When you enable `rewriteQuery: true`, Supermemory:

  1. **Analyzes your original query** for intent and key concepts
  2. **Generates multiple rewrites** with different phrasings and synonyms
  3. **Executes searches** for both original and rewritten queries in parallel
  4. **Merges and deduplicates** results from all queries
  5. **Returns unified results** ranked by relevance

This process adds ~400ms latency but significantly improves result quality, especially for:

  * **Natural language questions** (“How do neural networks learn?”)
  * **Ambiguous terms** that could have multiple meanings
  * **Complex queries** with multiple concepts
  * **Domain-specific terminology** that might have synonyms



## 

​

Basic Query Rewriting

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    // Without query rewriting
    const basicResults = await client.search.documents({
      q: "How do transformers work in AI?",
      rewriteQuery: false,
      limit: 5
    });
    
    // With query rewriting - generates multiple query variations
    const rewrittenResults = await client.search.documents({
      q: "How do transformers work in AI?",
      rewriteQuery: true,
      limit: 5
    });
    
    console.log(`Basic search: ${basicResults.total} results`);
    console.log(`Rewritten search: ${rewrittenResults.total} results`);
    

**Sample Output Comparison:**

Copy

Ask AI
    
    
    // Without rewriting: 3 results
    {
      "results": [...],
      "total": 3,
      "timing": 120
    }
    
    // With rewriting: 8 results (found more relevant content)
    {
      "results": [...],
      "total": 8,
      "timing": 520  // +400ms for query processing
    }
    

## 

​

Natural Language Questions

Query rewriting excels at converting conversational questions into effective search queries:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Natural language question
    const results = await client.search.documents({
      q: "What are the best practices for training deep learning models?",
      rewriteQuery: true,
      limit: 10
    });
    
    // The system might generate rewrites like:
    // - "deep learning model training best practices"
    // - "neural network training optimization techniques"
    // - "machine learning model training guidelines"
    // - "deep learning training methodology"
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_123",
          "title": "Deep Learning Training Guide",
          "score": 0.92,
          "chunks": [
            {
              "content": "Best practices for training deep neural networks include proper weight initialization, learning rate scheduling, and regularization techniques...",
              "score": 0.89,
              "isRelevant": true
            }
          ]
        },
        {
          "documentId": "doc_456",
          "title": "Neural Network Optimization",
          "score": 0.87,
          "chunks": [
            {
              "content": "Effective training methodologies involve batch normalization, dropout, and gradient clipping to prevent overfitting...",
              "score": 0.85,
              "isRelevant": true
            }
          ]
        }
      ],
      "total": 12,
      "timing": 445
    }
    

## 

​

Technical Term Expansion

Query rewriting helps find content using different technical terminologies:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Original query with specific terminology
    const results = await client.search.documents({
      q: "CNN architecture patterns",
      rewriteQuery: true,
      containerTags: ["research"],
      limit: 8
    });
    
    // System expands to include:
    // - "convolutional neural network architecture"
    // - "CNN design patterns"
    // - "convolutional network structures"
    // - "CNN architectural components"
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_789",
          "title": "Convolutional Neural Network Architectures",
          "score": 0.94,
          "chunks": [
            {
              "content": "Modern CNN architectures like ResNet and DenseNet utilize skip connections to address the vanishing gradient problem...",
              "score": 0.91,
              "isRelevant": true
            }
          ]
        },
        {
          "documentId": "doc_101",
          "title": "Deep Learning Design Patterns",
          "score": 0.88,
          "chunks": [
            {
              "content": "Convolutional layers followed by pooling operations form the fundamental building blocks of CNN architectures...",
              "score": 0.86,
              "isRelevant": true
            }
          ]
        }
      ],
      "total": 15,
      "timing": 478
    }
    

## 

​

Memory Search with Query Rewriting

Query rewriting works with both document and memory search:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Memory search with query rewriting
    const memoryResults = await client.search.memories({
      q: "explain quantum entanglement simply",
      rewriteQuery: true,
      containerTag: "physics_notes",
      limit: 5
    });
    
    // Generates variations like:
    // - "quantum entanglement explanation"
    // - "what is quantum entanglement"
    // - "quantum entanglement basics"
    // - "simple quantum entanglement description"
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_456",
          "memory": "Quantum entanglement is a phenomenon where two particles become connected in such a way that measuring one instantly affects the other, regardless of distance. Think of it like having two magical coins that always land on opposite sides.",
          "similarity": 0.91,
          "title": "Simple Quantum Entanglement Explanation",
          "metadata": {
            "topic": "quantum-physics",
            "difficulty": "beginner"
          }
        },
        {
          "id": "mem_789",
          "memory": "Einstein called quantum entanglement 'spooky action at a distance' because entangled particles seem to communicate instantaneously across vast distances, challenging our understanding of locality in physics.",
          "similarity": 0.87,
          "title": "Einstein's View on Entanglement"
        }
      ],
      "total": 7,
      "timing": 412
    }
    

## 

​

Complex Multi-Concept Queries

Query rewriting excels at handling queries with multiple concepts:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "machine learning bias fairness algorithmic discrimination",
      rewriteQuery: true,
      filters: {
        AND: [
          { key: "category", value: "ethics", negate: false }
        ]
      },
      limit: 10
    });
    
    // Breaks down into focused rewrites:
    // - "machine learning bias detection"
    // - "algorithmic fairness in AI"
    // - "discrimination in machine learning algorithms"
    // - "bias mitigation techniques ML"
    

Was this page helpful?

YesNo

[Response Schema](/docs/search/response-schema)[Reranking](/docs/search/reranking)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
