# Use with Memory API - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-router/with-memory-api
**Scraped:** 2025-10-08 18:00:16

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory Router

Use with Memory API

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

  * How They Work Together
  * Shared Memory Pool
  * Pre-load Context via API
  * Best Practices
  * 1\. Consistent User IDs
  * 2\. Use Container Tags for Organization
  * 3\. Leverage Each System’s Strengths



The Memory Router and Memory API share the same memory pool. When you use the same `user_id`, memories are automatically shared between both systems.

## 

​

How They Work Together

**Key Insight** : Both the Router and API access the same memories when using identical `user_id` values. This enables powerful hybrid implementations.

### 

​

Shared Memory Pool

Copy

Ask AI
    
    
    # Memory created via API
    from supermemory import Client
    
    api_client = Client(api_key="YOUR_SUPERMEMORY_KEY")
    
    # Add memory via API
    api_client.memories.add({
        "content": "User prefers Python over JavaScript for backend development",
        "user_id": "user123"
    })
    
    # Later, in your chat application using Router
    from openai import OpenAI
    
    router_client = OpenAI(
        api_key="YOUR_OPENAI_KEY",
        base_url="https://api.supermemory.ai/v3/https://api.openai.com/v1/",
        default_headers={
            "x-supermemory-api-key": "YOUR_SUPERMEMORY_KEY",
            "x-sm-user-id": "user123"  # Same user_id
        }
    )
    
    # Router automatically has access to the API-created memory
    response = router_client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": "What language should I use for my new backend?"}]
    )
    # Response will consider the Python preference
    

## 

​

Pre-load Context via API

Use the API to add documents and context before conversations:

Copy

Ask AI
    
    
    # Step 1: Load user's documents via API
    api_client.memories.add({
        "content": "https://company.com/product-docs.pdf",
        "user_id": "support_agent_123",
        "metadata": {"type": "product_documentation"}
    })
    
    # Step 2: Support agent uses chat with Router
    router_client = OpenAI(
        base_url="https://api.supermemory.ai/v3/https://api.openai.com/v1/",
        default_headers={"x-sm-user-id": "support_agent_123"}
    )
    
    # Agent has automatic access to product docs
    response = router_client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "user", "content": "How does the enterprise pricing work?"}]
    )
    

## 

​

Best Practices

### 

​

1\. Consistent User IDs

Always use the same `user_id` format across both systems:

Copy

Ask AI
    
    
    # ✅ Good - consistent user_id
    api_client.memories.add({"user_id": "user_123"})
    router_headers = {"x-sm-user-id": "user_123"}
    
    # ❌ Bad - inconsistent user_id
    api_client.memories.add({"user_id": "user-123"})
    router_headers = {"x-sm-user-id": "user_123"}  # Different format!
    

### 

​

2\. Use Container Tags for Organization

Copy

Ask AI
    
    
    # API: Add memories with tags
    api_client.memories.add({
        "content": "Q3 revenue report",
        "user_id": "analyst_1",
        "containerTag": "financial_reports"
    })
    
    # Router: Memories are automatically organized
    # The Router will intelligently retrieve from the right containers
    

### 

​

3\. Leverage Each System’s Strengths

Use Case| Best Choice| Why  
---|---|---  
Chat conversations| Router| Automatic context management  
Document upload| API| Batch processing, custom IDs  
Search & filter| API| Advanced query capabilities  
Quick prototypes| Router| Zero code changes  
Memory management| API| Full CRUD operations  
  
Was this page helpful?

YesNo

[Usage](/docs/memory-router/usage)[From Mem0](/docs/migration/from-mem0)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
