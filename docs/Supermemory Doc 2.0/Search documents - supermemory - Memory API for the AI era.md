# Search documents - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/search/search-documents
**Scraped:** 2025-10-08 18:00:40

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search

Search documents

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



Search documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/search';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"q":"machine learning concepts"}'
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

404

500

Copy

Ask AI
    
    
    {
      "results": [
        {
          "chunks": [
            {
              "content": "Machine learning is a subset of artificial intelligence...",
              "isRelevant": true,
              "score": 0.85
            }
          ],
          "createdAt": "1970-01-01T00:00:00.000Z",
          "documentId": "doc_xyz789",
          "metadata": {
            "category": "technology",
            "isPublic": true,
            "readingTime": 5,
            "source": "web",
            "tag_1": "ai",
            "tag_2": "machine-learning"
          },
          "score": 0.95,
          "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
          "content": "This is the complete content of the document about machine learning concepts...",
          "title": "Introduction to Machine Learning",
          "updatedAt": "1970-01-01T00:00:00.000Z",
          "type": "web"
        }
      ],
      "timing": 123,
      "total": 123
    }

POST

/

v3

/

search

Try it

Search documents

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v3/search';
    const options = {
      method: 'POST',
      headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
      body: '{"q":"machine learning concepts"}'
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

404

500

Copy

Ask AI
    
    
    {
      "results": [
        {
          "chunks": [
            {
              "content": "Machine learning is a subset of artificial intelligence...",
              "isRelevant": true,
              "score": 0.85
            }
          ],
          "createdAt": "1970-01-01T00:00:00.000Z",
          "documentId": "doc_xyz789",
          "metadata": {
            "category": "technology",
            "isPublic": true,
            "readingTime": 5,
            "source": "web",
            "tag_1": "ai",
            "tag_2": "machine-learning"
          },
          "score": 0.95,
          "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
          "content": "This is the complete content of the document about machine learning concepts...",
          "title": "Introduction to Machine Learning",
          "updatedAt": "1970-01-01T00:00:00.000Z",
          "type": "web"
        }
      ],
      "timing": 123,
      "total": 123
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

required

Search query string

Minimum length: `1`

Example:

`"machine learning concepts"`

​

categoriesFilter

enum<string>[]

deprecated

Optional category filters

Show child attributes

Example:
    
    
    ["technology", "science"]

​

chunkThreshold

number

default:0

Threshold / sensitivity for chunk selection. 0 is least sensitive (returns most chunks, more results), 1 is most sensitive (returns lesser chunks, accurate results)

Required range: `0 <= x <= 1`

Example:

`0.5`

​

containerTags

string[]

Optional tags this search should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to filter documents.

Example:
    
    
    ["user_123", "project_123"]

​

docId

string

Optional document ID to search within. You can use this to find chunks in a very large document.

Maximum length: `255`

Example:

`"doc_xyz789"`

​

documentThreshold

number

default:0

Threshold / sensitivity for document selection. 0 is least sensitive (returns most documents, more results), 1 is most sensitive (returns lesser documents, accurate results)

Required range: `0 <= x <= 1`

Example:

`0.5`

​

filters

object

Optional filters to apply to the search. Can be a JSON string or Query object. OR

  * Option 1

  * Option 2




Show child attributes

Example:
    
    
    {  
      "AND": [  
        {  
          "filterType": "metadata",  
          "key": "group",  
          "negate": false,  
          "value": "jira_users"  
        },  
        {  
          "filterType": "numeric",  
          "key": "timestamp",  
          "negate": false,  
          "numericOperator": ">",  
          "value": "1742745777"  
        }  
      ]  
    }

​

includeFullDocs

boolean

default:false

If true, include full document in the response. This is helpful if you want a chatbot to know the full context of the document.

Example:

`false`

​

includeSummary

boolean

default:false

If true, include document summary in the response. This is helpful if you want a chatbot to know the full context of the document.

Example:

`false`

​

limit

integer

default:10

Maximum number of results to return

Required range: `1 <= x <= 100`

Example:

`10`

​

onlyMatchingChunks

boolean

default:true

If true, only return matching chunks without context. Normally, we send the previous and next chunk to provide more context for LLMs. If you only want the matching chunk, set this to true.

Example:

`false`

​

rerank

boolean

default:false

If true, rerank the results based on the query. This is helpful if you want to ensure the most relevant results are returned.

Example:

`false`

​

rewriteQuery

boolean

default:false

If true, rewrites the query to make it easier to find documents. This increases the latency by about 400ms

Example:

`false`

#### Response

200

application/json

Search results

​

results

object[]

required

Show child attributes

​

timing

number

required

​

total

number

required

Was this page helpful?

YesNo

[Upload a file](/docs/api-reference/manage-documents/upload-a-file)[Search memory entries](/docs/api-reference/search/search-memory-entries)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
