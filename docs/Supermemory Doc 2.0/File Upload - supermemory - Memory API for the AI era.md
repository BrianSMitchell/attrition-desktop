# File Upload - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/add-memories/examples/file-upload
**Scraped:** 2025-10-08 18:01:26

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

File Upload

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

  * Upload a PDF
  * Upload Images with OCR
  * Browser File Upload
  * Upload Multiple Files
  * Supported File Types
  * Documents
  * Images
  * Size Limits



Upload files directly to Supermemory for automatic content extraction and processing.

## 

​

Upload a PDF

Extract text from PDFs with OCR support.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const file = fs.createReadStream('document.pdf');
    
    const response = await client.memories.uploadFile({
      file: file,
      containerTags: 'documents'
    });
    
    console.log(response.id);
    // Output: pdf_123
    

## 

​

Upload Images with OCR

Extract text from images.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    const image = fs.createReadStream('screenshot.png');
    
    await client.memories.uploadFile({
      file: image,
      containerTags: 'images'
    });
    

## 

​

Browser File Upload

Handle browser file uploads.

JavaScript

React

cURL

Copy

Ask AI
    
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('containerTags', 'uploads');
    
    const response = await fetch('https://api.supermemory.ai/v3/documents/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: formData
    });
    
    const result = await response.json();
    console.log(result.id);
    

## 

​

Upload Multiple Files

Batch upload with rate limiting.

TypeScript

Python

cURL

Copy

Ask AI
    
    
    for (const file of files) {
      const stream = fs.createReadStream(file);
    
      await client.memories.uploadFile({
        file: stream,
        containerTags: 'batch'
      });
    
      // Rate limit
      await new Promise(r => setTimeout(r, 1000));
    }
    

## 

​

Supported File Types

### 

​

Documents

Format| Extensions| Processing  
---|---|---  
PDF| .pdf| Text extraction, OCR for scanned pages  
Microsoft Word| .doc, .docx| Full text and formatting extraction  
Plain Text| .txt, .md| Direct text processing  
CSV| .csv| Structured data extraction  
  
### 

​

Images

Format| Extensions| Processing  
---|---|---  
JPEG| .jpg, .jpeg| OCR text extraction  
PNG| .png| OCR text extraction  
GIF| .gif| OCR for static images  
WebP| .webp| OCR text extraction  
  
### 

​

Size Limits

  * **Maximum file size** : 50MB
  * **Recommended size** : < 10MB for optimal processing
  * **Large files** : May take longer to process



Was this page helpful?

YesNo

[Basic Usage](/docs/add-memories/examples/basic)[Overview](/docs/search/overview)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
