# OpenAI SDK Plugins - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-api/sdks/openai-plugins
**Scraped:** 2025-10-08 18:00:25

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

OpenAI SDK

OpenAI SDK Plugins

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

  * Installation
  * Quick Start
  * Configuration
  * Memory Tools Configuration
  * Available Tools
  * Search Memories
  * Add Memory
  * Fetch Memory
  * Individual Tools
  * Complete Chat Example
  * Error Handling
  * API Reference
  * Python SDK
  * SupermemoryTools
  * execute_memory_tool_calls
  * JavaScript SDK
  * supermemoryTools
  * createToolCallExecutor
  * Environment Variables
  * Development
  * Python Setup
  * JavaScript Setup
  * Next Steps



Add memory capabilities to the official OpenAI SDKs using Supermemory’s function calling tools. These plugins provide seamless integration with OpenAI’s chat completions and function calling features.

## [Supermemory tools on npmCheck out the NPM page for more details](https://www.npmjs.com/package/@supermemory/tools)## [Supermemory AI SDKCheck out the PyPI page for more details](https://pypi.org/project/supermemory-openai-sdk/)

## 

​

Installation

Python

JavaScript/TypeScript

Copy

Ask AI
    
    
    # Using uv (recommended)
    uv add supermemory-openai-sdk
    
    # Or with pip
    pip install supermemory-openai-sdk
    

## 

​

Quick Start

Python SDK

JavaScript/TypeScript SDK

Copy

Ask AI
    
    
    import asyncio
    import openai
    from supermemory_openai import SupermemoryTools, execute_memory_tool_calls
    
    async def main():
        # Initialize OpenAI client
        client = openai.AsyncOpenAI(api_key="your-openai-api-key")
    
        # Initialize Supermemory tools
        tools = SupermemoryTools(
            api_key="your-supermemory-api-key",
            config={"project_id": "my-project"}
        )
    
        # Chat with memory tools
        response = await client.chat.completions.create(
            model="gpt-5",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant with access to user memories."
                },
                {
                    "role": "user",
                    "content": "Remember that I prefer tea over coffee"
                }
            ],
            tools=tools.get_tool_definitions()
        )
    
        # Handle tool calls if present
        if response.choices[0].message.tool_calls:
            tool_results = await execute_memory_tool_calls(
                api_key="your-supermemory-api-key",
                tool_calls=response.choices[0].message.tool_calls,
                config={"project_id": "my-project"}
            )
            print("Tool results:", tool_results)
    
        print(response.choices[0].message.content)
    
    asyncio.run(main())
    

## 

​

Configuration

### 

​

Memory Tools Configuration

Python Configuration

JavaScript Configuration

Copy

Ask AI
    
    
    from supermemory_openai import SupermemoryTools
    
    tools = SupermemoryTools(
        api_key="your-supermemory-api-key",
        config={
            "project_id": "my-project",  # or use container_tags
            "base_url": "https://custom-endpoint.com",  # optional
        }
    )
    

## 

​

Available Tools

### 

​

Search Memories

Search through user memories using semantic search:

Python

JavaScript

Copy

Ask AI
    
    
    # Search memories
    result = await tools.search_memories(
        information_to_get="user preferences",
        limit=10,
        include_full_docs=True
    )
    print(f"Found {len(result.memories)} memories")
    

### 

​

Add Memory

Store new information in memory:

Python

JavaScript

Copy

Ask AI
    
    
    # Add memory
    result = await tools.add_memory(
        memory="User prefers tea over coffee"
    )
    print(f"Added memory with ID: {result.memory.id}")
    

### 

​

Fetch Memory

Retrieve specific memory by ID:

Python

JavaScript

Copy

Ask AI
    
    
    # Fetch specific memory
    result = await tools.fetch_memory(
        memory_id="memory-id-here"
    )
    print(f"Memory content: {result.memory.content}")
    

## 

​

Individual Tools

Use tools separately for more granular control:

Python Individual Tools

JavaScript Individual Tools

Copy

Ask AI
    
    
    from supermemory_openai import (
        create_search_memories_tool,
        create_add_memory_tool,
        create_fetch_memory_tool
    )
    
    search_tool = create_search_memories_tool("your-api-key")
    add_tool = create_add_memory_tool("your-api-key")
    fetch_tool = create_fetch_memory_tool("your-api-key")
    
    # Use individual tools in OpenAI function calling
    tools_list = [search_tool, add_tool, fetch_tool]
    

## 

​

Complete Chat Example

Here’s a complete example showing a multi-turn conversation with memory:

Complete Python Example

Complete JavaScript Example

Copy

