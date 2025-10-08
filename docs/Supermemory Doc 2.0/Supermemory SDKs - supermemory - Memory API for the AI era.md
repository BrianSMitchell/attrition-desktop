# Supermemory SDKs - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/memory-api/sdks/native
**Scraped:** 2025-10-08 18:00:23

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Supermemory SDKs

Supermemory SDKs

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [SDKs](/docs/memory-api/sdks/overview)


  * [Overview](/docs/memory-api/sdks/overview)



##### Supermemory SDKs

  * [Python and JavaScript SDKs](/docs/memory-api/sdks/native)
  * [`supermemory` on npm](https://www.npmjs.com/package/supermemory)
  * [`supermemory` on pypi](https://pypi.org/project/supermemory/)



##### OpenAI SDK

  * [OpenAI SDK Plugins](/docs/memory-api/sdks/openai-plugins)
  * [NPM link](https://www.npmjs.com/package/@supermemory/tools)



##### AI SDK

  * [Overview](/docs/ai-sdk/overview)
  * [Memory Tools](/docs/ai-sdk/memory-tools)
  * [Infinite Chat](/docs/ai-sdk/infinite-chat)
  * [NPM link](https://www.npmjs.com/package/@supermemory/tools)



On this page

  * Python SDK
  * Installation
  * Usage
  * JavaScript SDK
  * Installation
  * Usage



For more information, see the full updated references at

## [Python SDK](https://pypi.org/project/supermemory/)## [Javascript SDK](https://www.npmjs.com/package/supermemory)

## 

​

Python SDK

## 

​

Installation

Copy

Ask AI
    
    
    # install from PyPI
    pip install --pre supermemory
    

## 

​

Usage

Copy

Ask AI
    
    
    import os
    from supermemory import Supermemory
    
    client = supermemory(
        api_key=os.environ.get("SUPERMEMORY_API_KEY"),  # This is the default and can be omitted
    )
    
    response = client.search.documents(
        q="documents related to python",
    )
    print(response.results)
    

## 

​

JavaScript SDK

## 

​

Installation

Copy

Ask AI
    
    
    npm install supermemory
    

## 

​

Usage

Copy

Ask AI
    
    
    import supermemory from 'supermemory';
    
    const client = new supermemory({
      apiKey: process.env['SUPERMEMORY_API_KEY'], // This is the default and can be omitted
    });
    
    async function main() {
      const response = await client.search.documents({ q: 'documents related to python' });
    
      console.debug(response.results);
    }
    
    main();
    

Was this page helpful?

YesNo

[Overview](/docs/memory-api/sdks/overview)[`supermemory` on npm](/docs/memory-api/sdks/supermemory-npm)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
