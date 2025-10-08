# Analytics & Monitoring - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/analytics
**Scraped:** 2025-10-08 18:00:11

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Memory API

Analytics & Monitoring

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

  * Overview
  * Usage Statistics
  * Endpoint
  * Parameters
  * Example Request
  * Response Schema
  * Error Monitoring
  * Endpoint
  * Parameters
  * Example Request
  * Response Schema
  * Detailed Logs
  * Endpoint
  * Parameters
  * Example Request
  * Response Schema
  * Rate Limits



Monitor your Supermemory usage with detailed analytics on API calls, errors, and performance metrics.

## 

​

Overview

The Analytics API provides comprehensive insights into your Supermemory usage:

  * **Usage Statistics** : Track API calls by type, hourly trends, and per-API key breakdown
  * **Error Monitoring** : Identify top error types and patterns
  * **Detailed Logs** : Access complete request/response logs for debugging
  * **Performance Metrics** : Monitor average response times and processing duration



Analytics data is available for your entire organization and can be filtered by time period.

## 

​

Usage Statistics

Get comprehensive usage statistics including hourly breakdowns and per-key metrics.

### 

​

Endpoint

`GET /v3/analytics/usage`

### 

​

Parameters

Parameter| Type| Description  
---|---|---  
`from`| string (ISO 8601)| Start date/time for the period  
`to`| string (ISO 8601)| End date/time for the period  
`period`| string| Alternative to `from`: `1h`, `24h`, `7d`, `30d`  
`page`| integer| Page number for pagination (default: 1)  
`limit`| integer| Items per page (default: 20, max: 100)  
  
### 

​

Example Request

TypeScript

Python

cURL

Copy

Ask AI
    
    
    // Get usage for the last 24 hours
    const usage = await fetch('https://api.supermemory.ai/v3/analytics/usage?period=24h', {
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`
      }
    });
    
    const data = await usage.json();
    

### 

​

Response Schema

Copy

Ask AI
    
    
    {
      "usage": [
        {
          "type": "add",
          "count": 1523,
          "avgDuration": 245.5,
          "lastUsed": "2024-01-15T14:30:00Z"
        },
        {
          "type": "search",
          "count": 3421,
          "avgDuration": 89.2,
          "lastUsed": "2024-01-15T14:35:00Z"
        }
      ],
      "hourly": [
        {
          "hour": "2024-01-15T14:00:00Z",
          "count": 156,
          "avgDuration": 125.3
        }
      ],
      "byKey": [
        {
          "keyId": "key_abc123",
          "keyName": "Production API",
          "count": 2341,
          "avgDuration": 98.7,
          "lastUsed": "2024-01-15T14:35:00Z"
        }
      ],
      "totalMemories": 45678,
      "pagination": {
        "currentPage": 1,
        "limit": 20,
        "totalItems": 150,
        "totalPages": 8
      }
    }
    

## 

​

Error Monitoring

Track and analyze errors to identify issues and improve reliability.

### 

​

Endpoint

`GET /v3/analytics/errors`

### 

​

Parameters

Same as usage endpoint - supports `from`, `to`, `period`, `page`, and `limit`.

### 

​

Example Request

TypeScript

Python

cURL

Copy

Ask AI
    
    
    // Get errors from the last 24 hours
    const errors = await fetch('https://api.supermemory.ai/v3/analytics/errors?period=24h', {
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`
      }
    });
    
    const data = await errors.json();
    

### 

​

Response Schema

Copy

Ask AI
    
    
    {
      "totalErrors": 234,
      "errorRate": 0.023,
      "topErrors": [
        {
          "type": "ValidationError",
          "count": 89,
          "statusCodes": [400],
          "lastOccurred": "2024-01-15T14:30:00Z"
        },
        {
          "type": "RateLimitError",
          "count": 45,
          "statusCodes": [429],
          "lastOccurred": "2024-01-15T13:15:00Z"
        }
      ],
      "timeline": [
        {
          "time": "2024-01-15T14:00:00Z",
          "count": 12,
          "types": ["ValidationError", "NotFoundError"]
        }
      ],
      "byStatusCode": {
        "400": 89,
        "404": 34,
        "429": 45,
        "500": 66
      }
    }
    

## 

​

Detailed Logs

Access complete request/response logs for debugging and auditing.

### 

​

Endpoint

`GET /v3/analytics/logs`

### 

​

Parameters

Same as usage endpoint, plus optional filters:

  * `type`: Filter by request type (add, search, update, delete)
  * `statusCode`: Filter by HTTP status code
  * `keyId`: Filter by specific API key



### 

​

Example Request

TypeScript

Python

cURL

Copy

Ask AI
    
    
    // Get recent failed requests
    const logs = await fetch('https://api.supermemory.ai/v3/analytics/logs?period=1h&statusCode=500', {
      headers: {
        'Authorization': `Bearer ${SUPERMEMORY_API_KEY}`
      }
    });
    
    const data = await logs.json();
    

### 

​

Response Schema

Copy

Ask AI
    
    
    {
      "logs": [
        {
          "id": "req_xyz789",
          "createdAt": "2024-01-15T14:30:00Z",
          "type": "search",
          "statusCode": 200,
          "duration": 89,
          "input": {
            "q": "user query",
            "limit": 10
          },
          "output": {
            "results": 10,
            "processingTime": 85
          }
        }
      ],
      "pagination": {
        "currentPage": 1,
        "limit": 20,
        "totalItems": 500,
        "totalPages": 25
      }
    }
    

## 

​

Rate Limits

Analytics endpoints have the following rate limits:

  * 100 requests per minute per organization
  * Maximum time range: 90 days
  * Maximum page size: 100 items



Analytics data is retained for 90 days. For longer retention, export and store the data in your own systems.

Was this page helpful?

YesNo

[Organization Settings](/docs/org-settings)[Use Cases](/docs/overview/use-cases)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
