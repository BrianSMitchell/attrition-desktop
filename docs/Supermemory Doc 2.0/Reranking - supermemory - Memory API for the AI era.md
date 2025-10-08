# Reranking - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/reranking
**Scraped:** 2025-10-08 18:01:25

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search Memories

Reranking

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

  * How Reranking Works
  * Basic Reranking Comparison
  * Complex Query Reranking
  * Memory Search Reranking
  * Domain-Specific Reranking



Reranking applies a secondary ranking algorithm to improve the relevance order of search results. After the initial search returns results, the reranker analyzes the relationship between your query and each result to provide better ordering.

## 

​

How Reranking Works

Supermemory’s reranking process:

  1. **Initial search** returns results using standard semantic similarity
  2. **Reranker model** analyzes query-result pairs
  3. **Scores are recalculated** based on deeper semantic understanding
  4. **Results are reordered** by the new relevance scores
  5. **Final results** maintain the same structure but with improved ordering

The reranker is particularly effective at:

  * **Understanding context** and nuanced relationships
  * **Handling ambiguous queries** with multiple possible meanings
  * **Improving precision** for complex technical topics
  * **Better ranking** when results have similar initial scores



## 

​

Basic Reranking Comparison

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    import Supermemory from 'supermemory';
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    });
    
    // Search without reranking
    const standardResults = await client.search.documents({
      q: "neural network optimization techniques",
      rerank: false,
      limit: 5
    });
    
    // Search with reranking
    const rerankedResults = await client.search.documents({
      q: "neural network optimization techniques",
      rerank: true,
      limit: 5
    });
    
    console.log("Standard top result:", standardResults.results[0].score);
    console.log("Reranked top result:", rerankedResults.results[0].score);
    

**Sample Output Comparison:**

Copy

Ask AI
    
    
    // Without reranking - results ordered by semantic similarity
    {
      "results": [
        {
          "title": "Deep Learning Optimization Methods",
          "score": 0.82,
          "chunks": [
            {
              "content": "Various optimization algorithms like Adam, RMSprop, and SGD are used in neural network training...",
              "score": 0.79
            }
          ]
        },
        {
          "title": "Neural Network Training Techniques",
          "score": 0.81,
          "chunks": [
            {
              "content": "Batch normalization and dropout are common regularization techniques for neural networks...",
              "score": 0.78
            }
          ]
        }
      ],
      "timing": 145
    }
    
    // With reranking - results reordered by contextual relevance
    {
      "results": [
        {
          "title": "Neural Network Training Techniques",
          "score": 0.89,  // Boosted by reranker
          "chunks": [
            {
              "content": "Batch normalization and dropout are common regularization techniques for neural networks...",
              "score": 0.85
            }
          ]
        },
        {
          "title": "Deep Learning Optimization Methods",
          "score": 0.86,  // Slightly adjusted
          "chunks": [
            {
              "content": "Various optimization algorithms like Adam, RMSprop, and SGD are used in neural network training...",
              "score": 0.83
            }
          ]
        }
      ],
      "timing": 267  // Additional ~120ms for reranking
    }
    

## 

​

Complex Query Reranking

Reranking excels with complex, multi-faceted queries:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "sustainable machine learning carbon footprint energy efficiency",
      rerank: true,
      containerTags: ["research", "sustainability"],
      limit: 8
    });
    
    // Reranker understands the connection between:
    // - Machine learning computational costs
    // - Environmental impact of AI training
    // - Energy-efficient model architectures
    // - Green computing practices in ML
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_green_ai",
          "title": "Green AI: Reducing the Carbon Footprint of Machine Learning",
          "score": 0.94,  // Highly relevant after reranking
          "chunks": [
            {
              "content": "Training large neural networks can consume as much energy as several cars over their lifetime. Sustainable ML practices focus on model efficiency, pruning, and quantization to reduce computational demands...",
              "score": 0.92,
              "isRelevant": true
            }
          ]
        },
        {
          "documentId": "doc_efficient_models",
          "title": "Energy-Efficient Neural Network Architectures",
          "score": 0.91,  // Boosted for strong topical relevance
          "chunks": [
            {
              "content": "MobileNets and EfficientNets are designed specifically for energy-constrained environments, achieving high accuracy with minimal computational overhead...",
              "score": 0.88,
              "isRelevant": true
            }
          ]
        }
      ],
      "total": 12,
      "timing": 298
    }
    

## 

​

Memory Search Reranking

Reranking also improves memory search results:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const memoryResults = await client.search.memories({
      q: "explain transformer architecture attention mechanism",
      rerank: true,
      containerTag: "ai_notes",
      threshold: 0.6,
      limit: 5
    });
    
    // Reranker identifies memories that best explain
    // the relationship between transformers and attention
    

**Sample Output:**

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_transformer_intro",
          "memory": "The transformer architecture revolutionized NLP by replacing recurrent layers with self-attention mechanisms. The attention mechanism allows the model to focus on different parts of the input sequence when processing each token, enabling parallel processing and better long-range dependency modeling.",
          "similarity": 0.93,  // Reranked higher for comprehensive explanation
          "title": "Transformer Architecture Overview",
          "metadata": {
            "topic": "deep-learning",
            "subtopic": "transformers"
          }
        },
        {
          "id": "mem_attention_detail",
          "memory": "Self-attention computes attention weights by taking dot products between query, key, and value vectors derived from the input embeddings. This allows each position to attend to all positions in the previous layer, capturing complex relationships in the data.",
          "similarity": 0.91,  // Boosted for technical detail
          "title": "Self-Attention Mechanism Details"
        }
      ],
      "total": 8,
      "timing": 198
    }
    

## 

​

Domain-Specific Reranking

Reranking understands domain-specific relationships:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Medical domain query
    const medicalResults = await client.search.documents({
      q: "diabetes treatment insulin resistance metformin",
      rerank: true,
      filters: {
        AND: [
          { key: "domain", value: "medical", negate: false }
        ]
      },
      limit: 10
    });
    
    // Reranker understands medical relationships:
    // - Diabetes types and treatments
    // - Insulin resistance mechanisms
    // - Metformin's role in diabetes management
    

Was this page helpful?

YesNo

[Query Rewriting](/docs/search/query-rewriting)[Documents Search (/v3/search)](/docs/search/examples/document-search)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
