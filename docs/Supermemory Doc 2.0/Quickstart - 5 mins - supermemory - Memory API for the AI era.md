# Quickstart - 5 mins - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-api/overview
**Scraped:** 2025-10-08 18:01:30

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Quickstart - 5 mins

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [SDKs](/docs/memory-api/sdks/overview)


  * [Overview](/docs/memory-api/sdks/overview)



##### Supermemory SDKs

  * [Python and JavaScript SDKs](/docs/memory-api/sdks/native)
  * [`supermemory` on npm](https://www.npmjs.com/package/supermemory)
  * [`supermemory` on pypi](https://pypi.org/project/supermemory/)



##### OpenAI SDK

  * [OpenAI SDK Plugins](/docs/memory-api/sdks/openai-plugins)
  * [NPM link](https://www.npmjs.com/package/@supermemory/tools)



##### AI SDK

  * [Overview](/docs/ai-sdk/overview)
  * [Memory Tools](/docs/ai-sdk/memory-tools)
  * [Infinite Chat](/docs/ai-sdk/infinite-chat)
  * [NPM link](https://www.npmjs.com/package/@supermemory/tools)



On this page

  * Authentication
  * Installing the clients
  * Add your first memory
  * Content Processing
  * Search your memories



## 

​

Authentication

Head to [supermemory’s Developer Platform](https://console.supermemory.ai) built to help you monitor and manage every aspect of the API. All API requests require authentication using an API key. Include your API key as follows:

cURL

Typescript

Python

Copy

Ask AI
    
    
    Authorization: Bearer YOUR_API_KEY
    

## 

​

Installing the clients

You can use supermemory through the APIs, or using our SDKs

cURL

Typescript

Python

Copy

Ask AI
    
    
    https://api.supermemory.ai/v3
    

## 

​

Add your first memory

cURL

Typescript

Python

Copy

Ask AI
    
    
    curl https://api.supermemory.ai/v3/documents \
      --request POST \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer SUPERMEMORY_API_KEY' \
      -d '{"content": "This is the content of my first memory."}'
    

This will add a new memory to your supermemory account. Try it out in the [API Playground](/docs/api-reference/manage-memories/add-memory).

## 

​

Content Processing

Processing steps

When you add content to supermemory, it goes through several processing steps:

  1. **Queued** : Initial state when content is submitted
  2. **Extracting** : Content is being extracted from the source
  3. **Chunking** : Content is being split into semantic chunks
  4. **Embedding** : Generating vector embeddings for search
  5. **Indexing** : Adding content to the search index
  6. **Done** : Processing complete



Advanced Chunking

The system uses advanced NLP techniques for optimal chunking:

  * Sentence-level splitting for natural boundaries
  * Context preservation with overlapping chunks
  * Smart handling of long content
  * Semantic coherence optimization



## 

​

Search your memories

cURL

Typescript

Python

Copy

Ask AI
    
    
    curl https://api.supermemory.ai/v3/search \
      --request POST \
      --header 'Content-Type: application/json' \
      --header 'Authorization: Bearer SUPERMEMORY_API_KEY' \
      -d '{"q": "This is the content of my first memory."}'
    

Try it out in the [API Playground](/docs/api-reference/search-memories/search-memories). You can do a lot more with supermemory, and we will walk through everything you need to. Next, explore the features available in supermemory

## [Adding memoriesAdding memories](/docs/memory-api/creation)## [Searching and filteringSearching for items](/docs/memory-api/searching)## [Connectors and SyncingConnecting external sources](/docs/memory-api/connectors)## [FeaturesExplore Features](/docs/memory-api/features)

Was this page helpful?

YesNo

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
