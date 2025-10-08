# Document Q&A System - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/cookbook/document-qa
**Scraped:** 2025-10-08 18:00:59

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Quick Start Recipes

Document Q&A System

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

  * What You’ll Build
  * Prerequisites
  * Implementation
  * Step 1: Document Processing System
  * Step 2: Q&A API with Citations
  * Step 3: Frontend Interface
  * Testing Your Q&A System
  * Step 4: Test Document Processing
  * Production Considerations
  * Performance Optimization
  * Advanced Features



Create a powerful document Q&A system that can ingest PDFs, text files, and web pages, then answer questions with accurate citations. Perfect for documentation sites, research databases, or internal knowledge bases.

## 

​

What You’ll Build

A document Q&A system that:

  * **Ingests multiple file types** (PDFs, DOCX, text, URLs)
  * **Answers questions accurately** with source citations
  * **Provides source references** with page numbers and document titles
  * **Handles follow-up questions** with conversation context
  * **Supports multiple document collections** for different topics



## 

​

Prerequisites

  * Node.js 18+ or Python 3.8+
  * Supermemory API key
  * OpenAI API key
  * Basic understanding of file handling



## 

​

Implementation

### 

​

Step 1: Document Processing System

  * Next.js

  * Python




lib/document-processor.ts

Copy

