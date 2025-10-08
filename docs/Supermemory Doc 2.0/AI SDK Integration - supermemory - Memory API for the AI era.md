# AI SDK Integration - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/cookbook/ai-sdk-integration
**Scraped:** 2025-10-08 18:01:02

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Quick Start Recipes

AI SDK Integration

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [Cookbook](/docs/cookbook/overview)


  * [Overview](/docs/cookbook/overview)



##### Quick Start Recipes

  * [Personal AI Assistant](/docs/cookbook/personal-assistant)
  * [Document Q&A System](/docs/cookbook/document-qa)
  * [Customer Support Bot](/docs/cookbook/customer-support)
  * [AI SDK Integration](/docs/cookbook/ai-sdk-integration)
  * [Perplexity with memory](https://supermemory.ai/blog/build-your-own-perplexity-in-15-minutes-with-supermemory/)
  * [Chat with Google Drive](https://supermemory.ai/blog/building-an-ai-compliance-chatbot-with-supermemory-and-google-drive/)
  * [Extending context windows in LLMs](https://supermemory.ai/blog/extending-context-windows-in-llms/)



On this page

  * Personal Assistant with Memory Tools
  * Customer Support with Context
  * Infinite Chat for Documentation
  * Multi-User Learning Assistant
  * Research Assistant with File Processing
  * Code Assistant with Project Memory
  * Advanced: Custom Tool Integration
  * Environment Setup
  * Best Practices
  * Memory Tools
  * Infinite Chat
  * General Tips
  * Next Steps



This page provides comprehensive examples of using Supermemory with the Vercel AI SDK, covering both Memory Tools and Infinite Chat approaches.

## 

​

Personal Assistant with Memory Tools

Build an AI assistant that remembers user preferences and past interactions:

Next.js API Route

Client Component

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createAnthropic } from '@ai-sdk/anthropic'
    import { supermemoryTools } from '@supermemory/tools/ai-sdk'
    
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { messages } = await request.json()
    
      const result = await streamText({
        model: anthropic('claude-3-sonnet-20240229'),
        messages,
        tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!),
        system: `You are a helpful personal assistant. When users share information about themselves,
        remember it using the addMemory tool. When they ask questions, search your memories to provide
        personalized responses. Always be proactive about remembering important details.`
      })
    
      return result.toAIStreamResponse()
    }
    

**Example conversation:**

  * User: “I’m allergic to peanuts and I love Italian food”
  * AI: _Uses addMemory tool_ “I’ve remembered that you’re allergic to peanuts and love Italian food!”
  * User: “Suggest a restaurant for dinner”
  * AI: _Uses searchMemories tool_ “Based on what I know about you, I’d recommend an Italian restaurant that’s peanut-free…”



## 

​

Customer Support with Context

Build a customer support system that remembers customer history:

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createOpenAI } from '@ai-sdk/openai'
    import { supermemoryTools } from '@supermemory/tools/ai-sdk'
    
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { messages, customerId } = await request.json()
    
      const result = await streamText({
        model: openai('gpt-5'),
        messages,
        tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
          containerTags: [customerId]
        }),
        system: `You are a customer support agent. Before responding to any query:
        1. Search for the customer's previous interactions and issues
        2. Remember any new information shared in this conversation
        3. Provide personalized help based on their history
        4. Always be empathetic and solution-focused`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Infinite Chat for Documentation

Create a documentation assistant with unlimited context:

Documentation Chat

