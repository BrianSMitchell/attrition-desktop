# How Supermemory Works - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/how-it-works
**Scraped:** 2025-10-08 17:59:51

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

How Supermemory Works

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

  * The Mental Model
  * Documents vs Memories
  * Documents: Your Raw Input
  * Memories: Intelligent Knowledge Units
  * Memory Relationships
  * Updates: Information Changes
  * Extends: Information Enriches
  * Derives: Information Infers
  * Processing Pipeline
  * Next Steps



Supermemory isn’t just another document storage system. It’s designed to mirror how human memory actually works - forming connections, evolving over time, and generating insights from accumulated knowledge.

## 

​

The Mental Model

Traditional systems store files. Supermemory creates a living knowledge graph.

## Traditional Systems

  * Static files in folders
  * No connections between content
  * Search matches keywords
  * Information stays frozen



## Supermemory

  * Dynamic knowledge graph
  * Rich relationships between memories
  * Semantic understanding
  * Information evolves and connects



## 

​

Documents vs Memories

Understanding this distinction is crucial to using Supermemory effectively.

### 

​

Documents: Your Raw Input

Documents are what you provide - the raw materials:

  * PDF files you upload
  * Web pages you save
  * Text you paste
  * Images with text
  * Videos to transcribe

Think of documents as books you hand to Supermemory.

### 

​

Memories: Intelligent Knowledge Units

Memories are what Supermemory creates - the understanding:

  * Semantic chunks with meaning
  * Embedded for similarity search
  * Connected through relationships
  * Dynamically updated over time

Think of memories as the insights and connections your brain makes after reading those books.

**Key Insight** : When you upload a 50-page PDF, Supermemory doesn’t just store it. It breaks it into hundreds of interconnected memories, each understanding its context and relationships to your other knowledge.

## 

​

Memory Relationships

The graph connects memories through three types of relationships:

### 

​

Updates: Information Changes

When new information contradicts or updates existing knowledge, Supermemory creates an “update” relationship.

Original Memory

New Memory (Updates Original)

Copy

Ask AI
    
    
    "You work at Supermemory as a content engineer"
    

The system tracks which memory is latest with an `isLatest` field, ensuring searches return current information.

### 

​

Extends: Information Enriches

When new information adds to existing knowledge without replacing it, Supermemory creates an “extends” relationship. Continuing our “working at supermemory” analogy, a memory about what you work on would extend the memory about your role given above.

Original Memory

New Memory (Extension) - Separate From Previous

Copy

Ask AI
    
    
    "You work at Supermemory as the CMO"
    

Both memories remain valid and searchable, providing richer context.

### 

​

Derives: Information Infers

The most sophisticated relationship - when Supermemory infers new connections from patterns in your knowledge.

Memory 1

Memory 2

Derived Memory

Copy

Ask AI
    
    
    "Dhravya is the founder of Supermemory"
    

These inferences help surface insights you might not have explicitly stated.

## 

​

Processing Pipeline

Understanding the pipeline helps you optimize your usage: Stage| What Happens  
---|---  
**Queued**|  Document waiting to process  
**Extracting**|  Content being extracted  
**Chunking**|  Creating memory chunks  
**Embedding**|  Generating vectors  
**Indexing**|  Building relationships  
**Done**|  Fully searchable  
  
**Tip** : Larger documents and videos take longer. A 100-page PDF might take 1-2 minutes, while a 1-hour video could take 5-10 minutes.

## 

​

Next Steps

Now that you understand how Supermemory works:

## [Add MemoriesStart adding content to your knowledge graph](/docs/add-memories/overview)## [Search MemoriesLearn to query your knowledge effectively](/docs/search/overview)

Was this page helpful?

YesNo

[Memory vs RAG](/docs/memory-vs-rag)[Overview](/docs/add-memories/overview)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