Ask AI
    
    
    import { Supermemory } from 'supermemory'
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    })
    
    interface DocumentUpload {
      file: File
      collection: string
      metadata?: Record<string, any>
    }
    
    export class DocumentProcessor {
      async uploadDocument({ file, collection, metadata = {} }: DocumentUpload) {
        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('containerTags', JSON.stringify([collection]))
          formData.append('metadata', JSON.stringify({
            originalName: file.name,
            fileType: file.type,
            uploadedAt: new Date().toISOString(),
            ...metadata
          }))
    
          const response = await fetch('/api/upload-document', {
            method: 'POST',
            body: formData
          })
    
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`)
          }
    
          return await response.json()
        } catch (error) {
          console.error('Document upload error:', error)
          throw error
        }
      }
    
      async uploadURL({ url, collection, metadata = {} }: { url: string, collection: string, metadata?: Record<string, any> }) {
        try {
          const result = await client.memories.add({
            content: url,
            containerTag: collection,
            metadata: {
              type: 'url',
              originalUrl: url,
              uploadedAt: new Date().toISOString(),
              ...metadata
            }
          })
    
          return result
        } catch (error) {
          console.error('URL upload error:', error)
          throw error
        }
      }
    
      async getDocumentStatus(documentId: string) {
        try {
          const memory = await client.memories.get(documentId)
          return {
            id: memory.id,
            status: memory.status,
            title: memory.title,
            progress: memory.metadata?.progress || 0
          }
        } catch (error) {
          console.error('Status check error:', error)
          throw error
        }
      }
    
      async listDocuments(collection: string) {
        try {
          const memories = await client.memories.list({
            containerTags: [collection],
            limit: 50,
            sort: 'updatedAt',
            order: 'desc'
          })
    
          return memories.memories.map(memory => ({
            id: memory.id,
            title: memory.title || memory.metadata?.originalName || 'Untitled',
            type: memory.metadata?.fileType || memory.metadata?.type || 'unknown',
            uploadedAt: memory.metadata?.uploadedAt,
            status: memory.status,
            url: memory.metadata?.originalUrl
          }))
        } catch (error) {
          console.error('List documents error:', error)
          throw error
        }
      }
    }
    

app/api/upload-document/route.ts

Copy

Ask AI
    
    
    import { NextRequest, NextResponse } from 'next/server'
    import { Supermemory } from 'supermemory'
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    })
    
    export async function POST(request: NextRequest) {
      try {
        const formData = await request.formData()
        const file = formData.get('file') as File
        const containerTags = JSON.parse(formData.get('containerTags') as string)
        const metadata = JSON.parse(formData.get('metadata') as string || '{}')
    
        if (!file) {
          return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }
    
        // Convert File to Buffer for Supermemory
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
    
        const result = await client.memories.uploadFile({
          file: buffer,
          filename: file.name,
          containerTags,
          metadata
        })
    
        return NextResponse.json({
          success: true,
          documentId: result.id,
          message: 'Document uploaded successfully'
        })
    
      } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
          { error: 'Upload failed', details: error.message },
          { status: 500 }
        )
      }
    }
    

### 

​

Step 2: Q&A API with Citations

  * Next.js API Route

  * Python FastAPI




app/api/qa/route.ts

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createOpenAI } from '@ai-sdk/openai'
    import { Supermemory } from 'supermemory'
    
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    })
    
    export async function POST(request: Request) {
      const { question, collection, conversationHistory = [] } = await request.json()
    
      try {
        // Search for relevant documents
        const searchResults = await client.search.documents({
          q: question,
          containerTags: [collection],
          limit: 8,
          rerank: true,
          includeFullDocs: false,
          includeSummary: true,
          onlyMatchingChunks: false,
          documentThreshold: 0.6,
          chunkThreshold: 0.7
        })
    
        if (searchResults.results.length === 0) {
          return Response.json({
            answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
            sources: [],
            confidence: 0
          })
        }
    
        // Prepare context from search results
        const context = searchResults.results.map((result, index) => {
          const chunks = result.chunks
            .filter(chunk => chunk.isRelevant)
            .slice(0, 3)
            .map(chunk => chunk.content)
            .join('\n\n')
    
          return `[Document ${index + 1}: "${result.title}"]\n${chunks}`
        }).join('\n\n---\n\n')
    
        // Prepare sources for citation
        const sources = searchResults.results.map((result, index) => ({
          id: result.documentId,
          title: result.title,
          type: result.type,
          relevantChunks: result.chunks.filter(chunk => chunk.isRelevant).length,
          score: result.score,
          citationNumber: index + 1
        }))
    
        const messages = [
          ...conversationHistory,
          {
            role: 'user' as const,
            content: question
          }
        ]
    
        const result = await streamText({
          model: openai('gpt-5'),
          messages,
          system: `You are a helpful document Q&A assistant. Answer questions based ONLY on the provided document context.
    
    CONTEXT FROM DOCUMENTS:
    ${context}
    
    INSTRUCTIONS:
    1. Answer the question using ONLY the information from the provided documents
    2. Include specific citations in your response using [Document X] format
    3. If the documents don't contain enough information, say so clearly
    4. Be accurate and quote directly when possible
    5. If multiple documents support a point, cite all relevant ones
    6. Maintain a helpful, professional tone
    
    CITATION FORMAT:
    - Use [Document 1], [Document 2], etc. to cite sources
    - Place citations after the relevant information
    - Example: "The process involves three steps [Document 1]. However, some experts recommend a four-step approach [Document 3]."
    
    If the question cannot be answered from the provided documents, respond with: "I don't have enough information in the provided documents to answer this question accurately."`,
          temperature: 0.1,
          maxTokens: 1000
        })
    
        return result.toAIStreamResponse({
          data: {
            sources,
            searchResultsCount: searchResults.results.length,
            totalResults: searchResults.total
          }
        })
    
      } catch (error) {
        console.error('Q&A error:', error)
        return Response.json(
          { error: 'Failed to process question', details: error.message },
          { status: 500 }
        )
      }
    }
    

### 

​

Step 3: Frontend Interface

app/qa/page.tsx

Copy

Ask AI
    
    
    'use client'
    
    import { useState, useRef } from 'react'
    import { useChat } from 'ai/react'
    import { DocumentProcessor } from '@/lib/document-processor'
    
    interface Document {
      id: string
      title: string
      type: string
      status: string
      uploadedAt: string
    }
    
    interface Source {
      id: string
      title: string
      citationNumber: number
      score: number
      relevantChunks: number
    }
    
    export default function DocumentQA() {
      const [collection, setCollection] = useState('default-docs')
      const [documents, setDocuments] = useState<Document[]>([])
      const [sources, setSources] = useState<Source[]>([])
      const [isUploading, setIsUploading] = useState(false)
      const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
      const fileInputRef = useRef<HTMLInputElement>(null)
    
      const processor = new DocumentProcessor()
    
      const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/qa',
        body: {
          collection
        },
        onFinish: (message, { data }) => {
          if (data?.sources) {
            setSources(data.sources)
          }
        }
      })
    
      const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (!files || files.length === 0) return
    
        setIsUploading(true)
        const newProgress: Record<string, number> = {}
    
        try {
          for (const file of Array.from(files)) {
            newProgress[file.name] = 0
            setUploadProgress({ ...newProgress })
    
            await processor.uploadDocument({
              file,
              collection,
              metadata: {
                uploadedBy: 'user',
                category: 'qa-document'
              }
            })
    
            newProgress[file.name] = 100
            setUploadProgress({ ...newProgress })
          }
    
          // Refresh document list
          await loadDocuments()
    
          // Clear file input
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
    
        } catch (error) {
          console.error('Upload failed:', error)
          alert('Upload failed: ' + error.message)
        } finally {
          setIsUploading(false)
          setUploadProgress({})
        }
      }
    
      const loadDocuments = async () => {
        try {
          const docs = await processor.listDocuments(collection)
          setDocuments(docs)
        } catch (error) {
          console.error('Failed to load documents:', error)
        }
      }
    
      const formatSources = (sources: Source[]) => {
        if (!sources || sources.length === 0) return null
    
        return (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Sources:</h3>
            <div className="space-y-2">
              {sources.map((source) => (
                <div key={source.id} className="flex items-center space-x-2 text-sm">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                    Document {source.citationNumber}
                  </span>
                  <span className="text-gray-700">{source.title}</span>
                  <span className="text-gray-500">
                    ({source.relevantChunks} relevant chunks, {(source.score * 100).toFixed(1)}% match)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      }
    
      return (
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document Management Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Document Collection</h2>
    
                {/* Collection Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collection Name
                  </label>
                  <input
                    type="text"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., company-docs"
                  />
                </div>
    
                {/* File Upload */}
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Documents'}
                  </button>
                </div>
    
                {/* Upload Progress */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="mb-4 space-y-2">
                    {Object.entries(uploadProgress).map(([filename, progress]) => (
                      <div key={filename} className="text-sm">
                        <div className="flex justify-between">
                          <span className="truncate">{filename}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
    
                {/* Document List */}
                <div className="max-h-64 overflow-y-auto">
                  {documents.map((doc) => (
                    <div key={doc.id} className="mb-2 p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium truncate">{doc.title}</div>
                      <div className="text-gray-500 text-xs">
                        {doc.type} • {doc.status}
                      </div>
                    </div>
                  ))}
                </div>
    
                <button
                  onClick={loadDocuments}
                  className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Refresh Documents
                </button>
              </div>
            </div>
    
            {/* Q&A Interface */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Ask Questions</h2>
    
                {/* Messages */}
                <div className="h-96 overflow-y-auto mb-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-gray-500 text-center py-8">
                      Upload documents and ask questions to get started!
    
                      <div className="mt-4 text-sm">
                        <p className="font-medium">Try asking:</p>
                        <ul className="mt-2 space-y-1">
                          <li>"What are the main findings?"</li>
                          <li>"Summarize the key points"</li>
                          <li>"What does section 3 say about...?"</li>
                        </ul>
                      </div>
                    </div>
                  )}
    
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white ml-8'
                          : 'bg-gray-100 mr-8'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
    
                      {message.role === 'assistant' && sources.length > 0 && (
                        formatSources(sources)
                      )}
                    </div>
                  ))}
    
                  {isLoading && (
                    <div className="bg-gray-100 p-4 rounded-lg mr-8">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Searching documents and generating answer...</span>
                      </div>
                    </div>
                  )}
                </div>
    
                {/* Input */}
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="Ask a question about your documents..."
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading || documents.length === 0}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || documents.length === 0}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ask
                  </button>
                </form>
    
                {documents.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Upload documents first to enable questions
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }
    

## 

​

Testing Your Q&A System

### 

​

Step 4: Test Document Processing

  1. **Upload Test Documents** :
     * Upload a PDF manual or research paper
     * Add a few web articles via URL
     * Upload some text files with different topics
  2. **Test Question Types** :

Copy

Ask AI
         
         Factual: "What is the definition of X mentioned in the documents?"
         Analytical: "What are the pros and cons of approach Y?"
         Comparative: "How does method A compare to method B?"
         Summarization: "Summarize the main findings"
         

  3. **Verify Citations** :
     * Check that citations appear in responses
     * Verify citation numbers match source list
     * Ensure sources show relevant metadata



## 

​

Production Considerations

### 

​

Performance Optimization

Copy

Ask AI
    
    
    // Implement caching for frequently asked questions
    const cacheKey = `qa:${collection}:${hashQuery(question)}`
    const cachedResponse = await redis.get(cacheKey)
    
    if (cachedResponse) {
      return JSON.parse(cachedResponse)
    }
    
    // Cache response for 1 hour
    await redis.setex(cacheKey, 3600, JSON.stringify(response))
    

### 

​

Advanced Features

  1. **Follow-up Questions** :

Copy

Ask AI
         
         // Track conversation context
         const conversationHistory = messages.slice(-6) // Last 3 exchanges
         

  2. **Answer Confidence Scoring** :

Copy

Ask AI
         
         const confidence = calculateConfidence({
           searchScore: searchResults.results[0]?.score || 0,
           resultCount: searchResults.results.length,
           chunkRelevance: avgChunkRelevance
         })
         

  3. **Multi-language Support** :

Copy

Ask AI
         
         // Detect document language and adapt search
         const detectedLanguage = await detectLanguage(question)
         const searchResults = await client.search.documents({
           q: question,
           filters: {
             AND: [{ key: 'language', value: detectedLanguage }]
           }
         })
         


This recipe provides a complete foundation for building document Q&A systems with accurate citations and source tracking.

* * *

_Customize this recipe based on your specific document types and use cases._

Was this page helpful?

YesNo

[Personal AI Assistant](/docs/cookbook/personal-assistant)[Customer Support Bot](/docs/cookbook/customer-support)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
