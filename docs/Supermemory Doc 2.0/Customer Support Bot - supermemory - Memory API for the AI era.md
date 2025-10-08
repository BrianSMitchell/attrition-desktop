# Customer Support Bot - supermemory | Memory API for the AI era

**Source:** https://supermemory.ai/docs/cookbook/customer-support
**Scraped:** 2025-10-08 18:01:01

---

Skip to main content

[supermemory | Memory API for the AI era home page](/docs)

Search...

⌘K

Search...

Navigation

Quick Start Recipes

Customer Support Bot

[Welcome](/docs/introduction)[Developer Platform](/docs/intro)[SDKs](/docs/memory-api/sdks/overview)[API Reference](/docs/api-reference/manage-documents/add-document)[Cookbook](/docs/cookbook/overview)[Changelog](/docs/changelog/overview)

  * [Cookbook](/docs/cookbook/overview)


  * [Overview](/docs/cookbook/overview)



##### Quick Start Recipes

  * [Personal AI Assistant](/docs/cookbook/personal-assistant)
  * [Document Q&A System](/docs/cookbook/document-qa)
  * [Customer Support Bot](/docs/cookbook/customer-support)
  * [AI SDK Integration](/docs/cookbook/ai-sdk-integration)
  * [Perplexity with memory](https://supermemory.ai/blog/build-your-own-perplexity-in-15-minutes-with-supermemory/)
  * [Chat with Google Drive](https://supermemory.ai/blog/building-an-ai-compliance-chatbot-with-supermemory-and-google-drive/)
  * [Extending context windows in LLMs](https://supermemory.ai/blog/extending-context-windows-in-llms/)



On this page

  * What You’ll Build
  * Prerequisites
  * Implementation
  * Step 1: Customer Context Management
  * Step 2: Support API with Context
  * Step 3: Support Dashboard Interface
  * Testing Your Support System
  * Step 4: Test Support Scenarios



Create a customer support system that remembers every interaction, tracks issues across conversations, and provides personalized support based on customer history and preferences.

## 

​

What You’ll Build

A customer support bot that:

  * **Remembers customer history** across all conversations and channels
  * **Tracks ongoing issues** and follows up automatically
  * **Provides personalized responses** based on customer tier and preferences
  * **Escalates complex issues** to human agents with full context
  * **Learns from resolutions** to improve future responses



## 

​

Prerequisites

  * Node.js 18+ or Python 3.8+
  * Supermemory API key
  * OpenAI API key
  * Customer database or CRM integration
  * Basic understanding of customer support workflows



## 

​

Implementation

### 

​

Step 1: Customer Context Management

  * Next.js

  * Python




lib/customer-context.ts

Copy

Ask AI
    
    
    import { Supermemory } from 'supermemory'
    
    const client = new Supermemory({
      apiKey: process.env.SUPERMEMORY_API_KEY!
    })
    
    interface Customer {
      id: string
      email: string
      name: string
      tier: 'free' | 'pro' | 'enterprise'
      joinDate: string
      preferences?: Record<string, any>
    }
    
    interface SupportTicket {
      id: string
      customerId: string
      subject: string
      status: 'open' | 'pending' | 'resolved' | 'closed'
      priority: 'low' | 'medium' | 'high' | 'urgent'
      category: string
      createdAt: string
      updatedAt: string
      assignedAgent?: string
    }
    
    export class CustomerContextManager {
      private getContainerTag(customerId: string): string {
        return `customer_${customerId}`
      }
    
      async addInteraction(customerId: string, interaction: {
        type: 'chat' | 'email' | 'phone' | 'ticket'
        content: string
        channel: string
        outcome?: 'resolved' | 'escalated' | 'pending'
        agentId?: string
        metadata?: Record<string, any>
      }) {
        try {
          const result = await client.memories.add({
            content: `${interaction.type.toUpperCase()}: ${interaction.content}`,
            containerTag: this.getContainerTag(customerId),
            metadata: {
              type: 'customer_interaction',
              interactionType: interaction.type,
              channel: interaction.channel,
              outcome: interaction.outcome,
              agentId: interaction.agentId,
              timestamp: new Date().toISOString(),
              ...interaction.metadata
            }
          })
    
          return result
        } catch (error) {
          console.error('Failed to add customer interaction:', error)
          throw error
        }
      }
    
      async getCustomerHistory(customerId: string, limit: number = 10) {
        try {
          const memories = await client.memories.list({
            containerTags: [this.getContainerTag(customerId)],
            limit,
            sort: 'updatedAt',
            order: 'desc'
          })
    
          return memories.memories.map(memory => ({
            id: memory.id,
            content: memory.content,
            type: memory.metadata?.interactionType || 'unknown',
            channel: memory.metadata?.channel,
            outcome: memory.metadata?.outcome,
            timestamp: memory.metadata?.timestamp || memory.createdAt,
            agentId: memory.metadata?.agentId
          }))
        } catch (error) {
          console.error('Failed to get customer history:', error)
          throw error
        }
      }
    
      async searchCustomerContext(customerId: string, query: string) {
        try {
          const results = await client.search.memories({
            q: query,
            containerTag: this.getContainerTag(customerId),
            threshold: 0.6,
            limit: 5,
            rerank: true
          })
    
          return results.results.map(result => ({
            content: result.memory,
            similarity: result.similarity,
            metadata: result.metadata
          }))
        } catch (error) {
          console.error('Failed to search customer context:', error)
          throw error
        }
      }
    
      async trackIssue(customerId: string, issue: {
        subject: string
        description: string
        category: string
        priority: 'low' | 'medium' | 'high' | 'urgent'
        status: 'open' | 'pending' | 'resolved'
      }) {
        try {
          const issueContent = `ISSUE: ${issue.subject}\n\nDescription: ${issue.description}\nCategory: ${issue.category}\nPriority: ${issue.priority}\nStatus: ${issue.status}`
    
          const result = await client.memories.add({
            content: issueContent,
            containerTag: this.getContainerTag(customerId),
            metadata: {
              type: 'support_issue',
              subject: issue.subject,
              category: issue.category,
              priority: issue.priority,
              status: issue.status,
              createdAt: new Date().toISOString()
            }
          })
    
          return result
        } catch (error) {
          console.error('Failed to track issue:', error)
          throw error
        }
      }
    
      async updateIssueStatus(issueId: string, status: 'open' | 'pending' | 'resolved' | 'closed', resolution?: string) {
        try {
          // Note: In a real implementation, you'd update the memory
          // For now, we'll add a status update
          const memory = await client.memories.get(issueId)
          const customerId = memory.containerTag.replace('customer_', '')
    
          const updateContent = `ISSUE UPDATE: ${memory.metadata?.subject}\nStatus changed to: ${status}${resolution ? `\nResolution: ${resolution}` : ''}`
    
          return await this.addInteraction(customerId, {
            type: 'ticket',
            content: updateContent,
            channel: 'internal',
            outcome: status === 'resolved' ? 'resolved' : 'pending',
            metadata: {
              originalIssueId: issueId,
              statusUpdate: true
            }
          })
        } catch (error) {
          console.error('Failed to update issue status:', error)
          throw error
        }
      }
    }
    

### 

​

Step 2: Support API with Context

  * Next.js API Route

  * Python FastAPI




app/api/support/chat/route.ts

Copy

Ask AI
    
    
    import { streamText } from 'ai'
    import { createOpenAI } from '@ai-sdk/openai'
    import { CustomerContextManager } from '@/lib/customer-context'
    
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    })
    
    const contextManager = new CustomerContextManager()
    
    interface Customer {
      id: string
      name: string
      email: string
      tier: 'free' | 'pro' | 'enterprise'
      joinDate: string
    }
    
    export async function POST(request: Request) {
      const {
        message,
        customerId,
        customer,
        conversationHistory = [],
        agentId
      } = await request.json()
    
      try {
        // Get customer history and context
        const [history, contextResults] = await Promise.all([
          contextManager.getCustomerHistory(customerId, 5),
          contextManager.searchCustomerContext(customerId, message)
        ])
    
        // Build customer context
        const customerContext = `
    CUSTOMER PROFILE:
    - Name: ${customer.name}
    - Email: ${customer.email}
    - Tier: ${customer.tier.toUpperCase()}
    - Member since: ${customer.joinDate}
    
    RECENT INTERACTIONS (Last 5):
    ${history.map(h => `- ${h.timestamp}: ${h.type.toUpperCase()} - ${h.content.substring(0, 100)}...`).join('\n')}
    
    RELEVANT CONTEXT:
    ${contextResults.map(c => `- ${c.content.substring(0, 150)}... (${(c.similarity * 100).toFixed(1)}% relevant)`).join('\n')}
        `.trim()
    
        // Determine if escalation is needed
        const escalationKeywords = ['angry', 'frustrated', 'cancel', 'refund', 'legal', 'complaint', 'manager', 'supervisor']
        const needsEscalation = escalationKeywords.some(keyword =>
          message.toLowerCase().includes(keyword)
        ) || customer.tier === 'enterprise'
    
        const systemPrompt = `You are a helpful customer support agent with access to complete customer history and context.
    
    CUSTOMER CONTEXT:
    ${customerContext}
    
    SUPPORT GUIDELINES:
    1. **Personalization**: Address the customer by name and reference their tier/history when relevant
    2. **Context Awareness**: Use previous interactions to inform your response
    3. **Tier-Specific Service**:
    - Free: Standard support, guide to self-service resources
    - Pro: Priority support, detailed explanations, proactive suggestions
    - Enterprise: White-glove service, immediate escalation path, dedicated attention
    
    4. **Issue Tracking**: If this is a new issue, categorize it (billing, technical, account, product)
    5. **Escalation**: ${needsEscalation ? 'This interaction may need human agent escalation - provide helpful response but prepare escalation summary' : 'Handle directly unless customer specifically requests human agent'}
    
    RESPONSE STYLE:
    - Professional but friendly
    - Reference specific details from customer history when relevant
    - Provide actionable next steps
    - Include relevant links or resources for their tier level
    
    If you cannot resolve the issue completely, prepare a clear summary for escalation to human agents.`
    
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...conversationHistory,
          { role: 'user' as const, content: message }
        ]
    
        const result = await streamText({
          model: openai('gpt-5'),
          messages,
          temperature: 0.3,
          maxTokens: 800,
          onFinish: async (completion) => {
            // Store this interaction
            await contextManager.addInteraction(customerId, {
              type: 'chat',
              content: `Customer: ${message}\nAgent: ${completion.text}`,
              channel: 'web_chat',
              outcome: needsEscalation ? 'escalated' : 'resolved',
              agentId,
              metadata: {
                customerTier: customer.tier,
                needsEscalation,
                responseLength: completion.text.length
              }
            })
    
            // If this looks like a new issue, track it
            if (message.length > 50 && !contextResults.some(c => c.similarity > 0.8)) {
              const issueCategory = categorizeIssue(message)
              const priority = determinePriority(customer.tier, message)
    
              await contextManager.trackIssue(customerId, {
                subject: message.substring(0, 100),
                description: message,
                category: issueCategory,
                priority,
                status: needsEscalation ? 'pending' : 'open'
              })
            }
          }
        })
    
        return result.toAIStreamResponse({
          data: {
            needsEscalation,
            customerTier: customer.tier,
            contextCount: contextResults.length
          }
        })
    
      } catch (error) {
        console.error('Support chat error:', error)
        return Response.json(
          { error: 'Failed to process support request', details: error.message },
          { status: 500 }
        )
      }
    }
    
    function categorizeIssue(message: string): string {
      const categories = {
        billing: ['bill', 'charge', 'payment', 'refund', 'price', 'cost'],
        technical: ['error', 'bug', 'broken', 'not working', 'crash', 'slow'],
        account: ['login', 'password', 'access', 'settings', 'profile'],
        product: ['feature', 'how to', 'tutorial', 'help', 'guide']
      }
    
      const messageLower = message.toLowerCase()
    
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => messageLower.includes(keyword))) {
          return category
        }
      }
    
      return 'general'
    }
    
    function determinePriority(tier: string, message: string): 'low' | 'medium' | 'high' | 'urgent' {
      const urgentKeywords = ['urgent', 'critical', 'emergency', 'down', 'broken']
      const highKeywords = ['important', 'asap', 'soon', 'problem']
    
      const messageLower = message.toLowerCase()
    
      if (urgentKeywords.some(keyword => messageLower.includes(keyword))) {
        return 'urgent'
      }
    
      if (tier === 'enterprise') {
        return highKeywords.some(keyword => messageLower.includes(keyword)) ? 'urgent' : 'high'
      }
    
      if (tier === 'pro') {
        return highKeywords.some(keyword => messageLower.includes(keyword)) ? 'high' : 'medium'
      }
    
      return 'low'
    }
    

