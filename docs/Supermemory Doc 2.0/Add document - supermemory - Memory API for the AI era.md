# Add document - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/add-document
**Scraped:** 2025-10-08 17:59:57

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Add document

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



Add document

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"content":"This is a detailed article about machine learning concepts..."}'
    };
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

401

500

Copy

Ask AI
    
    
    {
      "id": "<string>",
      "status": "<string>"
    }

POST

/

v3

/

documents

Try it

Add document

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"content":"This is a detailed article about machine learning concepts..."}'
    };
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

401

500

Copy

Ask AI
    
    
    {
      "id": "<string>",
      "status": "<string>"
    }

#### Authorizations

​

Authorization

string

header

required

Bearer authentication header of the form `Bearer <token>`, where `<token>` is your auth token.

#### Body

application/json

​

content

string

required

The content to extract and process into a document. This can be a URL to a website, a PDF, an image, or a video.

Plaintext: Any plaintext format

URL: A URL to a website, PDF, image, or video

We automatically detect the content type from the url's response format.

Example:

`"This is a detailed article about machine learning concepts..."`

​

containerTag

string

Optional tag this document should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group documents.

Example:

`"user_123"`

​

containerTags

string[]

deprecated

(DEPRECATED: Use containerTag instead) Optional tags this document should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to group documents.

Example:
    
    
    ["user_123", "project_123"]

​

customId

string

Optional custom ID of the document. This could be an ID from your database that will uniquely identify this document.

Example:

`"mem_abc123"`

​

metadata

object

Optional metadata for the document. This is used to store additional information about the document. You can use this to store any additional information you need about the document. Metadata can be filtered through. Keys must be strings and are case sensitive. Values can be strings, numbers, or booleans. You cannot nest objects.

Show child attributes

Example:
    
    
    {  
      "category": "technology",  
      "isPublic": true,  
      "readingTime": 5,  
      "source": "web",  
      "tag_1": "ai",  
      "tag_2": "machine-learning"  
    }

#### Response

200

application/json

Document added successfully

​

id

string

required

​

status

string

required

Was this page helpful?

YesNo

[Batch add documents](/docs/api-reference/manage-documents/batch-add-documents)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
