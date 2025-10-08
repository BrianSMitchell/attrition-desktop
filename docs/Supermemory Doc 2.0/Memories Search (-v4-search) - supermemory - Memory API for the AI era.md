# Memories Search (/v4/search) - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/examples/memory-search
**Scraped:** 2025-10-08 18:01:06

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Memories Search (/v4/search)

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

  * Basic Search
  * Container Tag Filtering
  * Threshold Control
  * Reranking
  * Query Rewriting
  * Include Related Content
  * Metadata Filtering
  * Chatbot Example
  * Complete Memories Search Example
  * Comon Use Cases



Memories search (`POST /v4/search`) provides minimal-latency search optimized for real-time interactions. This endpoint prioritizes speed over extensive control, making it perfect for chatbots, Q&A systems, and any application where users expect immediate responses.

## 

​

Basic Search

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    const results = await client.search.memories({
      q: "machine learning applications",
      limit: 5
    });
    
    console.log(results)
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_ml_apps_2024",
          "memory": "Machine learning applications span numerous industries including healthcare (diagnostic imaging, drug discovery), finance (fraud detection, algorithmic trading), autonomous vehicles (computer vision, path planning), and natural language processing (chatbots, translation services).",
          "similarity": 0.92,
          "title": "Machine Learning Industry Applications",
          "type": "text",
          "metadata": {
            "topic": "machine-learning",
            "industry": "technology",
            "created": "2024-01-10"
          }
        },
        {
          "id": "mem_ml_healthcare",
          "memory": "In healthcare, machine learning enables early disease detection through medical imaging analysis, personalized treatment recommendations, and drug discovery acceleration by predicting molecular behavior.",
          "similarity": 0.89,
          "title": "ML in Healthcare",
          "type": "text"
        }
      ],
      "total": 8,
      "timing": 87
    }
    

## 

​

Container Tag Filtering

Filter by user, project, or organization:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "project updates",
      containerTag: "user_123",  // Note: singular, not plural
      limit: 10
    });
    

## 

​

Threshold Control

Control result quality with similarity threshold:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "artificial intelligence research",
      threshold: 0.7,  // Higher = fewer, more similar results
      limit: 10
    });
    

## 

​

Reranking

Improve result quality with secondary ranking:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "quantum computing breakthrough",
      rerank: true,  // Better relevance, slight latency increase
      limit: 5
    });
    

## 

​

Query Rewriting

Improve search accuracy with automatic query expansion:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "How do neural networks learn?",
      rewriteQuery: true,  // +400ms latency but better results
      limit: 5
    });
    

## 

​

Include Related Content

Include documents, related memories, and summaries:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "machine learning trends",
      include: {
        documents: true,        // Include source documents
        relatedMemories: true,  // Include related memory entries
        summaries: true         // Include memory summaries
      },
      limit: 5
    });
    

## 

​

Metadata Filtering

Simple metadata filtering for Memories search:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "research findings",
      filters: {
        AND: [
          { key: "category", value: "science", negate: false },
          { key: "status", value: "published", negate: false }
        ]
      },
      limit: 10
    });
    

## 

​

Chatbot Example

Optimal configuration for conversational AI:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Optimized for chatbot responses
    const results = await client.search.memories({
      q: userMessage,
      containerTag: userId,
      threshold: 0.6,     // Balanced relevance
      rerank: false,      // Skip for speed
      rewriteQuery: false, // Skip for speed
      limit: 3            // Few, relevant results
    });
    
    // Quick response for chat
    const context = results.results
      .map(r => r.memory)
      .join('\n\n');
    

## 

​

Complete Memories Search Example

Combining features for comprehensive results:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.memories({
      q: "machine learning model performance",
      containerTag: "research_team",
      filters: {
        AND: [
          { key: "topic", value: "ai", negate: false }
        ]
      },
      threshold: 0.7,
      rerank: true,
      rewriteQuery: false, // Skip for speed
      include: {
        documents: true,
        relatedMemories: false,
        summaries: true
      },
      limit: 5
    });
    

## 

​

Comon Use Cases

  * **Chatbots** : Basic search with container tag and low threshold
  * **Q &A Systems**: Add reranking for better relevance
  * **Knowledge Retrieval** : Include documents and summaries
  * **Real-time Search** : Skip rewriting and reranking for maximum speed



Was this page helpful?

YesNo

[Documents Search (/v3/search)](/docs/search/examples/document-search)[Grouping and filtering](/docs/search/filtering)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
