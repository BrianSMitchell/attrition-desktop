# Memory API vs Router — Which one should I use? - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/routervsapi
**Scraped:** 2025-10-08 18:00:02

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Getting Started

Memory API vs Router — Which one should I use?

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

  * TL;DR
  * FAQs



### 

​

**TL;DR**

  * **Memory API:** You ingest/search/filter memories yourself and decide exactly what goes into the prompt. Maximum control for production apps and custom retrieval.   

  * **Memory Router:** Keep your existing LLM client and just point it at Supermemory. We automatically fetch relevant memories and append them to your prompt.   


Both use the same memory engine underneath, and share a common key (`user_id`). Thus, anything you store via the API is available to the Router, and vice versa, as long as the `user_id` matches.

We’ll first explain how the Router works, because the API is quite straightforward. You send a request to your LLM, and Supermemory acts as a proxy. The Router will automatically remove unnecessary context from the message, search the user’s memories for additional relevant context, append it to the prompt, and send it to the LLM. It also writes new memories asynchronously, so your context keeps expanding without any blockages. The Router is specifically built for conversational memory in chat applications, and its utility shows when your conversations get very long. For you, it leads to:

  * No code refactoring - just swap the base URL with one provided by Supermemory. Read the quickstart to learn more.
  * Better chatbot performance due to long-thread retrieval, when conversations go beyond the model window.
  * Cost savings due to our automatic chunking and context management.

The API, on the other hand, is a full-fledged API you can call in your app to ingest documents, create memories, search them, rerank, etc., with very granular control. The Router is built on top of our API. Technically, you could build your own Memory Router too on top of our API, but it wouldn’t come with the same one-line integration, ease of use, minimal latency, and intelligent token budgeting. Again, both use the same memory engine underneath the hood, so your memories are available across both products. Here’s a quick 30-second flow to decide which one to use for your specific use case:

  * **Already have a working LLM chat and just want it to remember?** Start with the Router.
  * **Building a new app or need strict tenancy, filters, ranking, or custom prompts?** Go to the Memory API.
  * **Need both?** Ingest via API, chat via Router; keep the user_id consistent.
  * **Still unsure?** Pilot on the Router, then graduate parts of the flow to the API as you need more control.

Now, head over to the quickstart to integrate the API/Router in your app within 5 minutes.

## 

​

FAQs

Is the Router just calling the Memory API behind the scenes?

Conceptually, yes. The Router orchestrates the same Supermemory engine operations (retrieve, re-rank, budget, cite) and wraps them around your model call.

Does the Router store new memories automatically?

It can. The create-memory step is asynchronous, so the user’s response isn’t delayed.

What identifies the user’s memory across Router and API?

`user_id`. Keep it consistent across Router and API calls to share the same memory pool.

Was this page helpful?

YesNo

[Overview](/docs/intro)[Quickstart](/docs/quickstart)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
