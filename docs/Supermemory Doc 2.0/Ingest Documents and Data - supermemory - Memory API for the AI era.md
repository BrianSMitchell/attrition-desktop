# Ingest Documents and Data - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-api/ingesting
**Scraped:** 2025-10-08 18:01:18

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Add Memories

Ingest Documents and Data

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

  * Understanding the Mental Model
  * Documents vs Memories
  * Content Sources
  * Overview
  * How It Works
  * Ingestion Endpoints
  * Add Document - JSON Content
  * Request Parameters
  * Response
  * File Upload: Drop and Process
  * Supported File Types
  * Content Types & Processing
  * Automatic Detection
  * Processing Pipeline
  * Error Handling
  * Common Errors
  * Best Practices
  * Container Tags: Optimize for Performance
  * Custom IDs: Deduplication and Updates
  * Rate Limits & Quotas
  * Batch Upload of Documents
  * Implementation Strategy
  * Best Practices for Batch Operations



Supermemory provides a powerful and flexible ingestion system that can process virtually any type of content. Whether you’re adding simple text notes, web pages, PDFs, images, or complex documents from various platforms, our API handles it all seamlessly.

## 

​

Understanding the Mental Model

Before diving into the API, it’s important to understand how Supermemory processes your content:

### 

​

Documents vs Memories

  * **Documents** : Anything you put into Supermemory (files, URLs, text) is considered a **document**
  * **Memories** : Documents are automatically chunked into smaller, searchable pieces called **memories**

When you use the “Add Memory” endpoint, you’re actually adding a **document**. Supermemory’s job is to intelligently break that document into optimal **memories** that can be searched and retrieved.

Copy

Ask AI
    
    
    Your Content → Document → Processing → Multiple Memories
         ↓             ↓           ↓            ↓
       PDF File → Stored Doc → Chunking → Searchable Memories
    

You can visualize this process in the [Supermemory Console](https://console.supermemory.ai) where you’ll see a graph view showing how your documents are broken down into interconnected memories.

### 

​

Content Sources

Supermemory accepts content through three main methods:

  1. **Direct API** : Upload files or send content via API endpoints
  2. **Connectors** : Automated integrations with platforms like Google Drive, Notion, and OneDrive ([learn more about connectors](/docs/connectors))
  3. **URL Processing** : Automatic extraction from web pages, videos, and social media



## 

​

Overview

The ingestion system consists of several key components:

  * **Multiple Input Methods** : JSON content, file uploads, and URL processing
  * **Asynchronous Processing** : Background workflows handle content extraction and chunking
  * **Auto Content Detection** : Automatically identifies and processes different content types
  * **Space Organization** : Container tags group related memories for better context inference
  * **Status Tracking** : Real-time status updates throughout the processing pipeline



### 

​

How It Works

1

Submit Document

Send your content (text, file, or URL) to create a new document

2

Validation

API validates the request and checks rate limits/quotas

3

Document Storage

Your content is stored as a document and queued for processing

4

Content Extraction

Specialized extractors process the document based on its type

5

Memory Creation

Document is intelligently chunked into multiple searchable memories

6

Embedding & Indexing

Memories are converted to vector embeddings and made searchable

## 

​

Ingestion Endpoints

### 

​

Add Document - JSON Content

The primary endpoint for adding content that will be processed into documents. **Endpoint:** `POST /v3/documents`

Despite the endpoint name, you’re creating a **document** that Supermemory will automatically chunk into searchable **memories**.

cURL

TypeScript

Python

Copy

Ask AI
    
    
    curl https://api.supermemory.ai/v3/documents \
      -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without explicit programming.",
        "containerTags": ["ai-research", "user_123"],
        "metadata": {
          "source": "research-notes",
          "category": "education",
          "priority": "high"
        },
        "customId": "ml-basics-001"
      }'
    

#### 

​

Request Parameters

