# Update settings - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/organization-settings/update-settings
**Scraped:** 2025-10-08 18:00:44

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Organization Settings

Update settings

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



Update settings

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/settings';
    const options = {
      method: 'PATCH',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"excludeItems":"<string>","filterPrompt":"<string>","googleDriveClientId":"<string>","googleDriveClientSecret":"<string>","googleDriveCustomKeyEnabled":true,"includeItems":"<string>","notionClientId":"<string>","notionClientSecret":"<string>","notionCustomKeyEnabled":true,"onedriveClientId":"<string>","onedriveClientSecret":"<string>","onedriveCustomKeyEnabled":true,"shouldLLMFilter":true,"chunkSize":-1}'
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
      "orgId": "<string>",
      "orgSlug": "<string>",
      "updated": {
        "excludeItems": "<string>",
        "filterPrompt": "<string>",
        "googleDriveClientId": "<string>",
        "googleDriveClientSecret": "<string>",
        "googleDriveCustomKeyEnabled": true,
        "includeItems": "<string>",
        "notionClientId": "<string>",
        "notionClientSecret": "<string>",
        "notionCustomKeyEnabled": true,
        "onedriveClientId": "<string>",
        "onedriveClientSecret": "<string>",
        "onedriveCustomKeyEnabled": true,
        "shouldLLMFilter": true,
        "chunkSize": -1
      }
    }

PATCH

/

v3

/

settings

Try it

Update settings

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/settings';
    const options = {
      method: 'PATCH',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"excludeItems":"<string>","filterPrompt":"<string>","googleDriveClientId":"<string>","googleDriveClientSecret":"<string>","googleDriveCustomKeyEnabled":true,"includeItems":"<string>","notionClientId":"<string>","notionClientSecret":"<string>","notionCustomKeyEnabled":true,"onedriveClientId":"<string>","onedriveClientSecret":"<string>","onedriveCustomKeyEnabled":true,"shouldLLMFilter":true,"chunkSize":-1}'
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
      "orgId": "<string>",
      "orgSlug": "<string>",
      "updated": {
        "excludeItems": "<string>",
        "filterPrompt": "<string>",
        "googleDriveClientId": "<string>",
        "googleDriveClientSecret": "<string>",
        "googleDriveCustomKeyEnabled": true,
        "includeItems": "<string>",
        "notionClientId": "<string>",
        "notionClientSecret": "<string>",
        "notionCustomKeyEnabled": true,
        "onedriveClientId": "<string>",
        "onedriveClientSecret": "<string>",
        "onedriveCustomKeyEnabled": true,
        "shouldLLMFilter": true,
        "chunkSize": -1
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

excludeItems

string | nullnumber | nullboolean | nullobjectany[] | null

​

filterPrompt

string | null

​

googleDriveClientId

string | null

​

googleDriveClientSecret

string | null

​

googleDriveCustomKeyEnabled

boolean | null

​

includeItems

string | nullnumber | nullboolean | nullobjectany[] | null

​

notionClientId

string | null

​

notionClientSecret

string | null

​

notionCustomKeyEnabled

boolean | null

​

onedriveClientId

string | null

​

onedriveClientSecret

string | null

​

onedriveCustomKeyEnabled

boolean | null

​

shouldLLMFilter

boolean | null

​

chunkSize

integer | null

Required range: `-2147483648 <= x <= 2147483647`

#### Response

200

application/json

Settings updated successfully

​

orgId

string

required

​

orgSlug

string

required

​

updated

object

required

Show child attributes

Was this page helpful?

YesNo

[Get settings](/docs/api-reference/organization-settings/get-settings)[List connections](/docs/api-reference/connections/list-connections)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