Upload Documentation

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    
    const infiniteChat = createOpenAI({
      baseUrl: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
      apiKey: 'your-provider-api-key',
      headers: {
        'x-supermemory-api-key': 'supermemory-api-key',
        'x-sm-conversation-id': 'conversation-id'
      }
    })
    
    export async function POST(request: Request) {
      const { messages } = await request.json()
    
      const result = await streamText({
        model: infiniteChat('gpt-5'),
        messages,
        system: `You are a documentation assistant. You have access to all previous
        conversations and can reference earlier discussions. Help users understand
        the documentation by building on previous context.`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Multi-User Learning Assistant

Build an assistant that learns from multiple users but keeps data separate:

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createAnthropic } from '@ai-sdk/anthropic'
    import { supermemoryTools } from '@supermemory/tools/ai-sdk'
    
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { messages, userId, courseId } = await request.json()
    
      const result = await streamText({
        model: anthropic('claude-3-haiku-20240307'),
        messages,
        tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
          containerTags: [userId]
        }),
        system: `You are a learning assistant. Help students with their coursework by:
        1. Remembering their learning progress and struggles
        2. Searching for relevant information from their past sessions
        3. Providing personalized explanations based on their learning style
        4. Tracking topics they've mastered vs topics they need more help with`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Research Assistant with File Processing

Combine file upload with memory tools for research assistance:

API Route

File Upload Handler

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createOpenAI } from '@ai-sdk/openai'
    import { supermemoryTools } from '@supermemory/tools/ai-sdk'
    
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { messages, projectId } = await request.json()
    
      const result = await streamText({
        model: openai('gpt-5'),
        messages,
        tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
          containerTags: [projectId]
        }),
        system: `You are a research assistant. You can:
        1. Search through uploaded research papers and documents
        2. Remember key findings and insights from conversations
        3. Help synthesize information across multiple sources
        4. Track research progress and important discoveries`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Code Assistant with Project Memory

Create a coding assistant that remembers your codebase and preferences:

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createAnthropic } from '@ai-sdk/anthropic'
    import {
      supermemoryTools,
      searchMemoriesTool,
      addMemoryTool
    } from '@supermemory/tools/ai-sdk'
    
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { messages, repositoryId } = await request.json()
    
      const result = await streamText({
        model: anthropic('claude-3-sonnet-20240229'),
        messages,
        tools: {
          // Use individual tools for more control
          searchMemories: searchMemoriesTool(process.env.SUPERMEMORY_API_KEY!, {
            headers: {
            }
          }),
          addMemory: addMemoryTool(process.env.SUPERMEMORY_API_KEY!, {
            headers: {
            }
          }),
          // Add custom tools
          executeCode: {
            description: 'Execute code in a sandbox environment',
            parameters: z.object({
              code: z.string(),
              language: z.string()
            }),
            execute: async ({ code, language }) => {
              // Your code execution logic
              return { result: "Code executed successfully" }
            }
          }
        },
        system: `You are a coding assistant with memory. You can:
        1. Remember coding patterns and preferences from past conversations
        2. Search through previous code examples and solutions
        3. Track project architecture and design decisions
        4. Learn from debugging sessions and common issues`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Advanced: Custom Tool Integration

Combine Supermemory tools with your own custom tools:

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createOpenAI } from '@ai-sdk/openai'
    import { supermemoryTools } from '@supermemory/tools/ai-sdk'
    import { z } from 'zod'
    
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    // Custom tool for calendar integration
    const calendarTool = {
      description: 'Create calendar events',
      parameters: z.object({
        title: z.string(),
        date: z.string(),
        duration: z.number()
      }),
      execute: async ({ title, date, duration }) => {
        // Your calendar API integration
        return { eventId: "cal_123", message: "Event created" }
      }
    }
    
    export async function POST(request: Request) {
      const { messages } = await request.json()
    
      const result = await streamText({
        model: openai('gpt-5'),
        messages,
        tools: {
          // Spread Supermemory tools
          ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!),
          // Add custom tools
          createEvent: calendarTool,
        },
        system: `You are a personal assistant that can remember information and
        manage calendars. When users mention events or appointments:
        1. Remember the details using addMemory
        2. Create calendar events using createEvent
        3. Search for conflicts using searchMemories`
      })
    
      return result.toAIStreamResponse()
    }
    

## 

​

Environment Setup

For all examples, ensure you have these environment variables:

.env.local

Copy

Ask AI
    
    
    SUPERMEMORY_API_KEY=your_supermemory_key
    OPENAI_API_KEY=your_openai_key
    ANTHROPIC_API_KEY=your_anthropic_key
    

## 

​

Best Practices

### 

​

Memory Tools

  * Use descriptive memory content for better search results
  * Include context in your system prompts about when to use each tool
  * Use project headers to separate different use cases
  * Implement error handling for tool failures



### 

​

Infinite Chat

  * Use conversation IDs to maintain separate chat contexts
  * Include user IDs for personalized experiences
  * Test with different providers to find the best fit for your use case
  * Monitor token usage for cost optimization



### 

​

General Tips

  * Start with simple examples and gradually add complexity
  * Use the search functionality to avoid duplicate memories
  * Implement proper authentication for production use
  * Consider rate limiting for high-volume applications



## 

​

Next Steps

## [Memory APIAdvanced memory management with full API control](/docs/memory-api/overview)## [Memory RouterDrop-in proxy for existing LLM applications](/docs/memory-router/overview)

Was this page helpful?

YesNo

[Customer Support Bot](/docs/cookbook/customer-support)[Perplexity with memory](/docs/cookbook/perplexity-supermemory)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
