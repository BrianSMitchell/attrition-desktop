# Get user profile - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/profile/get-user-profile
**Scraped:** 2025-10-08 18:00:56

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Profile

Get user profile

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



Get user profile

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v4/profile';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"q":"<string>","containerTag":"<string>"}'
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

402

500

Copy

Ask AI
    
    
    {
      "profile": {
        "static": [
          "<string>"
        ],
        "dynamic": [
          "<string>"
        ]
      },
      "searchResults": {
        "results": [
          "<any>"
        ],
        "total": 123,
        "timing": 123
      }
    }

POST

/

v4

/

profile

Try it

Get user profile

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v4/profile';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"q":"<string>","containerTag":"<string>"}'
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

402

500

Copy

Ask AI
    
    
    {
      "profile": {
        "static": [
          "<string>"
        ],
        "dynamic": [
          "<string>"
        ]
      },
      "searchResults": {
        "results": [
          "<any>"
        ],
        "total": 123,
        "timing": 123
      }
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

q

string

Optional search query to include search results in the response

​

containerTag

string

Optional tag to filter the profile by. This can be an ID for your user, a project ID, or any other identifier you wish to use to filter memories.

#### Response

200

application/json

User profile with optional search results

​

profile

object

required

Show child attributes

​

searchResults

object

Search results if a search query was provided

Show child attributes

Was this page helpful?

YesNo

[Sync connection](/docs/api-reference/connections/sync-connection)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
