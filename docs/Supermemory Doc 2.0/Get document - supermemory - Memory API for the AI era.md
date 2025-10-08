# Get document - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/get-document
**Scraped:** 2025-10-08 18:00:31

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Get document

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [API Reference](/docs/api-reference/manage-documents/add-document)



##### Manage Documents

  * [POSTAdd document](/docs/api-reference/manage-documents/add-document)
  * [POSTBatch add documents](/docs/api-reference/manage-documents/batch-add-documents)
  * [GETGet document](/docs/api-reference/manage-documents/get-document)
  * [DELDelete document by ID or customId](/docs/api-reference/manage-documents/delete-document-by-id-or-customid)
  * [PATCHUpdate document](/docs/api-reference/manage-documents/update-document)
  * [POSTList documents](/docs/api-reference/manage-documents/list-documents)
  * [GETGet processing documents](/docs/api-reference/manage-documents/get-processing-documents)
  * [DELBulk delete documents](/docs/api-reference/manage-documents/bulk-delete-documents)
  * [POSTUpload a file](/docs/api-reference/manage-documents/upload-a-file)



##### Search

  * [POSTSearch documents](/docs/api-reference/search/search-documents)
  * [POSTSearch memory entries](/docs/api-reference/search/search-memory-entries)



##### Organization Settings

  * [GETGet settings](/docs/api-reference/organization-settings/get-settings)
  * [PATCHUpdate settings](/docs/api-reference/organization-settings/update-settings)



##### Connections

  * [POSTList connections](/docs/api-reference/connections/list-connections)
  * [POSTCreate connection](/docs/api-reference/connections/create-connection)
  * [DELDelete connection](/docs/api-reference/connections/delete-connection)
  * [GETGet connection (by id)](/docs/api-reference/connections/get-connection-by-id)
  * [DELDelete connection by ID](/docs/api-reference/connections/delete-connection-by-id)
  * [POSTGet connection (by provider)](/docs/api-reference/connections/get-connection-by-provider)
  * [POSTList documents](/docs/api-reference/connections/list-documents)
  * [POSTSync connection](/docs/api-reference/connections/sync-connection)



##### Profile

  * [POSTGet user profile](/docs/api-reference/profile/get-user-profile)



Get document

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/{id}';
    const options = {method: 'GET', headers: {Authorization: 'Bearer <token>'}, body: undefined};
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

401

404

500

Copy

Ask AI
    
    
    {
      "connectionId": "conn_123",
      "containerTags": [
        "user_123",
        "project_123"
      ],
      "content": "This is a detailed article about machine learning concepts...",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "customId": "mem_abc123",
      "id": "acxV5LHMEsG2hMSNb4umbn",
      "metadata": {
        "category": "technology",
        "isPublic": true,
        "readingTime": 5,
        "source": "web",
        "tag_1": "ai",
        "tag_2": "machine-learning"
      },
      "ogImage": "https://example.com/image.jpg",
      "raw": "This is a detailed article about machine learning concepts...",
      "source": "web",
      "status": "done",
      "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
      "title": "Introduction to Machine Learning",
      "tokenCount": 1000,
      "type": "text",
      "updatedAt": "1970-01-01T00:00:00.000Z",
      "url": "https://example.com/article"
    }

GET

/

v3

/

documents

/

{id}

Try it

Get document

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/{id}';
    const options = {method: 'GET', headers: {Authorization: 'Bearer <token>'}, body: undefined};
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

401

404

500

Copy

Ask AI
    
    
    {
      "connectionId": "conn_123",
      "containerTags": [
        "user_123",
        "project_123"
      ],
      "content": "This is a detailed article about machine learning concepts...",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "customId": "mem_abc123",
      "id": "acxV5LHMEsG2hMSNb4umbn",
      "metadata": {
        "category": "technology",
        "isPublic": true,
        "readingTime": 5,
        "source": "web",
        "tag_1": "ai",
        "tag_2": "machine-learning"
      },
      "ogImage": "https://example.com/image.jpg",
      "raw": "This is a detailed article about machine learning concepts...",
      "source": "web",
      "status": "done",
      "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
      "title": "Introduction to Machine Learning",
      "tokenCount": 1000,
      "type": "text",
      "updatedAt": "1970-01-01T00:00:00.000Z",
      "url": "https://example.com/article"
    }

