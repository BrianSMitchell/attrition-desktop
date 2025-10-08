# Upload a file - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/manage-documents/upload-a-file
**Scraped:** 2025-10-08 18:00:39

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Manage Documents

Upload a file

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



Upload a file

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/file';
    const form = new FormData();
    form.append('file', '{}');
    
    const options = {method: 'POST', headers: {Authorization: 'Bearer <token>'}};
    
    options.body = form;
    
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

/

file

Try it

Upload a file

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/documents/file';
    const form = new FormData();
    form.append('file', '{}');
    
    const options = {method: 'POST', headers: {Authorization: 'Bearer <token>'}};
    
    options.body = form;
    
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

multipart/form-data

File upload form data schema

​

file

file

required

File to upload and process

​

containerTags

string

Optional container tags. Can be either a JSON string of an array (e.g., '["user_123", "project_123"]') or a single string (e.g., 'user_123'). Single strings will be automatically converted to an array.

Example:

`"[\"user_123\", \"project_123\"]"`

​

fileType

string

Optional file type override to force specific processing behavior. Valid values: text, pdf, tweet, google_doc, google_slide, google_sheet, image, video, notion_doc, webpage, onedrive

Example:

`"image"`

​

mimeType

string

Required when fileType is 'image' or 'video'. Specifies the exact MIME type to use (e.g., 'image/png', 'image/jpeg', 'video/mp4', 'video/webm')

​

metadata

string

Optional metadata for the document as a JSON string. This is used to store additional information about the document. Keys must be strings and values can be strings, numbers, or booleans.

Example:

`"{\"category\": \"technology\", \"isPublic\": true, \"readingTime\": 5}"`

#### Response

200

application/json

Successfully uploaded file

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

[Bulk delete documents](/docs/api-reference/manage-documents/bulk-delete-documents)[Search documents](/docs/api-reference/search/search-documents)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
