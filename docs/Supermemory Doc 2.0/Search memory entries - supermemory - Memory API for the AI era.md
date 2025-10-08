# Search memory entries - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/api-reference/search/search-memory-entries
**Scraped:** 2025-10-08 18:00:42

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Search

Search memory entries

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



Search memory entries

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v4/search';
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

402

500

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_abc123",
          "memory": "John prefers machine learning over traditional programming",
          "metadata": {
            "source": "conversation",
            "confidence": 0.9
          },
          "updatedAt": "<string>",
          "similarity": 0.89,
          "version": 3,
          "context": {
            "parents": [
              {
                "relation": "updates",
                "version": -1,
                "memory": "Earlier version: Dhravya is working on a patent at Cloudflare.",
                "metadata": {},
                "updatedAt": "<string>"
              }
            ],
            "children": [
              {
                "relation": "extends",
                "version": 1,
                "memory": "Later version: Dhravya has filed the patent successfully.",
                "metadata": {},
                "updatedAt": "<string>"
              }
            ]
          },
          "documents": [
            {
              "id": "doc_xyz789",
              "title": "Introduction to Machine Learning",
              "type": "web",
              "metadata": {
                "category": "technology",
                "isPublic": true,
                "readingTime": 5,
                "source": "web",
                "tag_1": "ai",
                "tag_2": "machine-learning"
              },
              "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
              "createdAt": "<string>",
              "updatedAt": "<string>"
            }
          ]
        }
      ],
      "timing": 245,
      "total": 5
    }

POST

/

v4

/

search

Try it

Search memory entries

Javascript

Copy

Ask AI
    
    
    const url = 'https://api.supermemory.ai/v4/search';
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

402

500

Copy

Ask AI
    
    
    {
      "results": [
        {
          "id": "mem_abc123",
          "memory": "John prefers machine learning over traditional programming",
          "metadata": {
            "source": "conversation",
            "confidence": 0.9
          },
          "updatedAt": "<string>",
          "similarity": 0.89,
          "version": 3,
          "context": {
            "parents": [
              {
                "relation": "updates",
                "version": -1,
                "memory": "Earlier version: Dhravya is working on a patent at Cloudflare.",
                "metadata": {},
                "updatedAt": "<string>"
              }
            ],
            "children": [
              {
                "relation": "extends",
                "version": 1,
                "memory": "Later version: Dhravya has filed the patent successfully.",
                "metadata": {},
                "updatedAt": "<string>"
              }
            ]
          },
          "documents": [
            {
              "id": "doc_xyz789",
              "title": "Introduction to Machine Learning",
              "type": "web",
              "metadata": {
                "category": "technology",
                "isPublic": true,
                "readingTime": 5,
                "source": "web",
                "tag_1": "ai",
                "tag_2": "machine-learning"
              },
              "summary": "A comprehensive guide to understanding the basics of machine learning and its applications.",
              "createdAt": "<string>",
              "updatedAt": "<string>"
            }
          ]
        }
      ],
      "timing": 245,
      "total": 5
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

containerTag

string

Optional tag this search should be containerized by. This can be an ID for your user, a project ID, or any other identifier you wish to use to filter memories.

Example:

`"user_123"`

​

threshold

number

default:0.6

Threshold / sensitivity for memories selection. 0 is least sensitive (returns most memories, more results), 1 is most sensitive (returns lesser memories, accurate results)

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

include

object

Show child attributes

​

limit

integer

default:10

Maximum number of results to return

Required range: `1 <= x <= 100`

Example:

`10`

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

Memory search results

​

results

object[]

required

Array of matching memory entries with similarity scores

Show child attributes

​

timing

number

required

Search execution time in milliseconds

Example:

`245`

​

total

number

required

Total number of results returned

Example:

`5`

Was this page helpful?

YesNo

[Search documents](/docs/api-reference/search/search-documents)[Get settings](/docs/api-reference/organization-settings/get-settings)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
