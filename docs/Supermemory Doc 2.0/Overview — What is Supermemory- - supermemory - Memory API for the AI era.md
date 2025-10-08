# Overview — What is Supermemory? - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/intro
**Scraped:** 2025-10-08 17:59:55

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Getting Started

Overview — What is Supermemory?

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

  * How does it work? (at a glance)
  * Memory API — full control
  * AI SDK
  * Memory Router — drop-in proxy with minimal code
  * Next steps



Supermemory gives your LLMs long-term memory. Instead of stateless text generation, they recall the right facts from your files, chats, and tools, so responses stay consistent, contextual, and personal.

## 

​

How does it work? (at a glance)

  * You send Supermemory text, files, and chats.
  * Supermemory [intelligently indexes them](/docs/how-it-works) and builds a semantic understanding graph on top of an entity (e.g., a user, a document, a project, an organization).
  * At query time, we fetch only the most relevant context and pass it to your models.

We offer three ways to add memory to your LLMs:

### 

​

Memory API — full control

  * Ingest text, files, and chats (supports multi-modal); search & filter; re-rank results.
  * Modelled after the actual human brain’s working with smart forgetting, decay, recency bias, context rewriting, etc.
  * API + SDKs for Node & Python; designed to scale in production.



You can reference the full API documentation for the Memory API [here](/docs/api-reference/manage-memories/add-memory).

### 

​

AI SDK

  * Native Vercel AI SDK integration with `@supermemory/tools/ai-sdk`
  * Memory tools for agents or infinite chat for automatic context
  * Works with streamText, generateText, and all AI SDK features



Copy

Ask AI
    
    
    import { streamText } from "ai"
    import { supermemoryTools } from "@supermemory/tools/ai-sdk"
    
    const result = await streamText({
      model: anthropic("claude-3"),
      tools: supermemoryTools("YOUR_KEY")
    })
    

The AI SDK is recommended for new projects using Vercel AI SDK. The Router works best for existing **chat applications** , whereas the Memory API works as a **complete memory database** with granular control.

### 

​

Memory Router — drop-in proxy with minimal code

  * Keep your existing LLM client; just append `api.supermemory.ai/v3/` to your base URL.
  * Automatic chunking and token management that fits your context window.
  * Adds minimal latency on top of existing LLM requests.



All three approaches share the **same memory pool** when using the same user ID. You can mix and match based on your needs.

## 

​

Next steps

Head to the [**Router vs API**](/docs/routervsapi) guide to understand the technical differences between the two and pick what’s best for you with a simple 4-question flow.

Was this page helpful?

YesNo

[Memory API vs Router](/docs/routervsapi)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
