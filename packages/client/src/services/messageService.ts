import api, { ApiError } from "./api";
import { ApiResponse } from "@game/shared";

export interface Message {
  _id: string;
  from: {
    _id: string;
    username: string;
    empireName?: string;
  };
  to: {
    _id: string;
    username: string;
    empireName?: string;
  };
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageSummary {
  totalMessages: number;
  unreadMessages: number;
  inboxCount: number;
  sentCount: number;
}

export interface SendMessageRequest {
  toUsername: string;
  subject: string;
  content: string;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === "object" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

export const messageService = {
  // Get message summary (unread count, etc.)
  async getSummary(): Promise<ApiResponse<MessageSummary>> {
    try {
      const response = await api.get<ApiResponse<MessageSummary>>("/messages/summary");
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<MessageSummary>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<MessageSummary>;
    }
  },

  // Get inbox messages
  async getInbox(page: number = 1, limit: number = 20): Promise<ApiResponse<{ messages: Message[], totalPages: number }>> {
    try {
      const response = await api.get<ApiResponse<{ messages: Message[], totalPages: number }>>(
        `/messages/inbox?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ messages: Message[], totalPages: number }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ messages: Message[], totalPages: number }>;
    }
  },

  // Get sent messages
  async getSentbox(page: number = 1, limit: number = 20): Promise<ApiResponse<{ messages: Message[], totalPages: number }>> {
    try {
      const response = await api.get<ApiResponse<{ messages: Message[], totalPages: number }>>(
        `/messages/sent?page=${page}&limit=${limit}`
      );
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<{ messages: Message[], totalPages: number }>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<{ messages: Message[], totalPages: number }>;
    }
  },

  // Send a new message
  async sendMessage(message: SendMessageRequest): Promise<ApiResponse<Message>> {
    try {
      const response = await api.post<ApiResponse<Message>>("/messages", message);
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<Message>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<Message>;
    }
  },

  // Mark message as read
  async markAsRead(messageId: string): Promise<ApiResponse<void>> {
    // Validate input
    if (!messageId || typeof messageId !== 'string') {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "Invalid message ID",
      } as ApiResponse<void>;
    }
    
    try {
      const response = await api.patch<ApiResponse<void>>(`/messages/${messageId}/read`);
      return response.data;
    } catch (err) {
      console.error('markAsRead API error:', err);
      
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message || 'Failed to mark message as read',
          details: err.details,
        } as ApiResponse<void>;
      }
      
      // Handle specific error types for better user feedback
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (errorMessage.toLowerCase().includes('timeout')) {
        return {
          success: false,
          code: "TIMEOUT_ERROR",
          message: "Request timed out. Please try again.",
        } as ApiResponse<void>;
      }
      
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error. Please check your connection.",
      } as ApiResponse<void>;
    }
  },

  // Mark all messages as read
  async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      const response = await api.patch<ApiResponse<void>>("/messages/mark-all-read");
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<void>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<void>;
    }
  },

  // Delete a message
  async deleteMessage(messageId: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete<ApiResponse<void>>(`/messages/${messageId}`);
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<void>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<void>;
    }
  },

  // Get message by ID
  async getMessageById(messageId: string): Promise<ApiResponse<Message>> {
    try {
      const response = await api.get<ApiResponse<Message>>(`/messages/${messageId}`);
      return response.data;
    } catch (err) {
      if (isApiErrorLike(err)) {
        return {
          success: false,
          code: err.code,
          message: err.message,
          details: err.details,
        } as ApiResponse<Message>;
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: "Network error",
      } as ApiResponse<Message>;
    }
  },
};

export default messageService;
