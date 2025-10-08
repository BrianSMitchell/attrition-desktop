# Grouping and filtering - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/search/filtering
**Scraped:** 2025-10-08 18:00:06

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

Grouping and filtering

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [Your Dashboard](https://console.supermemory.ai)
  * [Developer Platform](/docs/intro)



##### Getting Started

  * [Overview](/docs/intro)
  * [Memory API vs Router](/docs/routervsapi)
  * [Quickstart](/docs/quickstart)
  * [Memory vs RAG](/docs/memory-vs-rag)



##### Memory API

  * [How Supermemory Works](/docs/how-it-works)
  * Add Memories

  * Search Memories

  * [Grouping and filtering](/docs/search/filtering)
  * [Track Processing Status](/docs/memory-api/track-progress)
  * List Memories

  * [Update & Delete Memories](/docs/update-delete-memories/overview)
  * Connectors

  * [Organization Settings](/docs/org-settings)
  * [Analytics & Monitoring](/docs/analytics)
  * [Use Cases](/docs/overview/use-cases)



##### Memory Router

  * [Overview](/docs/memory-router/overview)
  * [Usage](/docs/memory-router/usage)
  * [Use with Memory API](/docs/memory-router/with-memory-api)



##### Migration Guides

  * [From Mem0](/docs/migration/from-mem0)



##### Deployment

  * [Self Hosting](/docs/deployment/self-hosting)



On this page

  * Container Tags
  * Document Search (v3/search)
  * Memory Search (v4/search)
  * Basic Metadata Filtering
  * Numeric Filtering
  * Array Contains Filtering
  * Basic Array Contains
  * Array Contains with Negation
  * Multiple Array Contains Conditions
  * Array Contains with OR Logic
  * OR Conditions
  * Complex Nested Conditions
  * Negation Filters
  * Document-Specific Search
  * Filter Best Practices
  * Common Filter Patterns
  * User-Specific Content
  * Recent High-Quality Content
  * Multi-Category Search
  * Team Member Participation
  * Exclude Specific Teams
  * Complex Meeting Filter



Supermemory supports filtering search results using container tags, metadata conditions, and advanced filtering techniques for both `/v3/search` and `/v4/search` endpoints.

## 

​

Container Tags

Container tags group memories by user, project, or organization. They’re the primary way to isolate search results. **Important** : Container tags use **exact array matching**. A document with `["technology", "quantum-computing"]` will NOT match a search for `["technology"]`. The arrays must be identical.

### 

​

Document Search (v3/search)

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Single container tag
    const results = await client.search.documents({
      q: "machine learning",
      containerTags: ["user_123"],
      limit: 10
    });
    
    // Multiple container tags
    const results2 = await client.search.documents({
      q: "project status",
      containerTags: ["project_ai", "team_research"],
      limit: 10
    });
    

### 

​

Memory Search (v4/search)

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Note: singular "containerTag" for v4/search
    const results = await client.search.memories({
      q: "research findings",
      containerTag: "user_123",  // Single string, not array
      limit: 5
    });
    

**Container Tag Differences** :

  * `/v3/search` uses `containerTags` (plural array) with exact array matching
  * `/v4/search` uses `containerTag` (singular string) for single tag filtering
  * Exact matching means `["user", "project"]` ≠ `["user"]`



## 

​

Basic Metadata Filtering

Filter by metadata fields with simple conditions:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "artificial intelligence",
      filters: {
        AND: [
          {
            key: "category",
            value: "technology",
            negate: false
          }
        ]
      },
      limit: 10
    });
    

## 

​

Numeric Filtering

Filter by numeric values with operators:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "research papers",
      filters: {
        AND: [
          {
            filterType: "numeric",
            key: "readingTime",
            value: "10",
            numericOperator: "<=",
            negate: false
          },
          {
            filterType: "numeric",
            key: "wordCount",
            value: "1000",
            numericOperator: ">=",
            negate: false
          }
        ]
      },
      limit: 10
    });
    

## 

​

Array Contains Filtering

Filter by array values like participants, tags, or categories. The `array_contains` filter type checks if an array field contains a specific value.

### 

​

Basic Array Contains

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "meeting notes",
      filters: {
        AND: [
          {
            key: "participants",
            value: "john.doe",
            filterType: "array_contains"
          }
        ]
      },
      limit: 10
    });
    

### 

​

Array Contains with Negation

Exclude documents that contain specific values in arrays:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "team meetings",
      filters: {
        AND: [
          {
            key: "participants",
            value: "john.doe",
            filterType: "array_contains",
            negate: true  // Exclude meetings with john.doe
          }
        ]
      },
      limit: 10
    });
    

### 

​

Multiple Array Contains Conditions

Find documents with multiple required participants:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "project planning",
      filters: {
        AND: [
          {
            key: "participants",
            value: "project.manager",
            filterType: "array_contains"
          },
          {
            key: "participants",
            value: "lead.developer",
            filterType: "array_contains"
          },
          {
            key: "tags",
            value: "urgent",
            filterType: "array_contains"
          }
        ]
      },
      limit: 10
    });
    

### 

​