Parameter| Type| Required| Description  
---|---|---|---  
`content`| string| Yes| The content to process into a document. Can be text, URL, or other supported formats  
`containerTag`| string| No| **Recommended** : Single tag to group related memories in a space. Defaults to `"sm_project_default"`  
`containerTags`| string[]| No| Legacy array format. Use `containerTag` instead for better performance  
`metadata`| object| No| Additional key-value metadata (strings, numbers, booleans only)  
`customId`| string| No| Your own identifier for this document (max 255 characters)  
`raw`| string| No| Raw content to store alongside processed content  
  
#### 

​

Response

When you successfully create a document, you’ll get back a simple confirmation with the document ID and its initial processing status:

Copy

Ask AI
    
    
    {
      "id": "D2Ar7Vo7ub83w3PRPZcaP1",
      "status": "queued"
    }
    

**What this means:**

  * `id`: Your document’s unique identifier - save this to track processing or reference later
  * `status`: Current processing state. `"queued"` means it’s waiting to be processed into memories



The document starts processing immediately in the background. Within seconds to minutes (depending on content size), it will be chunked into searchable memories.

### 

​

File Upload: Drop and Process

Got a PDF, image, or video? Upload it directly and let Supermemory extract the valuable content automatically. **Endpoint:** `POST /v3/documents/file` **What makes this powerful:** Instead of manually copying text from PDFs or transcribing videos, just upload the file. Supermemory handles OCR for images, transcription for videos, and intelligent text extraction for documents.

cURL

TypeScript

Python

Copy

Ask AI
    
    
    curl https://api.supermemory.ai/v3/documents/file \
      -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
      -F "[[email protected]](/cdn-cgi/l/email-protection)" \
      -F "containerTags=research_project"
    
    # Response:
    # {
    #   "id": "Mx7fK9pL2qR5tE8yU4nC7",
    #   "status": "processing"
    # }
    

#### 

​

Supported File Types

  * Documents

  * Media

  * Web Content

  * Text Formats




  * **PDF** : Extracted with OCR support for scanned documents
  * **Google Docs** : Via Google Drive API integration
  * **Google Sheets** : Spreadsheet content extraction
  * **Google Slides** : Presentation content extraction
  * **Notion Pages** : Rich content with block structure preservation
  * **OneDrive Documents** : Microsoft Office documents



## 

​

Content Types & Processing

### 

​

Automatic Detection

Supermemory automatically detects content types based on:

  * **URL patterns** : Domain and path analysis for special services
  * **MIME types** : File type detection from headers/metadata
  * **Content analysis** : Structure and format inspection
  * **File extensions** : Fallback identification method



Copy

Ask AI
    
    
    type MemoryType =
      | 'text'        // Plain text content
      | 'pdf'         // PDF documents
      | 'tweet'       // Twitter/X posts
      | 'google_doc'  // Google Docs
      | 'google_slide'// Google Slides
      | 'google_sheet'// Google Sheets
      | 'image'       // Images with OCR
      | 'video'       // Videos with transcription
      | 'notion_doc'  // Notion pages
      | 'webpage'     // Web pages
      | 'onedrive'    // OneDrive documents
    
    
    
    // Examples of automatic detection
    const examples = {
      "https://twitter.com/user/status/123": "tweet",
      "https://youtube.com/watch?v=abc": "video",
      "https://docs.google.com/document/d/123": "google_doc",
      "https://docs.google.com/spreadsheets/d/123": "google_sheet",
      "https://docs.google.com/presentation/d/123": "google_slide",
      "https://notion.so/page-123": "notion_doc",
      "https://example.com": "webpage",
      "Regular text content": "text",
      // PDF files uploaded → "pdf"
      // Image files uploaded → "image"
      // OneDrive links → "onedrive"
    }
    

### 

​

Processing Pipeline

Each content type follows a specialized processing pipeline:

Text Content

Content is cleaned, normalized, and chunked for optimal retrieval:

  1. **Queued** : Memory enters the processing queue
  2. **Extracting** : Text normalization and cleaning
  3. **Chunking** : Intelligent splitting based on content structure
  4. **Embedding** : Convert to vector representations for search
  5. **Indexing** : Add to searchable index
  6. **Done:** Metadata extraction completed



Web Content

