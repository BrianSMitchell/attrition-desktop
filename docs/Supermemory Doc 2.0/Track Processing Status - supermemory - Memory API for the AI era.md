# Track Processing Status - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-api/track-progress
**Scraped:** 2025-10-08 18:00:07

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

Track Processing Status

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

  * Processing Pipeline
  * Processing Documents
  * Response Format
  * Individual Documents
  * Response Format
  * Status Values
  * Polling Best Practices
  * Batch Processing
  * Error Handling
  * Processing Times by Content Type



Track your documents through the processing pipeline to provide better user experiences and handle edge cases.

## 

​

Processing Pipeline

Each stage serves a specific purpose:

  * **Queued** : Document is waiting in the processing queue
  * **Extracting** : Content is being extracted (OCR for images, transcription for videos)
  * **Chunking** : Content is broken into optimal, searchable pieces
  * **Embedding** : Each chunk is converted to vector representations
  * **Indexing** : Vectors are added to the search index
  * **Done** : Document is fully processed and searchable



Processing time varies by content type. Plain text processes in seconds, while a 10-minute video might take 2-3 minutes.

## 

​

Processing Documents

Monitor all documents currently being processed across your account. `GET /v3/documents/processing`

Copy

Ask AI
    
    
    // Direct API call (not in SDK)
    const response = await fetch('https://api.supermemory.ai/v3/documents/processing', {
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`
      }
    });
    
    const processing = await response.json();
    console.log(`${processing.documents.length} documents processing`);
    

### 

​

Response Format

Copy

Ask AI
    
    
    {
      "documents": [
        {
          "id": "doc_abc123",
          "status": "extracting",
          "created_at": "2024-01-15T10:30:00Z",
          "updated_at": "2024-01-15T10:30:15Z",
          "container_tags": ["research"],
          "metadata": {
            "source": "upload",
            "filename": "report.pdf"
          }
        },
        {
          "id": "doc_def456",
          "status": "chunking",
          "created_at": "2024-01-15T10:29:00Z",
          "updated_at": "2024-01-15T10:30:00Z",
          "container_tags": ["articles"],
          "metadata": {
            "source": "url",
            "url": "https://example.com/article"
          }
        }
      ],
      "total": 2
    }
    

## 

​

Individual Documents

Track specific document processing status. `GET /v3/documents/{id}`

Copy

Ask AI
    
    
    const memory = await client.memories.get("doc_abc123");
    
    console.log(`Status: ${memory.status}`);
    
    // Poll for completion
    while (memory.status !== 'done') {
      await new Promise(r => setTimeout(r, 2000));
      memory = await client.memories.get("doc_abc123");
      console.log(`Status: ${memory.status}`);
    }
    

### 

​

Response Format

Copy

Ask AI
    
    
    {
      "id": "doc_abc123",
      "status": "done",
      "content": "The original content...",
      "container_tags": ["research"],
      "metadata": {
        "source": "upload",
        "filename": "report.pdf"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:31:00Z"
    }
    

## 

​

Status Values

Status| Description| Typical Duration  
---|---|---  
`queued`| Waiting to be processed| < 5 seconds  
`extracting`| Extracting content from source| 5-30 seconds  
`chunking`| Breaking into searchable pieces| 5-15 seconds  
`embedding`| Creating vector representations| 10-30 seconds  
`indexing`| Adding to search index| 5-10 seconds  
`done`| Fully processed and searchable| -  
`failed`| Processing failed| -  
  
## 

​

Polling Best Practices

When polling for status updates:

Copy

Ask AI
    
    
    async function waitForProcessing(documentId: string, maxWaitMs = 300000) {
      const startTime = Date.now();
      const pollInterval = 2000; // 2 seconds
    
      while (Date.now() - startTime < maxWaitMs) {
        const doc = await client.memories.get(documentId);
    
        if (doc.status === 'done') {
          return doc;
        }
    
        if (doc.status === 'failed') {
          throw new Error(`Processing failed for ${documentId}`);
        }
    
        await new Promise(r => setTimeout(r, pollInterval));
      }
    
      throw new Error(`Timeout waiting for ${documentId}`);
    }
    

## 

​

Batch Processing

For multiple documents, track them efficiently:

Copy

Ask AI
    
    
    async function trackBatch(documentIds: string[]) {
      const statuses = new Map();
    
      // Initial check
      for (const id of documentIds) {
        const doc = await client.memories.get(id);
        statuses.set(id, doc.status);
      }
    
      // Poll until all done
      while ([...statuses.values()].some(s => s !== 'done' && s !== 'failed')) {
        await new Promise(r => setTimeout(r, 5000)); // 5 second interval for batch
    
        for (const id of documentIds) {
          if (statuses.get(id) !== 'done' && statuses.get(id) !== 'failed') {
            const doc = await client.memories.get(id);
            statuses.set(id, doc.status);
          }
        }
    
        // Log progress
        const done = [...statuses.values()].filter(s => s === 'done').length;
        console.log(`Progress: ${done}/${documentIds.length} complete`);
      }
    
      return statuses;
    }
    

## 

​

Error Handling

Handle processing failures gracefully:

Copy

Ask AI
    
    
    async function addWithRetry(content: string, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { id } = await client.memories.add({ content });
    
        try {
          const result = await waitForProcessing(id);
          return result;
        } catch (error) {
          console.error(`Attempt ${attempt} failed:`, error);
    
          if (attempt === maxRetries) {
            throw error;
          }
    
          // Exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    

## 

​

Processing Times by Content Type

Documents: Created near instantly (200-500ms) Memories: Supermemory creates a memory graph understanding based on semantic analysis and contextual understanding. Content Type| Memory Processing Time| Notes  
---|---|---  
Plain Text| 5-10 seconds| Fastest processing  
Markdown| 5-10 seconds| Similar to plain text  
PDF (< 10 pages)| 15-30 seconds| OCR if needed  
PDF (> 100 pages)| 1-3 minutes| Depends on complexity  
Images| 10-20 seconds| OCR processing  
YouTube Videos| 1-2 min per 10 min video| Transcription required  
Web Pages| 10-20 seconds| Content extraction  
Google Docs| 10-15 seconds| API extraction  
  
**Pro Tip** : Use the processing status endpoint to provide real-time feedback to users, especially for larger documents or batch uploads.

Was this page helpful?

YesNo

[Grouping and filtering](/docs/search/filtering)[Overview](/docs/list-memories/overview)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