#### Authorizations

​

Authorization

string

header

required

Bearer authentication header of the form `Bearer <token>`, where `<token>` is your auth token.

#### Path Parameters

​

id

string

required

#### Response

200

application/json

Successfully retrieved document

Document object

​

connectionId

string | null

required

Optional ID of connection the document was created from. This is useful for identifying the source of the document.

Required string length: `22`

Example:

`"conn_123"`

​

content

string | null

required

The content to extract and process into a document. This can be a URL to a website, a PDF, an image, or a video.

Plaintext: Any plaintext format

URL: A URL to a website, PDF, image, or video

We automatically detect the content type from the url's response format.

Examples:

`"This is a detailed article about machine learning concepts..."`

`"https://example.com/article"`

`"https://youtube.com/watch?v=abc123"`

`"https://example.com/audio.mp3"`

`"https://aws-s3.com/bucket/file.pdf"`

`"https://example.com/image.jpg"`

​

createdAt

string<datetime>

required

Creation timestamp

Example:

`"1970-01-01T00:00:00.000Z"`

​

customId

string | null

required

Optional custom ID of the document. This could be an ID from your database that will uniquely identify this document.

Maximum length: `255`

Example:

`"mem_abc123"`

​

id

string

required

Unique identifier of the document.

Required string length: `22`

Example:

`"acxV5LHMEsG2hMSNb4umbn"`

​

metadata

string | nullnumber | nullboolean | nullobjectany[] | null

required

Optional metadata for the document. This is used to store additional information about the document. You can use this to store any additional information you need about the document. Metadata can be filtered through. Keys must be strings and are case sensitive. Values can be strings, numbers, or booleans. You cannot nest objects.

Example:
    
    
    {  
      "category": "technology",  
      "isPublic": true,  
      "readingTime": 5,  
      "source": "web",  
      "tag_1": "ai",  
      "tag_2": "machine-learning"  
    }

​

ogImage

string | null

required

​

raw

any

required

Raw content of the document

​

source

string | null

required

Source of the document

Maximum length: `255`

Example:

`"web"`

​

status

enum<string>

required

Status of the document

Available options:

`unknown`,

`queued`,

`extracting`,

`chunking`,

`embedding`,

`indexing`,

`done`,

`failed`

Example:

`"done"`

​

summary

string | null

required

Summary of the document content

Example:

`"A comprehensive guide to understanding the basics of machine learning and its applications."`

​

summaryEmbeddingModel

string | null

required

​

summaryEmbeddingNew

number[] | null

required

Required array length: `1536` elements

​

summaryEmbeddingModelNew

string | null

required

​

title

string | null

required

Title of the document

Example:

`"Introduction to Machine Learning"`

​

type

enum<string>

required

Type of the document

Available options:

`text`,

`pdf`,

`tweet`,

`google_doc`,

`google_slide`,

`google_sheet`,

`image`,

`video`,

`notion_doc`,

`webpage`,

`onedrive`

Example:

`"text"`

​

updatedAt

string<datetime>

required

Last update timestamp

Example:

`"1970-01-01T00:00:00.000Z"`

​

url

string | null

URL of the document

Example:

`"https://example.com/article"`

​

containerTags

string[]

Optional tags this document should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group documents.

Example:
    
    
    ["user_123", "project_123"]

Was this page helpful?

YesNo

[Batch add documents](/docs/api-reference/manage-documents/batch-add-documents)[Delete document by ID or customId](/docs/api-reference/manage-documents/delete-document-by-id-or-customid)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