Web pages undergo sophisticated content extraction:

  1. **Queued:** URL queued for processing
  2. **Extracting** : Fetch page content with proper headers, remove navigation and boilerplate, extract title, description, etc.
  3. **Chunking:** Content split for optimal retrieval
  4. **Embedding** : Vector representation generation
  5. **Indexing** : Add to search index
  6. **Done:** Processing complete with `type: 'webpage'`



File Processing

Files are processed through specialized extractors:

  1. **Queued** : File queued for processing
  2. **Content Extraction** : Type detection and format-specific processing.
  3. **OCR/Transcription** : For images and media files
  4. **Chunking:** Content broken down into searchable segments
  5. **Embedding:** Vector representation creation
  6. **Indexing:** Add to search index
  7. **Done:** Processing completed



## 

​

Error Handling

### 

​

Common Errors

Scroll right to see more.

  * Authentication Errors

  * Bad Request Errors (400)

  * Rate Limiting (429)

  * Not Found Errors (404)

  * Permission Denied (403)

  * Server Errors (500+)

  * Network Errors




Copy

Ask AI
    
    
    // AuthenticationError class
    {
      name: "AuthenticationError",
      status: 401,
      message: "401 Unauthorized",
      error: {
        message: "Invalid API key",
        type: "authentication_error"
      }
    }
    

**Causes:**

  * Missing or invalid API key
  * Expired authentication token
  * Incorrect authorization header format



## 

​

Best Practices

### 

​

Container Tags: Optimize for Performance

Use single container tags for better query performance. Multiple tags are supported but increase latency.

Copy

Ask AI
    
    
    {
      "content": "Updated authentication flow to use JWT tokens",
      "containerTags": "[project_alpha]",
      "metadata": {
        "type": "technical_change",
        "author": "sarah_dev",
        "impact": "breaking"
      }
    }
    

**Single vs Multiple Tags**

Copy

Ask AI
    
    
    // ✅ Recommended: Single tag, faster queries
    { "containerTags": ["project_alpha"] }
    
    // ⚠️ Allowed but slower: Multiple tags increase latency
    { "containerTags": ["project_alpha", "auth", "backend"] }
    

**Why single tags perform better:**

  * Memories in the same space can reference each other efficiently
  * Search queries don’t need to traverse multiple spaces
  * Connection inference is faster within a single space



### 

​

Custom IDs: Deduplication and Updates

Custom IDs prevent duplicates and enable document updates. Two update methods available. **Method 1: POST with customId (Upsert)**

Copy

Ask AI
    
    
    # Create document
    curl -X POST "https://api.supermemory.ai/v3/documents" \
      -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "API uses REST endpoints",
        "customId": "api_docs_v1",
        "containerTags": ["project_alpha"]
      }'
    # Response: {"id": "abc123", "status": "queued"}
    
    # Update same document (same customId = upsert)
    curl -X POST "https://api.supermemory.ai/v3/documents" \
      -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "API migrated to GraphQL",
        "customId": "api_docs_v1",
        "containerTags": ["project_alpha"]
      }'
    

**Method 2: PATCH by ID (Update)**

Copy

Ask AI
    
    
    curl -X PATCH "https://api.supermemory.ai/v3/documents/abc123" \
      -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "API now uses GraphQL with caching",
        "metadata": {"version": 3}
      }'
    

**Custom ID Patterns**

Copy

Ask AI
    
    
    // External system sync
    "jira_PROJ_123"
    "confluence_456789"
    "github_issue_987"
    
    // Database entities
    "user_profile_12345"
    "order_67890"
    
    // Versioned content
    "meeting_2024_01_15"
    "api_docs_auth"
    "requirements_v3"
    

**Update Behavior**

  * Old memories are deleted
  * New memories created from updated content
  * Same document ID maintained



### 

​

Rate Limits & Quotas

**Token Usage**

Copy

Ask AI
    
    
    "Hello world" // ≈ 2 tokens
    "10-page PDF" // ≈ 2,000-4,000 tokens
    "YouTube video (10 min)" // ≈ 1,500-3,000 tokens
    "Web article" // ≈ 500-2,000 tokens
    