### 

​

Step 3: Support Dashboard Interface

app/support/page.tsx

Copy

Ask AI
    
    
    'use client'
    
    import { useState, useEffect } from 'react'
    import { useChat } from 'ai/react'
    import { CustomerContextManager } from '@/lib/customer-context'
    
    interface Customer {
      id: string
      name: string
      email: string
      tier: 'free' | 'pro' | 'enterprise'
      joinDate: string
    }
    
    interface SupportTicket {
      id: string
      subject: string
      status: 'open' | 'pending' | 'resolved' | 'closed'
      priority: 'low' | 'medium' | 'high' | 'urgent'
      category: string
      createdAt: string
    }
    
    export default function SupportDashboard() {
      const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
      const [customerHistory, setCustomerHistory] = useState<any[]>([])
      const [tickets, setTickets] = useState<SupportTicket[]>([])
      const [showEscalation, setShowEscalation] = useState(false)
      const [agentId] = useState('agent_001') // In real app, get from auth
    
      const contextManager = new CustomerContextManager()
    
      const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/support/chat',
        body: {
          customerId: selectedCustomer?.id,
          customer: selectedCustomer,
          agentId
        },
        onFinish: (message, { data }) => {
          if (data?.needsEscalation) {
            setShowEscalation(true)
          }
          // Refresh customer history
          if (selectedCustomer) {
            loadCustomerHistory(selectedCustomer.id)
          }
        }
      })
    
      // Mock customers - in real app, fetch from your customer database
      const mockCustomers: Customer[] = [
        {
          id: 'cust_001',
          name: 'Sarah Johnson',
          email: '[[email protected]](/cdn-cgi/l/email-protection)',
          tier: 'pro',
          joinDate: '2023-06-15'
        },
        {
          id: 'cust_002',
          name: 'TechCorp Inc',
          email: '[[email protected]](/cdn-cgi/l/email-protection)',
          tier: 'enterprise',
          joinDate: '2022-03-20'
        },
        {
          id: 'cust_003',
          name: 'Mike Chen',
          email: '[[email protected]](/cdn-cgi/l/email-protection)',
          tier: 'free',
          joinDate: '2024-01-10'
        }
      ]
    
      const loadCustomerHistory = async (customerId: string) => {
        try {
          const history = await contextManager.getCustomerHistory(customerId, 10)
          setCustomerHistory(history)
        } catch (error) {
          console.error('Failed to load customer history:', error)
        }
      }
    
      const handleCustomerSelect = async (customer: Customer) => {
        setSelectedCustomer(customer)
        await loadCustomerHistory(customer.id)
        setShowEscalation(false)
      }
    
      const getTierColor = (tier: string) => {
        switch (tier) {
          case 'enterprise': return 'bg-purple-100 text-purple-800'
          case 'pro': return 'bg-blue-100 text-blue-800'
          case 'free': return 'bg-gray-100 text-gray-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
    
      const getPriorityColor = (priority: string) => {
        switch (priority) {
          case 'urgent': return 'bg-red-100 text-red-800'
          case 'high': return 'bg-orange-100 text-orange-800'
          case 'medium': return 'bg-yellow-100 text-yellow-800'
          case 'low': return 'bg-green-100 text-green-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
    
      return (
        <div className="h-screen flex">
          {/* Customer List Sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Customers</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {mockCustomers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedCustomer?.id === customer.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">{customer.name}</div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTierColor(customer.tier)}`}>
                      {customer.tier}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{customer.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Member since {customer.joinDate}
                  </div>
                </div>
              ))}
            </div>
          </div>
    
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {selectedCustomer ? (
              <>
                {/* Customer Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-xl font-semibold">{selectedCustomer.name}</h1>
                      <p className="text-gray-600">{selectedCustomer.email}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 text-sm rounded-full ${getTierColor(selectedCustomer.tier)}`}>
                        {selectedCustomer.tier.toUpperCase()} Customer
                      </span>
                      {showEscalation && (
                        <div className="bg-red-100 text-red-800 px-3 py-1 text-sm rounded-full">
                          Needs Escalation
                        </div>
                      )}
                    </div>
                  </div>
                </div>
    
                <div className="flex-1 flex">
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-lg font-medium">Welcome to Support Chat</div>
                          <p className="mt-2">
                            Start a conversation with {selectedCustomer.name}
                          </p>
                          <div className="mt-4 text-sm">
                            <p><strong>Customer Tier:</strong> {selectedCustomer.tier}</p>
                            <p><strong>Join Date:</strong> {selectedCustomer.joinDate}</p>
                          </div>
                        </div>
                      )}
    
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-2xl p-4 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium">
                                {message.role === 'user' ? selectedCustomer.name : 'Support Agent'}
                              </span>
                              <span className="text-xs opacity-75">
                                {new Date().toLocaleTimeString()}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          </div>
                        </div>
                      ))}
    
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="max-w-2xl p-4 bg-gray-100 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Agent is typing...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
    
                    {/* Chat Input */}
                    <div className="border-t border-gray-200 p-4">
                      <form onSubmit={handleSubmit} className="flex space-x-2">
                        <input
                          value={input}
                          onChange={handleInputChange}
                          placeholder={`Respond to ${selectedCustomer.name}...`}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled={isLoading}
                        />
                        <button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  </div>
    
                  {/* Customer History Sidebar */}
                  <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
                    <div className="p-4 border-b bg-white">
                      <h3 className="font-medium">Customer History</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {customerHistory.map((interaction, index) => (
                        <div key={index} className="bg-white p-3 rounded-lg border text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{interaction.type}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(interaction.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-700 line-clamp-3">
                            {interaction.content.length > 100
                              ? `${interaction.content.substring(0, 100)}...`
                              : interaction.content
                            }
                          </p>
                          {interaction.outcome && (
                            <div className="mt-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                interaction.outcome === 'resolved'
                                  ? 'bg-green-100 text-green-800'
                                  : interaction.outcome === 'escalated'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {interaction.outcome}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
    
                      {customerHistory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No previous interactions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-lg font-medium">Customer Support</div>
                  <p className="mt-2">Select a customer to start a support conversation</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    

## 

​

Testing Your Support System

### 

​

Step 4: Test Support Scenarios

  1. **Test Customer Tiers** :
     * Free tier: Basic responses, self-service guidance
     * Pro tier: Detailed help, proactive suggestions
     * Enterprise: White-glove service, escalation readiness
  2. **Test Memory & Context**:
     * Ask about a previous issue
     * Reference customer preferences
     * Follow up on unresolved tickets
  3. **Test Escalation Triggers** :
     * Use keywords like “angry”, “manager”, “refund”
     * Test enterprise customer automatic escalation

This comprehensive customer support recipe provides the foundation for building intelligent, context-aware support systems that improve customer satisfaction through personalized service.

* * *

_Customize this recipe based on your specific support workflows and customer needs._

Was this page helpful?

YesNo

[Document Q&A System](/docs/cookbook/document-qa)[AI SDK Integration](/docs/cookbook/ai-sdk-integration)

⌘I

Assistant

Responses are generated using AI and may contain mistakes.
