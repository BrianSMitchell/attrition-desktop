# Self Hosting - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/deployment/self-hosting
**Scraped:** 2025-10-08 18:00:18

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Deployment

Self Hosting

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

  * Prerequisites
  * Enterprise Deployment Package
  * Cloudflare
  * Create Account
  * Create API Token
  * Enable Workers
  * Database
  * LLM Providers
  * OpenAI
  * Anthropic
  * Gemini
  * Groq
  * Email Service Setup
  * Resend
  * Connectors (Optional)
  * Google Drive
  * Microsoft OneDrive
  * Notion
  * Setup deployment files
  * Configure environment variables
  * Deploy
  * Updating Your Deployment



This guide is intended for **enterprise customers only** who have specifically opted for self-hosting as part of their enterprise plan. If you’re on a standard plan, please use our hosted API at [console.supermemory.ai](https://console.supermemory.ai).

## 

​

Prerequisites

Before you start, you’ll need to gather several API keys and set up accounts with various services. This comprehensive guide will walk you through obtaining each required component.

### 

​

Enterprise Deployment Package

Your enterprise deployment package is provided by the supermemory team and contains:

  * Your unique Host ID (`NEXT_PUBLIC_HOST_ID`)
  * The compiled JavaScript bundle
  * The deployment script

Contact your supermemory enterprise representative to receive your deployment package.

### 

​

Cloudflare

#### 

​

Create Account

  1. Go to [cloudflare.com](https://dash.cloudflare.com/sign-up) and create an account
  2. Your **Account ID** is the long randon string in the URL bar



#### 

​

Create API Token

  1. Navigate to [Cloudflare API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens)
  2. Click **“Create Token”**
  3. Use the **“Custom token”** template
  4. Configure the token with these permissions:
     * **Account:AI Gateway:Edit**
     * **Account:Hyperdrive:Edit**
     * **Account:Workers KV Storage:Edit**
     * **Account:Workers R2 Storage:Edit**
  5. Click **“Continue to summary”** → **“Create Token”**
  6. **Important** : Copy and securely store the token immediately (it won’t be shown again)



#### 

​

Enable Workers

  1. In your Cloudflare dashboard, go to **Workers & Pages**
  2. If prompted, accept the Workers terms of service
  3. Choose a subdomain for your workers (e.g., `yourcompany.workers.dev`)

Your `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are now ready.

### 

​

Database

You’ll need to provide a PostgreSQL connection string via the `DATABASE_URL` environment variable. The database must:

  * Support the **pgvector extension** for vector operations
  * Be accessible from Cloudflare Workers
  * Support SSL connections
  * Allow connections from Cloudflare’s IP ranges

Your connection string should follow this format:

Copy

Ask AI
    
    
    postgresql://username:password@hostname:port/database
    

### 

​

LLM Providers

#### 

​

OpenAI

  1. Go to [platform.openai.com](https://platform.openai.com)
  2. Sign in or create an account
  3. Navigate to **API Keys** in the left sidebar
  4. Click **“Create new secret key”**
  5. Name your key (e.g., “supermemory Self-Hosted”)
  6. Copy the key and store it securely
  7. Add billing information if you haven’t already



#### 

​

Anthropic

  1. Go to [console.anthropic.com](https://console.anthropic.com)
  2. Create an account and complete verification
  3. Navigate to **API Keys**
  4. Click **“Create Key”**
  5. Name your key and copy it securely



#### 

​

Gemini

  1. Go to [Google AI Studio](https://aistudio.google.com)
  2. Sign in with your Google account
  3. Click **“Get API key”** → **“Create API key”**
  4. Choose an existing Google Cloud project or create a new one
  5. Copy your API key



#### 

​

Groq

  1. Go to [console.groq.com](https://console.groq.com)
  2. Sign up for an account
  3. Navigate to **API Keys**
  4. Click **“Create API Key”**
  5. Name your key and copy it



### 

​

Email Service Setup

#### 

​

Resend

  1. Go to [resend.com](https://resend.com) and create an account
  2. Navigate to **API Keys**
  3. Click **“Create API Key”**
  4. Name your key (e.g., “supermemory Production”)
  5. Copy the key for `RESEND_API_KEY`
  6. Verify your sending domain in the **Domains** section



### 

​

Connectors (Optional)

#### 

​

Google Drive

  1. Go to [Google Cloud Console](https://console.cloud.google.com)
  2. Create or select a project
  3. Enable the **Google Drive API**
  4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
  5. Configure the OAuth consent screen if required
  6. Choose **Web application**
  7. Add authorized redirect URIs for your domain
  8. Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`



#### 

​

Microsoft OneDrive

  1. Go to [Azure Portal](https://portal.azure.com)
  2. Navigate to **Microsoft Entra ID** → **App registrations**
  3. Click **“New registration”**
  4. Name your app and set redirect URI
  5. Go to **Certificates & secrets** → **New client secret**
  6. Copy the **Application (client) ID** and **Client secret**
  7. Use for `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`



#### 

​

Notion

  1. Go to [Notion Developers](https://developers.notion.com)
  2. Click **“Create new integration”**
  3. Fill in the integration details
  4. Copy the **Internal Integration Token**
  5. Set up OAuth if needed for user connections
  6. Use for `NOTION_CLIENT_ID` and `NOTION_CLIENT_SECRET`



* * *

## 

​

Setup deployment files

Extract the deployment package provided by the supermemory team to your preferred directory:

Copy

Ask AI
    
    
    # Extract the deployment package
    $ unzip supermemory-enterprise-deployment.zip
    $ cd supermemory-deployment
    

* * *

## 

​

Configure environment variables

The deployment script reads **all** environment variables from your shell at runtime. We ship an example file that lists the full set supported by the worker.

Copy

Ask AI
    
    
    # Copy the template and start editing
    $ cp packages/alchemy/env.example .env
    
    # Open the file in your editor of choice and fill in the blanks
    $ $EDITOR .env
    

Below is a quick reference.  
**Required** values are mandatory for a successful deploy – leave optional ones empty if you don’t need the related feature. Name| Required?| Description  
---|---|---  
`NODE_ENV`| ✅| `development`, `staging` or `production`.  
`NEXT_PUBLIC_HOST_ID`| ✅| Your unique Host ID provided by the supermemory team.  
`BETTER_AUTH_SECRET`| ✅| Random 32-byte string – run `openssl rand -base64 32`.  
`BETTER_AUTH_URL`| ✅| Public base URL for the API (no trailing `/`). Example: `https://api.example.com`.  
`DATABASE_URL`| ✅| Postgres connection string (e.g. `postgres://user:pass@host:5432/db`).  
`CLOUDFLARE_ACCOUNT_ID`| ✅| Your Cloudflare account ID.  
`CLOUDFLARE_API_TOKEN`| ✅| Token created in _Prerequisites_.  
`OPENAI_API_KEY`| ✅| Key from [platform.openai.com](https://platform.openai.com).  
`RESEND_API_KEY`| ✅| E-mail provider key if you plan to send e-mails.  
`ANTHROPIC_API_KEY`| | Needed to use Claude models.  
`GEMINI_API_KEY`| | Key for Google Gemini models.  
`GROQ_API_KEY`| | Key for Groq models.  
`AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`| | Enable GitHub OAuth login.  
`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`| | Enable Google OAuth login.  
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`| | Needed for Google Drive connector.  
`MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET`| | Needed for OneDrive connector.  
`NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET`| | Needed for Notion connector.  
`CLOUDFLARE_AI_GATEWAY_NAME` / `CLOUDFLARE_AI_GATEWAY_TOKEN`| | Only if you want to route requests through an AI Gateway.  
`SENTRY_DSN`| | If you use Sentry for error reporting.  
  
* * *

## 

​

Deploy

With your `.env` in place, run the deployment script:

Copy

Ask AI
    
    
    # Run the deployment script provided in your package
    $ bun ./deploy.ts
    

* * *

## 

​

Updating Your Deployment

To update your supermemory deployment, follow the same process as the initial deployment described in the **Deploy** section above. You can reuse your existing `.env` file and add/remove any new environment variables as needed.

* * *

Was this page helpful?

YesNo

[From Mem0](/docs/migration/from-mem0)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
