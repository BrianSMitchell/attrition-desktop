# List documents - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/connections/list-documents
**Scraped:** 2025-10-08 18:00:53

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connections

List documents

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



List documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/connections/{provider}/documents';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"containerTags":["user_123","project_123"]}'
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

404

500

Copy

Ask AI
    
    
    [
      {
        "createdAt": "<string>",
        "id": "<string>",
        "status": "<string>",
        "summary": "<string>",
        "title": "<string>",
        "type": "<string>",
        "updatedAt": "<string>"
      }
    ]

POST

/

v3

/

connections

/

{provider}

/

documents

Try it

List documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/connections/{provider}/documents';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"containerTags":["user_123","project_123"]}'
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

404

500

Copy

Ask AI
    
    
    [
      {
        "createdAt": "<string>",
        "id": "<string>",
        "status": "<string>",
        "summary": "<string>",
        "title": "<string>",
        "type": "<string>",
        "updatedAt": "<string>"
      }
    ]

#### Authorizations

​

Authorization

string

header

required

Bearer authentication header of the form `Bearer <token>`, where `<token>` is your auth token.

#### Path Parameters

​

provider

enum<string>

required

Available options:

`notion`,

`google-drive`,

`onedrive`

#### Body

application/json

​

containerTags

string[]

Optional comma-separated list of container tags to filter documents by

Example:
    
    
    ["user_123", "project_123"]

#### Response

200

application/json

List of documents

​

createdAt

string<datetime>

required

​

id

string

required

​

status

string<datetime>

required

​

summary

string | null

required

​

title

string | null

required

​

type

string

required

​

updatedAt

string<datetime>

required

Was this page helpful?

YesNo

[Get connection (by provider)](/docs/api-reference/connections/get-connection-by-provider)[Sync connection](/docs/api-reference/connections/sync-connection)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
