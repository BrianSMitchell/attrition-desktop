# Bulk delete documents - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/bulk-delete-documents
**Scraped:** 2025-10-08 18:00:38

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Bulk delete documents

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



Bulk delete documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/bulk';
    const options = {
      method: 'DELETE',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"ids":["acxV5LHMEsG2hMSNb4umbn","bxcV5LHMEsG2hMSNb4umbn"]}'
    };
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

400

401

500

Copy

Ask AI
    
    
    {
      "success": true,
      "deletedCount": 2,
      "errors": [
        {
          "id": "<string>",
          "error": "<string>"
        }
      ],
      "containerTags": [
        "user_123",
        "project_123"
      ]
    }

DELETE

/

v3

/

documents

/

bulk

Try it

Bulk delete documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/bulk';
    const options = {
      method: 'DELETE',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"ids":["acxV5LHMEsG2hMSNb4umbn","bxcV5LHMEsG2hMSNb4umbn"]}'
    };
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

200

400

401

500

Copy

Ask AI
    
    
    {
      "success": true,
      "deletedCount": 2,
      "errors": [
        {
          "id": "<string>",
          "error": "<string>"
        }
      ],
      "containerTags": [
        "user_123",
        "project_123"
      ]
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

Request body for bulk deleting documents by IDs or container tags

​

ids

string[]

Array of document IDs to delete (max 100 at once)

Required array length: `1 - 100` elements

Example:
    
    
    [  
      "acxV5LHMEsG2hMSNb4umbn",  
      "bxcV5LHMEsG2hMSNb4umbn"  
    ]

​

containerTags

string[]

Array of container tags - all documents in these containers will be deleted

Minimum length: `1`

Example:
    
    
    ["user_123", "project_123"]

#### Response

200

application/json

Bulk deletion completed successfully

Response for bulk document deletion

​

success

boolean

required

Whether the bulk deletion was successful

Example:

`true`

​

deletedCount

number

required

Number of documents successfully deleted

Example:

`2`

​

errors

object[]

Array of errors for documents that couldn't be deleted (only applicable when deleting by IDs)

Show child attributes

​

containerTags

string[]

Container tags that were processed (only applicable when deleting by container tags)

Example:
    
    
    ["user_123", "project_123"]

Was this page helpful?

YesNo

[Get processing documents](/docs/api-reference/manage-documents/get-processing-documents)[Upload a file](/docs/api-reference/manage-documents/upload-a-file)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
