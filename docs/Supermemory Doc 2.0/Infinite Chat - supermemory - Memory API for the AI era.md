# Infinite Chat - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/ai-sdk/infinite-chat
**Scraped:** 2025-10-08 18:00:29

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

AI SDK

Infinite Chat

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

  * Setup
  * Provider Configuration
  * Named Providers
  * Custom Provider URL
  * Example Usage
  * Configuration Options
  * Custom Headers
  * Comparison with Memory Tools
  * Headers
  * Comparison
  * Next Steps



Infinite Chat provides unlimited context for chat applications with automatic memory management.

## 

​

Setup

Copy

Ask AI
    
    
    import { streamText } from "ai"
    
    const infiniteChat = createAnthropic({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    
    const result = await streamText({
      model: infiniteChat("claude-3-sonnet"),
      messages: [
        { role: "user", content: "Hello! Remember that I love TypeScript." }
      ]
    })
    

## 

​

Provider Configuration

### 

​

Named Providers

OpenAI

Anthropic

Google

Groq

Copy

Ask AI
    
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    
    const result = await streamText({
      model: infiniteChat("gpt-5"),
      messages: [...]
    })
    

### 

​

Custom Provider URL

Copy

Ask AI
    
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    

## 

​

Example Usage

Copy

Ask AI
    
    
    import { streamText } from "ai"
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    
    const result = await streamText({
      model: infiniteChat("gpt-5"),
      messages: [
        { role: "user", content: "What did we discuss yesterday?" }
      ]
    })
    
    return result.toAIStreamResponse()
    

## 

​

Configuration Options

Copy

Ask AI
    
    
    interface ConfigWithProviderName {
      providerName: 'openai' | 'anthropic' | 'openrouter' |
                    'deepinfra' | 'groq' | 'google' | 'cloudflare'
      providerApiKey: string
      headers?: Record<string, string>
    }
    
    interface ConfigWithProviderUrl {
      providerUrl: string
      providerApiKey: string
      headers?: Record<string, string>
    }
    

### 

​

Custom Headers

Add user IDs, conversation IDs, or other metadata:

Copy

Ask AI
    
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    

## 

​

Comparison with Memory Tools

Feature| Infinite Chat| Memory Tools  
---|---|---  
Memory Management| Automatic| Manual  
Context Handling| Automatic| Manual  
Tool Calls| None| searchMemories, addMemory, fetchMemory  
Best For| Chat apps| AI agents  
Setup Complexity| Simple| Moderate  
  
## 

​

Headers

Add user and conversation context:

Copy

Ask AI
    
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    

## 

​

Comparison

Feature| Infinite Chat| Memory Tools  
---|---|---  
Memory Management| Automatic| Manual  
Context Handling| Automatic| Manual  
Tool Calls| None| searchMemories, addMemory, fetchMemory  
Best For| Chat apps| AI agents  
  
## 

​

Next Steps

## [Memory ToolsExplore explicit memory control](/docs/ai-sdk/memory-tools)## [ExamplesSee complete implementations](/docs/cookbook/ai-sdk-integration)

Was this page helpful?

YesNo

[Memory Tools](/docs/ai-sdk/memory-tools)[NPM link](/docs/ai-sdk/npm)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