Array Contains with OR Logic

Find documents with any of several participants:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "weekly reports",
      filters: {
        OR: [
          {
            key: "reviewers",
            value: "senior.manager",
            filterType: "array_contains"
          },
          {
            key: "reviewers",
            value: "department.head",
            filterType: "array_contains"
          },
          {
            key: "reviewers",
            value: "project.lead",
            filterType: "array_contains"
          }
        ]
      },
      limit: 15
    });
    

## 

​

OR Conditions

Combine multiple conditions with OR logic:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "technology updates",
      filters: {
        OR: [
          {
            key: "category",
            value: "ai",
            negate: false
          },
          {
            key: "category",
            value: "machine-learning",
            negate: false
          },
          {
            key: "topic",
            value: "neural-networks",
            negate: false
          }
        ]
      },
      limit: 10
    });
    

## 

​

Complex Nested Conditions

Combine AND and OR logic for advanced filtering:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "research publications",
      filters: {
        AND: [
          {
            key: "status",
            value: "published",
            negate: false
          },
          {
            OR: [
              {
                key: "category",
                value: "ai",
                negate: false
              },
              {
                key: "category",
                value: "machine-learning",
                negate: false
              }
            ]
          },
          {
            filterType: "numeric",
            key: "year",
            value: "2023",
            numericOperator: ">=",
            negate: false
          }
        ]
      },
      limit: 15
    });
    

## 

​

Negation Filters

Exclude specific values with negation:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "machine learning",
      filters: {
        AND: [
          {
            key: "category",
            value: "ai",
            negate: false
          },
          {
            key: "status",
            value: "draft",
            negate: true  // Exclude drafts
          },
          {
            key: "author",
            value: "deprecated_user",
            negate: true  // Exclude specific author
          }
        ]
      },
      limit: 10
    });
    

## 

​

Document-Specific Search

Search within a specific document:

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const results = await client.search.documents({
      q: "neural network architecture",
      docId: "doc_large_textbook_123",  // Search only within this document
      limit: 20
    });
    

## 

​

Filter Best Practices

**Performance Tips** :

  * Use container tags as the primary filter (fastest)
  * Combine with simple metadata filters for precision
  * Avoid complex nested OR conditions for better performance
  * Use numeric operators only when necessary



**Filter Structure** : All conditions must be wrapped in `AND` or `OR` arrays. Single conditions still need the array wrapper: `{"AND": [{"key": "category", "value": "ai"}]}`.

**Supported Operators** :

  * **String** : Exact matching only
  * **Numeric** : `<=`, `>=`, `<`, `>`, `=`
  * **Array** : `array_contains` for checking if array contains value
  * **Negation** : Works with all filter types



## 

​

Common Filter Patterns

### 

​

User-Specific Content

Copy

Ask AI
    
    
    {
      "containerTags": ["user_123"],
      "filters": {
        "AND": [
          {"key": "visibility", "value": "private", "negate": false}
        ]
      }
    }
    

### 

​

Recent High-Quality Content

Copy

Ask AI
    
    
    {
      "filters": {
        "AND": [
          {
            "filterType": "numeric",
            "key": "created_year",
            "value": "2024",
            "numericOperator": ">="
          },
          {
            "filterType": "numeric",
            "key": "quality_score",
            "value": "7",
            "numericOperator": ">="
          }
        ]
      }
    }
    

### 

​

Multi-Category Search

Copy

Ask AI
    
    
    {
      "filters": {
        "OR": [
          {"key": "category", "value": "ai"},
          {"key": "category", "value": "machine-learning"},
          {"key": "category", "value": "data-science"}
        ]
      }
    }
    

### 

​

Team Member Participation

Copy

Ask AI
    
    
    {
      "filters": {
        "AND": [
          {
            "key": "participants",
            "value": "team.lead",
            "filterType": "array_contains"
          },
          {
            "key": "project_tags",
            "value": "high-priority",
            "filterType": "array_contains"
          }
        ]
      }
    }
    

### 

​

Exclude Specific Teams

Copy

Ask AI
    
    
    {
      "filters": {
        "AND": [
          {
            "key": "department",
            "value": "marketing",
            "filterType": "array_contains",
            "negate": true
          },
          {
            "key": "confidential_tags",
            "value": "executive-only",
            "filterType": "array_contains",
            "negate": true
          }
        ]
      }
    }
    

### 

​

Complex Meeting Filter

Copy

Ask AI
    
    
    {
      "filters": {
        "AND": [
          {
            "OR": [
              {
                "key": "attendees",
                "value": "ceo",
                "filterType": "array_contains"
              },
              {
                "key": "attendees",
                "value": "cto",
                "filterType": "array_contains"
              }
            ]
          },
          {
            "key": "meeting_type",
            "value": "cancelled",
            "negate": true
          },
          {
            "filterType": "numeric",
            "key": "duration_minutes",
            "value": "30",
            "numericOperator": ">="
          }
        ]
      }
    }
    

Was this page helpful?

YesNo

[Memories Search (/v4/search)](/docs/search/examples/memory-search)[Track Processing Status](/docs/memory-api/track-progress)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
