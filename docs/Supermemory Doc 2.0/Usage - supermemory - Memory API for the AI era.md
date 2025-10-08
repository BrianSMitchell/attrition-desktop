# Usage - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-router/usage
**Scraped:** 2025-10-08 18:00:15

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory Router

Usage

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

  * Prerequisites
  * Basic Setup
  * Provider URLs
  * Implementation Examples
  * Alternative: URL Parameters
  * Conversation Management
  * Managing Conversations
  * User Identification



Add unlimited memory to your LLM applications with just a URL change.

## 

​

Prerequisites

You’ll need:

  1. A [Supermemory API key](https://console.supermemory.ai)
  2. Your LLM provider’s API key



## 

​

Basic Setup

1

Get Your API Keys

**Supermemory API Key:**

  1. Sign up at [console.supermemory.ai](https://console.supermemory.ai)
  2. Navigate to **API Keys** → **Create API Key**
  3. Copy your key

**Provider API Key:**

  * [OpenAI](https://platform.openai.com/api-keys)
  * [Anthropic](https://console.anthropic.com/settings/keys)
  * [Google Gemini](https://aistudio.google.com/app/apikey)
  * [Groq](https://console.groq.com/keys)



2

Update Your Base URL

Prepend `https://api.supermemory.ai/v3/` to your provider’s URL:

Copy

Ask AI
    
    
    https://api.supermemory.ai/v3/[PROVIDER_URL]
    

3

Add Authentication

Include both API keys in your requests (see examples below)

## 

​

Provider URLs

OpenAI

Anthropic

Google Gemini

Groq

Copy

Ask AI
    
    
    https://api.supermemory.ai/v3/https://api.openai.com/v1/
    

## 

​

Implementation Examples

  * Python

  * TypeScript

  * cURL




Copy

Ask AI
    
    
    from openai import OpenAI
    
    client = OpenAI(
        api_key="YOUR_OPENAI_API_KEY",
        base_url="https://api.supermemory.ai/v3/https://api.openai.com/v1/",
        default_headers={
            "x-supermemory-api-key": "YOUR_SUPERMEMORY_API_KEY",
            "x-sm-user-id": "user123"  # Unique user identifier
        }
    )
    
    # Use as normal
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[
            {"role": "user", "content": "Hello!"}
        ]
    )
    
    print(response.choices[0].message.content)
    

## 

​

Alternative: URL Parameters

If you can’t modify headers, pass authentication via URL parameters:

Python

TypeScript

cURL

Copy

Ask AI
    
    
    client = OpenAI(
        api_key="YOUR_OPENAI_API_KEY",
        base_url="https://api.supermemory.ai/v3/https://api.openai.com/v1/chat/completions?userId=user123"
    )
    
    # Then set Supermemory API key as environment variable:
    # export SUPERMEMORY_API_KEY="your_key_here"
    

## 

​

Conversation Management

### 

​

Managing Conversations

Use `x-sm-conversation-id` to maintain conversation context across requests:

Copy

Ask AI
    
    
    # Start a new conversation
    response1 = client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": "My name is Alice"}],
        extra_headers={
            "x-sm-conversation-id": "conv_123"
        }
    )
    
    # Continue the same conversation later
    response2 = client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": "What's my name?"}],
        extra_headers={
            "x-sm-conversation-id": "conv_123"
        }
    )
    # Response will remember "Alice"
    

### 

​

User Identification

Always provide a unique user ID to isolate memories between users:

Copy

Ask AI
    
    
    # Different users have separate memory spaces
    client_alice = OpenAI(
        api_key="...",
        base_url="...",
        default_headers={"x-sm-user-id": "alice_123"}
    )
    
    client_bob = OpenAI(
        api_key="...",
        base_url="...",
        default_headers={"x-sm-user-id": "bob_456"}
    )
    

Was this page helpful?

YesNo

[Overview](/docs/memory-router/overview)[Use with Memory API](/docs/memory-router/with-memory-api)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
