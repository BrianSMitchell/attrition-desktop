# Delete document by ID or customId - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/delete-document-by-id-or-customid
**Scraped:** 2025-10-08 18:00:33

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Delete document by ID or customId

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



Delete document by ID or customId

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/{id}';
    const options = {method: 'DELETE', headers: {Authorization: 'Bearer <token>'}, body: undefined};
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

204

401

404

500

Copy

Ask AI
    
    
    This response does not have an example.

DELETE

/

v3

/

documents

/

{id}

Try it

Delete document by ID or customId

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/{id}';
    const options = {method: 'DELETE', headers: {Authorization: 'Bearer <token>'}, body: undefined};
    
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error(error);
    }

204

401

404

500

Copy

Ask AI
    
    
    This response does not have an example.

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

204

Document deleted successfully

Was this page helpful?

YesNo

[Get document](/docs/api-reference/manage-documents/get-document)[Update document](/docs/api-reference/manage-documents/update-document)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
