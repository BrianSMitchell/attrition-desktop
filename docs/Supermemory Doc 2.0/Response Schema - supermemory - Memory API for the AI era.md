# Response Schema - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/response-schema
**Scraped:** 2025-10-08 18:01:22

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search Memories

Response Schema

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

    * [Overview](/docs/search/overview)
    * [Search Parameters](/docs/search/parameters)
    * [Response Schema](/docs/search/response-schema)
    * [Query Rewriting](/docs/search/query-rewriting)
    * [Reranking](/docs/search/reranking)
    * Examples

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

  * Document Search Response (POST /v3/search)
  * Document Result Fields
  * Memory Search Response
  * Memory Result Fields
  * Context Memory Structure



## 

​

Document Search Response (POST `/v3/search`)

Response from `client.search.documents()` and `client.search.execute()`:

Copy

Ask AI
    
    
    {
      "results": [
        {
          "documentId": "doc_abc123",
          "title": "Machine Learning Fundamentals",
          "type": "pdf",
          "score": 0.89,
          "chunks": [
            {
              "content": "Machine learning is a subset of artificial intelligence...",
              "score": 0.95,
              "isRelevant": true
            }
          ],
          "metadata": {
            "category": "education",
            "author": "Dr. Smith",
            "difficulty": "beginner"
          },
          "createdAt": "2024-01-15T10:30:00Z",
          "updatedAt": "2024-01-20T14:45:00Z"
        }
      ],
      "timing": 187,
      "total": 1
    }
    

### 

​

Document Result Fields

​

documentId

string

Unique identifier for the document containing the matching chunks.

​

title

string | null

Document title if available. May be null for documents without titles.

​

type

string | null

Document type (e.g., “pdf”, “text”, “webpage”, “notion_doc”). May be null if not specified.

​

score

number

**Overall document relevance score**. Combines semantic similarity, keyword matching, and metadata relevance.

  * **0.9-1.0** : Extremely relevant
  * **0.7-0.9** : Highly relevant
  * **0.5-0.7** : Moderately relevant
  * **0.3-0.5** : Somewhat relevant
  * **0.0-0.3** : Marginally relevant



​

chunks

Array<Chunk>

Array of matching text chunks from the document. Each chunk represents a portion of the document that matched your query.

​

chunks[].content

string

The actual text content of the matching chunk. May include context from surrounding chunks unless `onlyMatchingChunks=true`.

​

chunks[].score

number

**Chunk-specific similarity score**. How well this specific chunk matches your query.

​

chunks[].isRelevant

boolean

Whether this chunk passed the `chunkThreshold`. `true` means the chunk is above the threshold, `false` means it’s included for context only.

​

metadata

object | null

Document metadata as key-value pairs. Structure depends on what was stored with the document.

Copy

Ask AI
    
    
    {
      "category": "tutorial",
      "language": "python",
      "difficulty": "intermediate",
      "tags": "web-development,backend"
    }
    

​

createdAt

string

ISO 8601 timestamp when the document was created.

​

updatedAt

string

ISO 8601 timestamp when the document was last updated.

​

content

string | null

**Full document content**. Only included when `includeFullDocs=true`. Can be very large.

Full document content can make responses extremely large. Use with appropriate limits and only when necessary.

​

summary

string | null

**AI-generated document summary**. Only included when `includeSummary=true`. Provides a concise overview of the document.

## 

​

Memory Search Response

Response from `client.search.memories()`:

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_xyz789",
          "memory": "Complete memory content about quantum computing applications...",
          "similarity": 0.87,
          "metadata": {
            "category": "research",
            "topic": "quantum-computing"
          },
          "updatedAt": "2024-01-18T09:15:00Z",
          "version": 3,
          "context": {
            "parents": [
              {
                "memory": "Earlier discussion about quantum theory basics...",
                "relation": "extends",
                "version": 2,
                "updatedAt": "2024-01-17T16:30:00Z"
              }
            ],
            "children": [
              {
                "memory": "Follow-up questions about quantum algorithms...",
                "relation": "derives",
                "version": 4,
                "updatedAt": "2024-01-19T11:20:00Z"
              }
            ]
          },
          "documents": [
            {
              "id": "doc_quantum_paper",
              "title": "Quantum Computing Applications",
              "type": "pdf",
              "createdAt": "2024-01-10T08:00:00Z"
            }
          ]
        }
      ],
      "timing": 156,
      "total": 1
    }
    

### 

​

Memory Result Fields

​

id

string

Unique identifier for the memory entry.

​

memory

string

**Complete memory content**. Unlike document search which returns chunks, memory search returns the full memory text.

​

similarity

number

**Similarity score** between your query and this memory. Higher scores indicate better matches.

  * **0.9-1.0** : Extremely similar
  * **0.8-0.9** : Very similar
  * **0.7-0.8** : Similar
  * **0.6-0.7** : Somewhat similar
  * **0.5-0.6** : Marginally similar



​

metadata

object | null

Memory metadata as key-value pairs. Structure depends on what was stored with the memory.

​

updatedAt

string

ISO 8601 timestamp when the memory was last updated.

​

version

number | null

Version number of this memory entry. Used for tracking memory evolution and relationships.

​

context

object

**Contextual memory relationships**. Only included when `include.relatedMemories=true`.

​

context.parents

Array<ContextMemory>

Array of parent memories that this memory extends or derives from.

​

context.children

Array<ContextMemory>

Array of child memories that extend or derive from this memory.

### 

​

Context Memory Structure

​

memory

string

Content of the related memory.

​

relation

string

Relationship type: `"updates"`, `"extends"`, or `"derives"`.

  * **updates** : This memory updates/replaces the related memory
  * **extends** : This memory builds upon the related memory
  * **derives** : This memory is derived from the related memory



​

version

number | null

Relative version distance:

  * **Negative values** for parents (-1 = direct parent, -2 = grandparent)
  * **Positive values** for children (+1 = direct child, +2 = grandchild)



​

updatedAt

string

When the related memory was last updated.

​

metadata

object | null

Metadata of the related memory.

​

documents

Array<Document>

**Associated documents**. Only included when `include.documents=true`.

​

documents[].id

string

Document identifier.

​

documents[].title

string

Document title.

​

documents[].type

string

Document type.

​

documents[].metadata

object

Document metadata.

​

documents[].createdAt

string

Document creation timestamp.

​

documents[].updatedAt

string

Document update timestamp.

Was this page helpful?

YesNo

[Search Parameters](/docs/search/parameters)[Query Rewriting](/docs/search/query-rewriting)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