**Current Limits** Feature| Free| Starter| Growth  
---|---|---|---  
Memory Tokens/month| 100,000| 1,000,000| 10,000,000  
Search Queries/month| 1,000| 10,000| 100,000  
**Limit Exceeded Response**

Copy

Ask AI
    
    
    curl -X POST "https://api.supermemory.ai/v3/documents" \
      -H "Authorization: Bearer your_api_key" \
      -d '{"content": "Some content"}'
    

Response:

Copy

Ask AI
    
    
    {"error": "Memory token limit reached", "status": 402}
    

## 

​

Batch Upload of Documents

Process large volumes efficiently with rate limiting and error recovery.

### 

​

Implementation Strategy

  * TypeScript

  * Python




Copy

Ask AI
    
    
    import Supermemory, {
      BadRequestError,
      RateLimitError,
      AuthenticationError
    } from 'supermemory';
    
    interface Document {
      id: string;
      content: string;
      title?: string;
      createdAt?: string;
      metadata?: Record<string, string | number | boolean>;
    }
    
    async function batchIngest(documents: Document[], options = {}) {
      const {
        batchSize = 5,
        delayBetweenBatches = 2000,
        maxRetries = 3
      } = options;
    
      const results = [];
    
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(documents.length/batchSize)}`);
    
        const batchResults = await Promise.allSettled(
          batch.map(doc => ingestWithRetry(doc, maxRetries))
        );
    
        results.push(...batchResults);
    
        // Rate limiting between batches
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
      }
    
      return results;
    }
    
    async function ingestWithRetry(doc: Document, maxRetries: number) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await client.memories.add({
            content: doc.content,
            customId: doc.id,
            containerTags: ["batch_import_user_123"], // CORRECTED: Array
            metadata: {
              source: "migration",
              batch_id: generateBatchId(),
              original_created: doc.createdAt || new Date().toISOString(),
              title: doc.title || "",
              ...doc.metadata
            }
          });
        } catch (error) {
          // CORRECTED: Proper error handling
          if (error instanceof AuthenticationError) {
            console.error('Authentication failed - check API key');
            throw error; // Don't retry auth errors
          }
    
          if (error instanceof BadRequestError) {
            console.error('Invalid document format:', doc.id);
            throw error; // Don't retry validation errors
          }
    
          if (error instanceof RateLimitError) {
            console.log(`Rate limited on attempt ${attempt}, waiting longer...`);
            const delay = Math.pow(2, attempt) * 2000; // Longer delays for rate limits
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
    
          if (attempt === maxRetries) throw error;
    
          // Exponential backoff for other errors
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retry ${attempt}/${maxRetries} for ${doc.id} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    function generateBatchId(): string {
      return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    

### 

​

Best Practices for Batch Operations

Performance Optimization

  * **Batch Size** : 3-5 documents at once
  * **Delays** : 2-3 seconds between batches prevents rate limiting
  * **Promise.allSettled()** : Handles mixed success/failure results
  * **Progress Tracking** : Monitor long-running operations

**Sample Output**

Copy

Ask AI
    
    
    Processing batch 1/50 (documents 1-3)
    Successfully processed: 2/3 documents
    Failed: 1/3 documents (BadRequestError: Invalid content)
    Progress: 3/150 (2.0%) - Next batch in 2s
    

Error Handling

  * **Specific Error Types:** Handle `BadRequestError`, `RateLimitError`, `AuthenticationError` differently
  * **No Retry Logic** : Don’t retry validation or auth errors
  * **Rate Limit Handling** : Longer backoff delays for rate limit errors
  * **Logging** : Record failures for review/retry



Memory Management

  * **Streaming** : Process large files in chunks
  * **Cleanup** : Clear processed batches from memory
  * **Progress Persistence** : Resume interrupted migrations



Ready to start ingesting? [Get an API key](https://console.supermemory.ai) now!

Was this page helpful?

YesNo

[Parameters](/docs/add-memories/parameters)[Basic Usage](/docs/add-memories/examples/basic)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
