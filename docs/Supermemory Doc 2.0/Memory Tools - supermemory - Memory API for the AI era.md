# Memory Tools - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/ai-sdk/memory-tools
**Scraped:** 2025-10-08 18:00:27

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

AI SDK

Memory Tools

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
  * Available Tools
  * Search Memories
  * Add Memory
  * Fetch Memory
  * Using Individual Tools
  * Tool Results
  * Next Steps



Memory tools allow AI agents to search, add, and fetch memories.

## 

​

Setup

Copy

Ask AI
    
    
    import { streamText } from "ai"
    import { createOpenAI } from "@ai-sdk/openai"
    import { supermemoryTools } from "@supermemory/tools/ai-sdk"
    
    const openai = createOpenAI({
      apiKey: "YOUR_OPENAI_KEY"
    })
    
    const result = await streamText({
      model: openai("gpt-5"),
      prompt: "Remember that my name is Alice",
      tools: supermemoryTools("YOUR_SUPERMEMORY_KEY")
    })
    

## 

​

Available Tools

### 

​

Search Memories

Semantic search through user memories:

Copy

Ask AI
    
    
    const result = await streamText({
      model: openai("gpt-5"),
      prompt: "What are my dietary preferences?",
      tools: supermemoryTools("API_KEY")
    })
    
    // The AI will automatically call searchMemories tool
    // Example tool call:
    // searchMemories({ informationToGet: "dietary preferences and restrictions" })
    

### 

​

Add Memory

Store new information:

Copy

Ask AI
    
    
    const result = await streamText({
      model: anthropic("claude-3-sonnet"),
      prompt: "Remember that I'm allergic to peanuts",
      tools: supermemoryTools("API_KEY")
    })
    
    // The AI will automatically call addMemory tool
    // Example tool call:
    // addMemory({ memory: "User is allergic to peanuts" })
    

### 

​

Fetch Memory

Retrieve specific memory by ID:

Copy

Ask AI
    
    
    const result = await streamText({
      model: openai("gpt-5"),
      prompt: "Get the details of memory abc123",
      tools: supermemoryTools("API_KEY")
    })
    
    // The AI will automatically call fetchMemory tool
    // Example tool call:
    // fetchMemory({ memoryId: "abc123" })
    

## 

​

Using Individual Tools

For more control, import tools separately:

Copy

Ask AI
    
    
    import {
      searchMemoriesTool,
      addMemoryTool,
      fetchMemoryTool
    } from "@supermemory/tools/ai-sdk"
    
    // Use only search tool
    const result = await streamText({
      model: openai("gpt-5"),
      prompt: "What do you know about me?",
      tools: {
        searchMemories: searchMemoriesTool("API_KEY", {
          projectId: "personal"
        })
      }
    })
    
    // Combine with custom tools
    const result = await streamText({
      model: anthropic("claude-3"),
      prompt: "Help me with my calendar",
      tools: {
        searchMemories: searchMemoriesTool("API_KEY"),
        // Your custom tools
        createEvent: yourCustomTool,
        sendEmail: anotherCustomTool
      }
    })
    

## 

​

Tool Results

Each tool returns a result object:

Copy

Ask AI
    
    
    // searchMemories result
    {
      success: true,
      results: [...],  // Array of memories
      count: 5
    }
    
    // addMemory result
    {
      success: true,
      memory: { id: "mem_123", ... }
    }
    
    // fetchMemory result
    {
      success: true,
      memory: { id: "mem_123", content: "...", ... }
    }
    

## 

​

Next Steps

## [Infinite ChatTry automatic memory management](/docs/ai-sdk/infinite-chat)## [ExamplesSee more complete examples](/docs/cookbook/ai-sdk-integration)

Was this page helpful?

YesNo

[Overview](/docs/ai-sdk/overview)[Infinite Chat](/docs/ai-sdk/infinite-chat)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
