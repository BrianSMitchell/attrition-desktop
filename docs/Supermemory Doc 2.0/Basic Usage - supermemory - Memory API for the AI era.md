# Basic Usage - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/add-memories/examples/basic
**Scraped:** 2025-10-08 18:01:40

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Basic Usage

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

      * [Basic Usage](/docs/add-memories/examples/basic)
      * [File Upload](/docs/add-memories/examples/file-upload)
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

  * Add Simple Text
  * Add with Container Tags
  * Add with Metadata
  * Add Multiple Documents
  * Add URLs
  * Add Markdown Content



Learn how to add basic text content to Supermemory with simple, practical examples.

## 

​

Add Simple Text

The most basic operation - adding plain text content.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const response = await client.memories.add({
      content: "Artificial intelligence is transforming how we work and live"
    });
    
    console.log(response);
    // Output: { id: "abc123", status: "queued" }
    

## 

​

Add with Container Tags

Group related content using container tags.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const response = await client.memories.add({
      content: "Q4 2024 revenue exceeded projections by 15%",
      containerTag: "financial_reports"
    });
    
    console.log(response.id);
    // Output: xyz789
    

## 

​

Add with Metadata

Attach metadata for better search and filtering.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    await client.memories.add({
      content: "New onboarding flow reduces drop-off by 30%",
      containerTag: "product_updates",
      metadata: {
        impact: "high",
        team: "product"
      }
    });
    

## 

​

Add Multiple Documents

Process multiple related documents.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const notes = [
      "API redesign discussion",
      "Security audit next month",
      "New hire starting Monday"
    ];
    
    const results = await Promise.all(
      notes.map(note =>
        client.memories.add({
          content: note,
          containerTag: "meeting_2024_01_15"
        })
      )
    );
    

## 

​

Add URLs

Process web pages, YouTube videos, and other URLs automatically.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    // Web page
    await client.memories.add({
      content: "https://example.com/article",
      containerTag: "articles"
    });
    
    // YouTube video (auto-transcribed)
    await client.memories.add({
      content: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      containerTag: "videos"
    });
    
    // Google Docs
    await client.memories.add({
      content: "https://docs.google.com/document/d/abc123/edit",
      containerTag: "docs"
    });
    

## 

​

Add Markdown Content

Supermemory preserves markdown formatting.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const markdown = `
    # Project Documentation
    
    ## Features
    - **Real-time sync**
    - **AI search**
    - **Enterprise security**
    `;
    
    await client.memories.add({
      content: markdown,
      containerTag: "docs"
    });
    

Was this page helpful?

YesNo

[Ingesting content guide](/docs/memory-api/ingesting)[File Upload](/docs/add-memories/examples/file-upload)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
