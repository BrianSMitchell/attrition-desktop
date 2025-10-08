# Migrating from Mem0.ai to Supermemory - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/migration/from-mem0
**Scraped:** 2025-10-08 18:00:17

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Migration Guides

Migrating from Mem0.ai to Supermemory

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

  * Why Migrate to Supermemory?
  * Quick Migration (All-in-One)
  * Step-by-Step Migration
  * Option 1: Export via Dashboard (Recommended)
  * Option 2: Export via API
  * API Migration Reference
  * Adding Memories
  * Searching Memories
  * Getting All Memories
  * Deleting Memories
  * Using Memory Router (Easiest Migration)
  * Next Steps



Migrating from Mem0.ai to Supermemory is straightforward. This guide walks you through exporting your memories from Mem0 and importing them into Supermemory.

## 

​

Why Migrate to Supermemory?

Supermemory offers enhanced capabilities over Mem0.ai:

  * **Memory Router** for zero-code LLM integration
  * **Knowledge graph** architecture for better context relationships
  * **Multiple content types** (URLs, PDFs, images, videos)
  * **Generous free tier** (100k tokens) with affordable pricing
  * **Multiple integration options** (API, Router, MCP, SDKs)



## 

​

Quick Migration (All-in-One)

Complete migration in one script:

Copy

Ask AI
    
    
    from mem0 import MemoryClient
    from supermemory import Supermemory
    import json, time
    
    # Export from Mem0
    mem0 = MemoryClient(api_key="your_mem0_api_key")
    export = mem0.create_memory_export(
        schema={"type": "object", "properties": {"memories": {"type": "array", "items": {"type": "object"}}}},
        filters={}
    )
    time.sleep(5)
    data = mem0.get_memory_export(memory_export_id=export["id"])
    
    # Import to Supermemory
    supermemory = Supermemory(api_key="your_supermemory_api_key")
    for memory in data["memories"]:
        if memory.get("content"):
            supermemory.memories.add(
                content=memory["content"],
                container_tags=["imported_from_mem0"]
            )
            print(f"✅ {memory['content'][:50]}...")
    
    print("Migration complete!")
    

## 

​

Step-by-Step Migration

1

Export from Mem0.ai

Mem0 provides two ways to export your memories:

### 

​

Option 1: Export via Dashboard (Recommended)

  1. Log into your [Mem0 dashboard](https://app.mem0.ai)
  2. Navigate to the export section
  3. Download your memories as JSON



### 

​

Option 2: Export via API

Simple script to export all your memories from Mem0:

Copy

Ask AI
    
    
    from mem0 import MemoryClient
    import json
    import time
    
    # Connect to Mem0
    client = MemoryClient(api_key="your_mem0_api_key")
    
    # Create export job
    schema = {
        "type": "object",
        "properties": {
            "memories": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "string"},
                        "content": {"type": "string"},
                        "metadata": {"type": "object"},
                        "created_at": {"type": "string"}
                    }
                }
            }
        }
    }
    
    response = client.create_memory_export(schema=schema, filters={})
    export_id = response["id"]
    
    # Wait and retrieve
    print("Exporting memories...")
    time.sleep(5)
    export_data = client.get_memory_export(memory_export_id=export_id)
    
    # Save to file
    with open("mem0_export.json", "w") as f:
        json.dump(export_data, f, indent=2)
    
    print(f"Exported {len(export_data['memories'])} memories")
    

2

Set Up Supermemory

Create your Supermemory account and get your API key:

  1. Sign up at [console.supermemory.ai](https://console.supermemory.ai)
  2. Create a new project
  3. Generate an API key from the dashboard



Copy

Ask AI
    
    
    # Set your environment variable
    export SUPERMEMORY_API_KEY="your_supermemory_api_key"
    

3

Import to Supermemory

Simple script to import your Mem0 memories into Supermemory:

Copy

Ask AI
    
    
    import json
    from supermemory import Supermemory
    
    # Load your Mem0 export
    with open("mem0_export.json", "r") as f:
        mem0_data = json.load(f)
    
    # Connect to Supermemory
    client = Supermemory(api_key="your_supermemory_api_key")
    
    # Import memories
    for memory in mem0_data["memories"]:
        content = memory.get("content", "")
    
        # Skip empty memories
        if not content:
            continue
    
        # Import to Supermemory
        try:
            result = client.memories.add(
                content=content,
                container_tags=["imported_from_mem0"],
                metadata={
                    "source": "mem0",
                    "created_at": memory.get("created_at"),
                    **(memory.get("metadata") or {})
                }
            )
            print(f"Imported: {content[:50]}...")
        except Exception as e:
            print(f"Failed: {e}")
    
    print("Migration complete!")
    

## 

​

API Migration Reference

Here’s how common Mem0.ai operations map to Supermemory:

### 

​

Adding Memories

Mem0.ai

Supermemory

Copy

Ask AI
    
    
    from mem0 import MemoryClient
    
    client = MemoryClient(api_key="...")
    client.add(
        messages="User prefers dark mode",
        user_id="alice"
    )
    

### 

​

Searching Memories

Mem0.ai

Supermemory

Copy

Ask AI
    
    
    results = client.search(
        query="user preferences",
        user_id="alice"
    )
    

### 

​

Getting All Memories

Mem0.ai

Supermemory

Copy

Ask AI
    
    
    memories = client.get_all(
        user_id="alice"
    )
    

### 

​

Deleting Memories

Mem0.ai

Supermemory

Copy

Ask AI
    
    
    client.delete(memory_id="mem_123")
    

## 

​

Using Memory Router (Easiest Migration)

For the simplest migration path, use Supermemory’s Memory Router which requires minimal code changes:

Before (Mem0 + OpenAI)

After (Supermemory Router)

Copy

Ask AI
    
    
    from openai import OpenAI
    from mem0 import MemoryClient
    
    # Two separate clients needed
    openai = OpenAI(api_key="sk-...")
    memory = MemoryClient(api_key="mem0_key")
    
    # Manual memory management
    context = memory.search("user preferences", user_id="alice")
    messages = [
        {"role": "system", "content": f"Context: {context}"},
        {"role": "user", "content": "What are my preferences?"}
    ]
    
    response = openai.chat.completions.create(
        model="gpt-5",
        messages=messages
    )
    

For enterprise migrations, [contact us](/cdn-cgi/l/email-protection#72161a0013040b133201070217001f171f1d000b5c111d1f) for assistance.

## 

​

Next Steps

  1. [Explore](/docs/how-it-works) how Supermemory works
  2. Read the [quickstart](/docs/quickstart) and add and retrieve your first memories
  3. [Connect](/docs/connectors/overview) to Google Drive, Notion, and OneDrive with automatic syncing



Was this page helpful?

YesNo

[Use with Memory API](/docs/memory-router/with-memory-api)[Self Hosting](/docs/deployment/self-hosting)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
