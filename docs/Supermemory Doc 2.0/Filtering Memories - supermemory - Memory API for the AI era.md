# Filtering Memories - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/list-memories/examples/filtering
**Scraped:** 2025-10-08 18:01:28

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Examples

Filtering Memories

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

    * [Overview](/docs/list-memories/overview)
    * Examples

      * [Basic Listing](/docs/list-memories/examples/basic)
      * [Filtering Memories](/docs/list-memories/examples/filtering)
      * [Pagination](/docs/list-memories/examples/pagination)
      * [Status Monitoring](/docs/list-memories/examples/monitoring)
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

  * Filter by Container Tags
  * Metadata Filtering with SQL Logic
  * Why This Structure?
  * Simple Metadata Filter
  * Multiple Conditions (AND Logic)
  * Alternative Conditions (OR Logic)
  * Complex Nested Logic
  * Array Contains Filtering
  * Basic Array Contains
  * Array Contains with Exclusion
  * Multiple Array Contains (OR Logic)
  * Combined Container Tags + Metadata Filtering



Filter memories using container tags and metadata. The filtering system uses SQL query construction, so you need to structure your filters like database queries.

## 

​

Filter by Container Tags

Container tags use exact array matching - memories must have the exact same tags in the same order.

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Single tag - matches memories with exactly ["user_123"]
    const userMemories = await client.memories.list({
      containerTags: ["user_123"]
    });
    
    // Multiple tags - matches memories with exactly ["user_123", "project_ai"]
    const projectMemories = await client.memories.list({
      containerTags: ["user_123", "project_ai"]
    });
    

## 

​

Metadata Filtering with SQL Logic

The `filters` parameter allows filtering by metadata fields using SQL-like query structures. Since we use SQL query construction in the backend, you need to structure your filters like database queries with explicit AND/OR logic.

### 

​

Why This Structure?

In SQL databases, `AND` has higher precedence than `OR`. Without explicit grouping, a query like:

Copy

Ask AI
    
    
    category = 'programming' OR framework = 'react' AND difficulty = 'advanced'
    

Is interpreted as:

Copy

Ask AI
    
    
    category = 'programming' OR (framework = 'react' AND difficulty = 'advanced')
    

The JSON structure forces explicit grouping to prevent unexpected results.

**Filter Structure Rules:**

  * Always wrap conditions in `AND` or `OR` arrays (even single conditions)
  * Use `JSON.stringify()` to convert the filter object to a string
  * Each condition needs `key`, `value`, and `negate` properties
  * `negate: false` for normal matching, `negate: true` for exclusion



### 

​

Simple Metadata Filter

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Filter by single metadata field
    const programmingMemories = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          { key: "category", value: "programming", negate: false }
        ]
      })
    });
    

### 

​

Multiple Conditions (AND Logic)

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // All conditions must match
    const reactTutorials = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          { key: "category", value: "tutorial", negate: false },
          { key: "framework", value: "react", negate: false },
          { key: "difficulty", value: "beginner", negate: false }
        ]
      })
    });
    

### 

​

Alternative Conditions (OR Logic)

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Any condition can match
    const frontendMemories = await client.memories.list({
      filters: JSON.stringify({
        OR: [
          { key: "framework", value: "react", negate: false },
          { key: "framework", value: "vue", negate: false },
          { key: "framework", value: "angular", negate: false }
        ]
      })
    });
    

### 

​

Complex Nested Logic

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Complex logic: programming AND (react OR advanced difficulty)
    const advancedContent = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          { key: "category", value: "programming", negate: false },
          {
            OR: [
              { key: "framework", value: "react", negate: false },
              { key: "difficulty", value: "advanced", negate: false }
            ]
          }
        ]
      })
    });
    

## 

​

Array Contains Filtering

Filter memories that contain specific values in array fields like participants, tags, or team members.

### 

​

Basic Array Contains

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Find memories where john.doe participated
    const meetingMemories = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          {
            key: "participants",
            value: "john.doe",
            filterType: "array_contains",
            negate: false
          }
        ]
      })
    });
    

### 

​

Array Contains with Exclusion

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Find memories that don't include a specific team member
    const filteredMemories = await client.memories.list({
      filters: JSON.stringify({
        AND: [
          {
            key: "reviewers",
            value: "external.consultant",
            filterType: "array_contains",
            negate: true  // Exclude memories with external consultants
          },
          {
            key: "project_tags",
            value: "internal-only",
            filterType: "array_contains",
            negate: false
          }
        ]
      })
    });
    

### 

​

Multiple Array Contains (OR Logic)

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    // Find memories involving any of several team leads
    const leadershipMemories = await client.memories.list({
      filters: JSON.stringify({
        OR: [
          {
            key: "attendees",
            value: "engineering.lead",
            filterType: "array_contains"
          },
          {
            key: "attendees",
            value: "product.lead",
            filterType: "array_contains"
          },
          {
            key: "attendees",
            value: "design.lead",
            filterType: "array_contains"
          }
        ]
      }),
      sort: "updatedAt",
      order: "desc"
    });
    

## 

​

Combined Container Tags + Metadata Filtering

  * TypeScript

  * Python

  * cURL




Copy

Ask AI
    
    
    const filteredMemories = await client.memories.list({
      containerTags: ["user_123"],
      filters: JSON.stringify({
        AND: [
          { key: "category", value: "tutorial", negate: false },
          { key: "framework", value: "react", negate: false }
        ]
      }),
      sort: "updatedAt",
      order: "desc",
      limit: 50
    });
    

**Common Mistakes:**

  * Using bare condition objects: `{"key": "category", "value": "programming"}`
  * Forgetting JSON.stringify: passing objects instead of strings
  * Missing negate property: always include `"negate": false` or `"negate": true`



**Container Tags vs Metadata Filtering:**

  * Container tags: Exact array matching for organizational grouping
  * Metadata filters: SQL-like queries on custom metadata fields with complex logic
  * Both can be combined for powerful filtering capabilities



Was this page helpful?

YesNo

[Basic Listing](/docs/list-memories/examples/basic)[Pagination](/docs/list-memories/examples/pagination)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
