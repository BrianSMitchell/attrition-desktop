# Parameters - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/add-memories/parameters
**Scraped:** 2025-10-08 18:01:17

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Add Memories

Parameters

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

    * [Overview](/docs/add-memories/overview)
    * [Parameters](/docs/add-memories/parameters)
    * [Ingesting content guide](/docs/memory-api/ingesting)
    * Examples

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

  * Request Parameters
  * Required Parameters
  * Optional Parameters
  * File Upload Parameters
  * Container Tag Patterns
  * Recommended Patterns
  * Performance Considerations



Detailed parameter documentation for adding memories to Supermemory.

## 

​

Request Parameters

### 

​

Required Parameters

​

content

string

required

The content to process into memories. Can be:

  * Plain text content
  * URL to process
  * HTML content
  * Markdown text



Copy

Ask AI
    
    
    {
      "content": "Machine learning is a subset of AI..."
    }
    

**URL Examples:**

Copy

Ask AI
    
    
    {
      "content": "https://youtube.com/watch?v=dQw4w9WgXcQ"
    }
    

### 

​

Optional Parameters

​

containerTag

string

**Recommended.** Single tag to group related memories. Improves search performance.Default: `"sm_project_default"`

Copy

Ask AI
    
    
    {
      "containerTag": "project_alpha"
    }
    

Use `containerTag` (singular) for better performance than `containerTags` (array).

​

metadata

object

Additional metadata as key-value pairs. Values must be strings, numbers, or booleans.

Copy

Ask AI
    
    
    {
      "metadata": {
        "source": "research-paper",
        "author": "John Doe",
        "priority": 1,
        "reviewed": true
      }
    }
    

**Restrictions:**

  * No nested objects
  * No arrays as values
  * Keys must be strings
  * Values: string, number, or boolean only



​

customId

string

Your own identifier for the document. Enables deduplication and updates.**Maximum length:** 255 characters

Copy

Ask AI
    
    
    {
      "customId": "doc_2024_01_research_ml"
    }
    

**Use cases:**

  * Prevent duplicate uploads
  * Update existing documents
  * Sync with external systems



​

raw

string

Raw content to store alongside processed content. Useful for preserving original formatting.

Copy

Ask AI
    
    
    {
      "content": "# Machine Learning\n\nML is a subset of AI...",
      "raw": "# Machine Learning\n\nML is a subset of AI..."
    }
    

## 

​

File Upload Parameters

For `POST /v3/documents/file` endpoint:

​

file

file

required

The file to upload. Supported formats:

  * **Documents:** PDF, DOC, DOCX, TXT, MD
  * **Images:** JPG, PNG, GIF, WebP
  * **Videos:** MP4, WebM, AVI

**Maximum size:** 50MB

​

containerTags

string

Container tag for the uploaded file (sent as form field).

Copy

Ask AI
    
    
    curl -X POST "https://api.supermemory.ai/v3/documents/file" \
      -F "[[email protected]](/cdn-cgi/l/email-protection)" \
      -F "containerTags=research"
    

## 

​

Container Tag Patterns

### 

​

Recommended Patterns

Copy

Ask AI
    
    
    // By user
    "user_123"
    
    // By project
    "project_alpha"
    
    // By organization and type
    "org_456_research"
    
    // By time period
    "2024_q1_reports"
    
    // By data source
    "slack_channel_general"
    

### 

​

Performance Considerations

Copy

Ask AI
    
    
    // ✅ FAST: Single tag
    { "containerTag": "project_alpha" }
    
    // ⚠️ SLOWER: Multiple tags
    { "containerTags": ["project_alpha", "backend", "auth"] }
    
    // ❌ AVOID: Too many tags
    { "containerTags": ["tag1", "tag2", "tag3", "tag4", "tag5"] }
    

Was this page helpful?

YesNo

[Overview](/docs/add-memories/overview)[Ingesting content guide](/docs/memory-api/ingesting)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
