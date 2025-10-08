# Create connection - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/connections/create-connection
**Scraped:** 2025-10-08 18:00:47

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Connections

Create connection

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



Create connection

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/connections/{provider}';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"containerTags":["<string>"],"documentLimit":5000,"metadata":{},"redirectUrl":"<string>"}'
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

Copy

Ask AI
    
    
    {
      "authLink": "<string>",
      "expiresIn": "<string>",
      "id": "<string>",
      "redirectsTo": "<string>"
    }

POST

/

v3

/

connections

/

{provider}

Try it

Create connection

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/connections/{provider}';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"containerTags":["<string>"],"documentLimit":5000,"metadata":{},"redirectUrl":"<string>"}'
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

Copy

Ask AI
    
    
    {
      "authLink": "<string>",
      "expiresIn": "<string>",
      "id": "<string>",
      "redirectsTo": "<string>"
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

provider

enum<string>

required

Available options:

`notion`,

`google-drive`,

`onedrive`

#### Body

application/json

Configuration for the connection

​

containerTags

string[]

​

documentLimit

integer

Required range: `1 <= x <= 10000`

​

metadata

object | null

Show child attributes

​

redirectUrl

string

#### Response

200

application/json

Authorization URL

​

authLink

string

required

​

expiresIn

string

required

​

id

string

required

​

redirectsTo

string

Was this page helpful?

YesNo

[List connections](/docs/api-reference/connections/list-connections)[Delete connection](/docs/api-reference/connections/delete-connection)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
