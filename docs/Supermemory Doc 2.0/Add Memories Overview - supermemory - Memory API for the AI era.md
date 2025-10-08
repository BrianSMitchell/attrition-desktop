# Add Memories Overview - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/add-memories/overview
**Scraped:** 2025-10-08 18:00:20

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Add Memories

Add Memories Overview

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

  * Quick Start
  * Key Concepts
  * Quick Overview
  * Content Sources
  * Endpoints
  * Add Content
  * Upload File
  * Update Memory
  * Supported Content Types
  * Documents
  * Media
  * Web Content
  * Text Formats
  * Response Format
  * Next Steps



Add any type of content to Supermemory - text, files, URLs, images, videos, and more. Everything is automatically processed into searchable memories that form part of your intelligent knowledge graph.

## 

​

Quick Start

TypeScript

Python

cURL

Copy

Ask AI
    
    
    // Add text content
    const result = await client.memories.add({
      content: "Machine learning enables computers to learn from data",
      containerTag: "ai-research",
      metadata: { priority: "high" }
    });
    
    console.log(result);
    // Output: { id: "abc123", status: "queued" }
    

## 

​

Key Concepts

**New to Supermemory?** Read [How Supermemory Works](/docs/how-it-works) to understand the knowledge graph architecture and the distinction between documents and memories.

### 

​

Quick Overview

  * **Documents** : Raw content you upload (PDFs, URLs, text)
  * **Memories** : Searchable chunks created automatically with relationships
  * **Container Tags** : Group related content for better context
  * **Metadata** : Additional information for filtering



### 

​

Content Sources

Add content through three methods:

  1. **Direct Text** : Send text content directly via API
  2. **File Upload** : Upload PDFs, images, videos for extraction
  3. **URL Processing** : Automatic extraction from web pages and platforms



## 

​

Endpoints

Remember, these endpoints add documents. Memories are inferred by Supermemory.

### 

​

Add Content

`POST /v3/documents` Add text content, URLs, or any supported format.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    await client.memories.add({
      content: "Your content here",
      containerTag: "project"
    });
    

### 

​

Upload File

`POST /v3/documents/file` Upload files directly for processing.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    await client.memories.uploadFile({
      file: fileStream,
      containerTag: "project"
    });
    

### 

​

Update Memory

`PATCH /v3/documents/{id}` Update existing document content.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    await client.memories.update("doc_id", {
      content: "Updated content"
    });
    

## 

​

Supported Content Types

### 

​

Documents

  * PDF with OCR support
  * Google Docs, Sheets, Slides
  * Notion pages
  * Microsoft Office files



### 

​

Media

  * Images (JPG, PNG, GIF, WebP) with OCR



### 

​

Web Content

  * Twitter/X posts
  * YouTube videos with captions



### 

​

Text Formats

  * Plain text
  * Markdown
  * CSV files



Refer to the [connectors guide](/docs/connectors/overview) to learn how you can connect Google Drive, Notion, and OneDrive and sync files in real-time. 

## 

​

Response Format

Copy

Ask AI
    
    
    {
      "id": "D2Ar7Vo7ub83w3PRPZcaP1",
      "status": "queued"
    }
    

  * **`id`** : Unique document identifier
  * **`status`** : Processing state (`queued`, `processing`, `done`)



## 

​

Next Steps

  * [Track Processing Status](/docs/api/track-progress) \- Monitor document processing
  * [Search Memories](/docs/search/overview) \- Search your content
  * [List Memories](/docs/list-memories/overview) \- Browse stored memories
  * [Update & Delete](/docs/update-delete-memories/overview) \- Manage memories



Was this page helpful?

YesNo

[How Supermemory Works](/docs/how-it-works)[Parameters](/docs/add-memories/parameters)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