Ask AI
    
    
    import asyncio
    import openai
    from supermemory_openai import SupermemoryTools, execute_memory_tool_calls
    
    async def chat_with_memory():
        client = openai.AsyncOpenAI()
        tools = SupermemoryTools(
            api_key="your-supermemory-api-key",
            config={"project_id": "chat-example"}
        )
    
        messages = [
            {
                "role": "system",
                "content": """You are a helpful assistant with memory capabilities.
                When users share personal information, remember it using addMemory.
                When they ask questions, search your memories to provide personalized responses."""
            }
        ]
    
        while True:
            user_input = input("You: ")
            if user_input.lower() == 'quit':
                break
    
            messages.append({"role": "user", "content": user_input})
    
            # Get AI response with tools
            response = await client.chat.completions.create(
                model="gpt-5",
                messages=messages,
                tools=tools.get_tool_definitions()
            )
    
            # Handle tool calls
            if response.choices[0].message.tool_calls:
                messages.append(response.choices[0].message)
    
                tool_results = await execute_memory_tool_calls(
                    api_key="your-supermemory-api-key",
                    tool_calls=response.choices[0].message.tool_calls,
                    config={"project_id": "chat-example"}
                )
    
                messages.extend(tool_results)
    
                # Get final response after tool execution
                final_response = await client.chat.completions.create(
                    model="gpt-5",
                    messages=messages
                )
    
                assistant_message = final_response.choices[0].message.content
            else:
                assistant_message = response.choices[0].message.content
                messages.append({"role": "assistant", "content": assistant_message})
    
            print(f"Assistant: {assistant_message}")
    
    # Run the chat
    asyncio.run(chat_with_memory())
    

## 

​

Error Handling

Handle errors gracefully in your applications:

Python Error Handling

JavaScript Error Handling

Copy

Ask AI
    
    
    from supermemory_openai import SupermemoryTools
    import openai
    
    async def safe_chat():
        try:
            client = openai.AsyncOpenAI()
            tools = SupermemoryTools(api_key="your-api-key")
    
            response = await client.chat.completions.create(
                model="gpt-5",
                messages=[{"role": "user", "content": "Hello"}],
                tools=tools.get_tool_definitions()
            )
    
        except openai.APIError as e:
            print(f"OpenAI API error: {e}")
        except Exception as e:
            print(f"Unexpected error: {e}")
    

## 

​

API Reference

### 

​

Python SDK

#### 

​

`SupermemoryTools`

**Constructor**

Copy

Ask AI
    
    
    SupermemoryTools(
        api_key: str,
        config: Optional[SupermemoryToolsConfig] = None
    )
    

**Methods**

  * `get_tool_definitions()` \- Get OpenAI function definitions
  * `search_memories(information_to_get, limit, include_full_docs)` \- Search user memories
  * `add_memory(memory)` \- Add new memory
  * `fetch_memory(memory_id)` \- Fetch specific memory by ID
  * `execute_tool_call(tool_call)` \- Execute individual tool call



#### 

​

`execute_memory_tool_calls`

Copy

Ask AI
    
    
    execute_memory_tool_calls(
        api_key: str,
        tool_calls: List[ToolCall],
        config: Optional[SupermemoryToolsConfig] = None
    ) -> List[dict]
    

### 

​

JavaScript SDK

#### 

​

`supermemoryTools`

Copy

Ask AI
    
    
    supermemoryTools(
      apiKey: string,
      config?: { projectId?: string; baseUrl?: string }
    )
    

#### 

​

`createToolCallExecutor`

Copy

Ask AI
    
    
    createToolCallExecutor(
      apiKey: string,
      config?: { projectId?: string; baseUrl?: string }
    ) -> (toolCall: OpenAI.Chat.ChatCompletionMessageToolCall) => Promise<any>
    

## 

​

Environment Variables

Set these environment variables:

Copy

Ask AI
    
    
    SUPERMEMORY_API_KEY=your_supermemory_key
    OPENAI_API_KEY=your_openai_key
    SUPERMEMORY_BASE_URL=https://custom-endpoint.com  # optional
    

## 

​

Development

### 

​

Python Setup

Copy

Ask AI
    
    
    # Install uv
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Setup project
    git clone <repository-url>
    cd packages/openai-sdk-python
    uv sync --dev
    
    # Run tests
    uv run pytest
    
    # Type checking
    uv run mypy src/supermemory_openai
    
    # Formatting
    uv run black src/ tests/
    uv run isort src/ tests/
    

### 

​

JavaScript Setup

Copy

Ask AI
    
    
    # Install dependencies
    npm install
    
    # Run tests
    npm test
    
    # Type checking
    npm run type-check
    
    # Linting
    npm run lint
    

## 

​

Next Steps

## [AI SDK IntegrationUse with Vercel AI SDK for streamlined development](/docs/ai-sdk/overview)## [Memory APIDirect API access for advanced memory management](/docs/memory-api/overview)

Was this page helpful?

YesNo

[`supermemory` on pypi](/docs/memory-api/sdks/supermemory-pypi)[NPM link](/docs/ai-sdk/npm)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
