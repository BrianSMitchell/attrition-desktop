# Quickstart - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/quickstart
**Scraped:** 2025-10-08 18:00:03

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Getting Started

Quickstart

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

  * Memory API
  * Memory Router



**Using Vercel AI SDK?** Check out the [AI SDK integration](/docs/ai-sdk/overview) for the cleanest implementation with `@supermemory/tools/ai-sdk`.

## 

​

Memory API

**Step 1.** Sign up for [Supermemory’s Developer Platform](http://console.supermemory.ai) to get the API key. Click on **API Keys - > Create API Key** to generate one.

  * Python

  * Typescript

  * cURL




**Step 2.** Install the Supermemory client

Copy

Ask AI
    
    
    pip install supermemory
    

**Step 3.** Run this in your terminal to create an environment variable with your API key:

Copy

Ask AI
    
    
    export SUPERMEMORY_API_KEY=“YOUR_API_KEY”
    

**Step 4.** Import the module in your python file:

Copy

Ask AI
    
    
    from supermemory import Supermemory
    import os
    
    
    client = Supermemory(api_key=os.environ.get("SUPERMEMORY_API_KEY"))
    

**Step 5.** Add your first memory as follows:

Copy

Ask AI
    
    
    # Create one rich memory about quantum computing applications
    memory_content = """Quantum computing represents a paradigm shift in computational power, leveraging quantum mechanical phenomena like superposition and entanglement to solve problems that are intractable for classical computers.
    
    
    The field emerged from theoretical work in the 1980s, when physicist Richard Feynman proposed that quantum systems could simulate other quantum systems more efficiently than classical computers. This insight led to the development of quantum algorithms like Shor's algorithm for factoring large numbers and Grover's algorithm for unstructured search problems.
    
    
    Today, quantum computing applications span multiple domains: in cryptography, quantum computers threaten current encryption standards while enabling new quantum-resistant protocols; in drug discovery, they can simulate molecular interactions with unprecedented accuracy; in optimization problems like logistics and financial modeling, they offer exponential speedups for certain classes of problems.
    
    
    Major tech companies including IBM, Google, and Microsoft have invested billions in quantum computing research, while startups like Rigetti Computing and IonQ focus on specific hardware approaches. The race for quantum advantage - demonstrating a quantum computer solving a problem faster than any classical computer - has become a key milestone in the field.
    
    
    Despite the promise, significant challenges remain: quantum decoherence, error correction, and scaling qubit counts while maintaining coherence. Researchers are exploring various approaches including superconducting qubits, trapped ions, topological qubits, and photonic systems, each with different trade-offs between coherence time, gate fidelity, and scalability."""
    
    
    # Add the memory to Supermemory
    response = client.memories.add(
        content=memory_content,
        container_tag="quantum-computing",
        metadata={
            "category": "technology-overview",
            "topic": "quantum-computing",
            "complexity": "intermediate",
            "word_count": len(memory_content.split())
        }
    )
    
    
    print(f"Memory added successfully!")
    print(f"Memory ID: {response.id}")
    print(f"Content length: {len(memory_content)} characters")
    

Run your code. The output is as follows:

Copy

Ask AI
    
    
    Memory added successfully!
    Memory ID: uLtGU14SBDzfsvefYWbwe7
    Content length: 1701 characters
    

**Step 6.** Search for this memory as follows:

Copy

Ask AI
    
    
    results = client.search.memories(q="what are some applications of quantum computing?", limit=3)
    
    
    print(results)
    

The output is as follows:

Copy

Ask AI
    
    
    SearchMemoriesResponse(
        results=[
            Result(
                id="Bn1uc1yQdw3Huf8oitruwF",
                memory="Quantum computing applications include cryptography (threatening current encryption standards, enabling quantum-resistant protocols), drug discovery (simulating molecular interactions), and optimization problems (logistics, financial modeling, offering exponential speedups).",
                metadata=None,
                similarity=0.7920647723809932,
                updated_at=datetime.datetime(
                    2025, 8, 24, 5, 41, 55, 87000, tzinfo=datetime.timezone.utc
                ),
                context=ResultContext(children=[], parents=[]),
                documents=None,
                version=1.0,
                updatedAt="2025-08-24T05:41:55.087Z",
                rootMemoryId="Bn1uc1yQdw3Huf8oitruwF",
            ),
            Result(
                id="4aCa4oM8praVBCWdNksjxf",
                memory="Quantum computing is a paradigm shift in computational power, leveraging quantum mechanical phenomena like superposition and entanglement to solve problems intractable for classical computers.",
                metadata=None,
                similarity=0.7198909950191389,
                updated_at=datetime.datetime(
                    2025, 8, 24, 5, 41, 55, 87000, tzinfo=datetime.timezone.utc
                ),
                context=ResultContext(children=[], parents=[]),
                documents=None,
                version=1.0,
                updatedAt="2025-08-24T05:41:55.087Z",
                rootMemoryId="4aCa4oM8praVBCWdNksjxf",
            ),
            Result(
                id="8vzhZhBCuqyrLNXtzBDx7y",
                memory="IBM, Google, and Microsoft have invested billions in quantum computing research.",
                metadata=None,
                similarity=0.6960905375426799,
                updated_at=datetime.datetime(
                    2025, 8, 24, 5, 41, 55, 87000, tzinfo=datetime.timezone.utc
                ),
                context=ResultContext(children=[], parents=[]),
                documents=None,
                version=1.0,
                updatedAt="2025-08-24T05:41:55.087Z",
                rootMemoryId="8vzhZhBCuqyrLNXtzBDx7y",
            ),
        ],
        timing=214.0,
        total=3.0,
    )
    

Awesome! Now that you’ve made your first request, explore all of Supermemory’s features in detail and how you can use them in your app.

## 

​

Memory Router

Learn how you can add the Memory Router to your existing LLM requests. The memory router works as a proxy on top of LLM calls. When conversations get very long, it automatically chunks them for optimal performance, retrieves the most relevant information from the history, and balances token usage + cost. The best part is that it requires no changes to your application logic. Here’s how to get started: **Step 1.** Sign up for [Supermemory’s Developer Platform](http://console.supermemory.ai) to get the API key. Click on **API Keys - > Create API Key** to generate one. **Step 2.** Get your LLM provider’s API key

  * [OpenAI](https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key)
  * [Gemini](https://ai.google.dev/gemini-api/docs/api-key)
  * [Anthropic](https://docs.anthropic.com/en/api/admin-api/apikeys/get-api-key)
  * [Groq](https://console.groq.com/keys)

**Step 3.** Append Supermemory’s URL to your LLM provider’s OpenAI-compatible API URL:

OpenAI

Anthropic

Gemini

Groq

Others

Copy

Ask AI
    
    
    https://api.supermemory.ai/v3/https://api.openai.com/v1/
    

  * Typescript

  * Python

  * cURL




**Step 4.** Install the dependencies

Copy

Ask AI
    
    
    npm install openai
    

**Step 5.** Set two environment variables in your environment: one for Supermemory, and one for your model provider.

Copy

Ask AI
    
    
    export SUPERMEMORY_API_KEY=“your_api_key_here”
    
    # export OPENAI_API_KEY/ANTHROPIC_API_KEY/GEMINI_API_KEY/GROQ_API_KEY=“api_key_here” (based on your model)
    

**Step 6.** Send a request to the updated endpoint:

OpenAI

Anthropic

Gemini

Groq

Copy

Ask AI
    
    
    import OpenAI from 'openai';
    
    const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
    defaultHeaders: {
        'x-supermemory-api-key': process.env.SUPERMEMORY_API_KEY!,
        'x-sm-user-id': 'user_123' // Your user identifier
    }
    });
    
    async function chatWithOpenAI() {
    try {
        const response = await client.chat.completions.create({
        model: 'gpt-5',
        messages: [
            { role: 'user', content: 'Hello my name is Naman. How are you?' }
        ],
        max_tokens: 1000,
        temperature: 0.7
        });
    
        console.log('OpenAI Response:', response.choices[0].message.content);
        return response;
    } catch (error) {
        console.error('Error with OpenAI:', error);
    }
    }
    
    

Each of these code snippets changes the Base URL based on the OpenAI-compatible API URL given by the model providers. Some of the key parameters to note are:

  * `apiKey`: Your model provider’s API key
  * `x-supermemory-api-key`: Your Supermemory API key
  * `x-sm-user-id`: Scope conversations by user with a user ID. This will enable cross-conversation memory, meaning users can reference other chats and draw information from them.

Additionally, while not shown in this quickstart, you can also pass an `x-sm-conversation-id` header.Then, you won’t have to send the entire array of messages to the LLM as conversation history. Supermemory will handle it.If you run the above code blocks, you’ll get an output from your LLM like this:

Copy

Ask AI
    
    
    “Hello, Naman! I'm just a computer program, so I don't have feelings, but I'm here and ready to help you. How can I assist you today?”
    

After that, if you modify the request to ask, ‘What is my name?’ instead, you’ll get the following response:

Copy

Ask AI
    
    
    Your name is Naman.
    

Thus, the memory router is working!

For additional reference, here are links to the model providers’ documentation:

  * [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
  * [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
  * [Google Gemini API](https://ai.google.dev/docs)
  * [Groq API Documentation](https://console.groq.com/docs)



Was this page helpful?

YesNo

[Memory API vs Router](/docs/routervsapi)[Memory vs RAG](/docs/memory-vs-rag)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
