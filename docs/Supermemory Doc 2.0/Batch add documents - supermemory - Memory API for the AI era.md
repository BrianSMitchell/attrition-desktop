# Batch add documents - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/batch-add-documents
**Scraped:** 2025-10-08 18:00:30

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Batch add documents

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



Batch add documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/batch';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"documents":[{"containerTag":"user_123","containerTags":["user_123","project_123"],"content":"This is a detailed article about machine learning concepts...","customId":"mem_abc123","metadata":{"category":"technology","isPublic":true,"readingTime":5,"source":"web","tag_1":"ai","tag_2":"machine-learning"}}]}'
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

402

500

Copy

Ask AI
    
    
    [
      {
        "id": "<string>",
        "status": "<string>"
      }
    ]

POST

/

v3

/

documents

/

batch

Try it

Batch add documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/batch';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"documents":[{"containerTag":"user_123","containerTags":["user_123","project_123"],"content":"This is a detailed article about machine learning concepts...","customId":"mem_abc123","metadata":{"category":"technology","isPublic":true,"readingTime":5,"source":"web","tag_1":"ai","tag_2":"machine-learning"}}]}'
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

402

500

Copy

Ask AI
    
    
    [
      {
        "id": "<string>",
        "status": "<string>"
      }
    ]

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

documents

object[]string[]

required

Required array length: `1 - 100` elements

Show child attributes

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

​

content

null

#### Response

200

application/json

Documents added successfully

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

[Add document](/docs/api-reference/manage-documents/add-document)[Get document](/docs/api-reference/manage-documents/get-document)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
