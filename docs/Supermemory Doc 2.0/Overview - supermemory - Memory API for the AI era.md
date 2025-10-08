# Overview - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-router/overview
**Scraped:** 2025-10-08 18:00:13

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory Router

Overview

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

  * What is the Memory Router?
  * How It Works
  * Key Benefits
  * For Developers
  * For Applications
  * When to Use the Memory Router
  * Supported Providers
  * Authentication
  * How Memories Work
  * Response Headers
  * Error Handling
  * Rate Limits & Pricing
  * Rate Limits
  * Pricing



The Memory Router is a transparent proxy that sits between your application and your LLM provider, automatically managing context and memories without requiring any code changes.

**Live Demo** : Try the Memory Router at [supermemory.chat](https://supermemory.chat) to see it in action.

**Using Vercel AI SDK?** Check out our [AI SDK integration](/docs/ai-sdk/overview) for the cleanest implementation with `@supermemory/tools/ai-sdk` \- it’s our recommended approach for new projects.

## 

​

What is the Memory Router?

The Memory Router gives your LLM applications:

  * **Unlimited Context** : No more token limits - conversations can extend indefinitely
  * **Automatic Memory Management** : Intelligently chunks, stores, and retrieves relevant context
  * **Zero Code Changes** : Works with your existing OpenAI-compatible clients
  * **Cost Optimization** : Save up to 70% on token costs through intelligent context management



## 

​

How It Works

1

Proxy Request

Your application sends requests to Supermemory instead of directly to your LLM provider

2

Context Management

Supermemory automatically:

  * Removes unnecessary context from long conversations
  * Searches relevant memories from previous interactions
  * Appends the most relevant context to your prompt



3

Forward to LLM

The optimized request is forwarded to your chosen LLM provider

4

Async Memory Creation

New memories are created asynchronously without blocking the response

## 

​

Key Benefits

### 

​

For Developers

  * **Drop-in Integration** : Just change your base URL - no other code changes needed
  * **Provider Agnostic** : Works with OpenAI, Anthropic, Google, Groq, and more
  * **Shared Memory Pool** : Memories created via API are available to the Router and vice versa
  * **Automatic Fallback** : If Supermemory has issues, requests pass through directly



### 

​

For Applications

  * **Better Long Conversations** : Maintains context even after thousands of messages
  * **Consistent Responses** : Memories ensure consistent information across sessions
  * **Smart Retrieval** : Only relevant context is included, improving response quality
  * **Cost Savings** : Automatic chunking reduces token usage significantly



## 

​

When to Use the Memory Router

The Memory Router is ideal for:

  * Perfect For

  * Consider API Instead




  * **Chat Applications** : Customer support, AI assistants, chatbots
  * **Long Conversations** : Sessions that exceed model context windows
  * **Multi-Session Memory** : Users who return and continue conversations
  * **Quick Prototypes** : Get memory capabilities without building infrastructure



## 

​

Supported Providers

The Memory Router works with any OpenAI-compatible endpoint: Provider| Base URL| Status  
---|---|---  
OpenAI| `api.openai.com/v1`| ✅ Fully Supported  
Anthropic| `api.anthropic.com/v1`| ✅ Fully Supported  
Google Gemini| `generativelanguage.googleapis.com/v1beta/openai`| ✅ Fully Supported  
Groq| `api.groq.com/openai/v1`| ✅ Fully Supported  
DeepInfra| `api.deepinfra.com/v1/openai`| ✅ Fully Supported  
OpenRouter| `openrouter.ai/api/v1`| ✅ Fully Supported  
Custom| Any OpenAI-compatible| ✅ Supported  
  
**Not Yet Supported** :

  * OpenAI Assistants API (`/v1/assistants`)



## 

​

Authentication

The Memory Router requires two API keys:

  1. **Supermemory API Key** : For memory management
  2. **Provider API Key** : For your chosen LLM provider

You can provide these via:

  * Headers (recommended for production)
  * URL parameters (useful for testing)
  * Request body (for compatibility)



## 

​

How Memories Work

When using the Memory Router:

  1. **Automatic Extraction** : Important information from conversations is automatically extracted
  2. **Intelligent Chunking** : Long messages are split into semantic chunks
  3. **Relationship Building** : New memories connect to existing knowledge
  4. **Smart Retrieval** : Only the most relevant memories are included in context



Memories are shared between the Memory Router and Memory API when using the same `user_id`, allowing you to use both together.

## 

​

Response Headers

The Memory Router adds diagnostic headers to help you understand what’s happening: Header| Description  
---|---  
`x-supermemory-conversation-id`| Unique conversation identifier  
`x-supermemory-context-modified`| Whether context was modified (`true`/`false`)  
`x-supermemory-tokens-processed`| Number of tokens processed  
`x-supermemory-chunks-created`| New memory chunks created  
`x-supermemory-chunks-retrieved`| Memory chunks added to context  
  
## 

​

Error Handling

The Memory Router is designed for reliability:

  * **Automatic Fallback** : If Supermemory encounters an error, your request passes through unmodified
  * **Error Headers** : `x-supermemory-error` header provides error details
  * **Zero Downtime** : Your application continues working even if memory features are unavailable



## 

​

Rate Limits & Pricing

### 

​

Rate Limits

  * No Supermemory-specific rate limits
  * Subject only to your LLM provider’s limits



### 

​

Pricing

  * **Free Tier** : 100k tokens stored at no cost
  * **Standard Plan** : $20/month after free tier
  * **Usage-Based** : Each conversation includes 20k free tokens, then $1 per million tokens



Was this page helpful?

YesNo

[Use Cases](/docs/overview/use-cases)[Usage](/docs/memory-router/usage)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
