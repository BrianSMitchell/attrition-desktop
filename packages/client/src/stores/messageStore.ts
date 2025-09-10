import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Message, MessageSummary, SendMessageRequest } from '../services/messageService';
import messageService from '../services/messageService';
import { getSocket } from '../services/socket';

export type MessageTab = 'inbox' | 'sentbox' | 'compose';

interface MessageState {
  // Data
  inboxMessages: Message[];
  sentboxMessages: Message[];
  summary: MessageSummary | null;
  selectedMessage: Message | null;
  
  // UI State
  activeTab: MessageTab;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  
  // Compose form state
  composeForm: {
    to: string;
    subject: string;
    content: string;
    isSending: boolean;
    error: string | null;
  };
}

interface MessageActions {
  // Data actions
  loadInbox: (page?: number) => Promise<void>;
  loadSentbox: (page?: number) => Promise<void>;
  loadSummary: () => Promise<void>;
  sendMessage: (message: SendMessageRequest) => Promise<boolean>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  
  // UI actions
  setActiveTab: (tab: MessageTab) => void;
  setSelectedMessage: (message: Message | null) => void;
  clearError: () => void;
  
  // Compose form actions
  updateComposeForm: (updates: Partial<MessageState['composeForm']>) => void;
  clearComposeForm: () => void;
  setComposeRecipient: (username: string) => void;
  
  // Utility actions
  refreshData: () => Promise<void>;
  getUnreadCount: () => number;
  initializeSocketListeners: () => void;
  cleanupSocketListeners: () => void;
}

const initialComposeForm: MessageState['composeForm'] = {
  to: '',
  subject: '',
  content: '',
  isSending: false,
  error: null,
};

export const useMessageStore = create<MessageState & MessageActions>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    inboxMessages: [],
    sentboxMessages: [],
    summary: null,
    selectedMessage: null,
    activeTab: 'inbox',
    isLoading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    composeForm: { ...initialComposeForm },

    // Data actions
    loadInbox: async (page = 1) => {
      set({ isLoading: true, error: null, currentPage: page });
      try {
        const response = await messageService.getInbox(page, 20);
        if (response.success && response.data) {
          set({
            inboxMessages: response.data.messages,
            totalPages: response.data.totalPages,
            isLoading: false,
          });
        } else {
          set({
            error: response.message || 'Failed to load inbox',
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load inbox',
          isLoading: false,
        });
      }
    },

    loadSentbox: async (page = 1) => {
      set({ isLoading: true, error: null, currentPage: page });
      try {
        const response = await messageService.getSentbox(page, 20);
        if (response.success && response.data) {
          set({
            sentboxMessages: response.data.messages,
            totalPages: response.data.totalPages,
            isLoading: false,
          });
        } else {
          set({
            error: response.message || 'Failed to load sentbox',
            isLoading: false,
          });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to load sentbox',
          isLoading: false,
        });
      }
    },

    loadSummary: async () => {
      try {
        const response = await messageService.getSummary();
        if (response.success && response.data) {
          set({ summary: response.data });
        }
      } catch (error) {
        // Silent fail for summary - not critical
        console.warn('Failed to load message summary:', error);
      }
    },

    sendMessage: async (message: SendMessageRequest) => {
      const state = get();
      set({
        composeForm: {
          ...state.composeForm,
          isSending: true,
          error: null,
        },
      });

      try {
        const response = await messageService.sendMessage(message);
        if (response.success) {
          set({
            composeForm: { ...initialComposeForm },
            activeTab: 'sentbox',
          });
          // Refresh data
          get().loadSentbox();
          get().loadSummary();
          return true;
        } else {
          set({
            composeForm: {
              ...state.composeForm,
              isSending: false,
              error: response.message || 'Failed to send message',
            },
          });
          return false;
        }
      } catch (error) {
        set({
          composeForm: {
            ...state.composeForm,
            isSending: false,
            error: error instanceof Error ? error.message : 'Failed to send message',
          },
        });
        return false;
      }
    },

    markAsRead: async (messageId: string) => {
      try {
        const response = await messageService.markAsRead(messageId);
        if (response.success) {
          // Update local state
          const state = get();
          set({
            inboxMessages: state.inboxMessages.map((msg) =>
              msg._id === messageId ? { ...msg, isRead: true } : msg
            ),
            selectedMessage: state.selectedMessage?._id === messageId
              ? { ...state.selectedMessage, isRead: true }
              : state.selectedMessage,
          });
          // Refresh summary
          get().loadSummary();
        }
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    },

    markAllAsRead: async () => {
      try {
        const response = await messageService.markAllAsRead();
        if (response.success) {
          // Update local state
          const state = get();
          set({
            inboxMessages: state.inboxMessages.map((msg) => ({ ...msg, isRead: true })),
            selectedMessage: state.selectedMessage
              ? { ...state.selectedMessage, isRead: true }
              : null,
          });
          // Refresh summary
          get().loadSummary();
        }
      } catch (error) {
        console.error('Failed to mark all messages as read:', error);
      }
    },

    deleteMessage: async (messageId: string) => {
      try {
        const response = await messageService.deleteMessage(messageId);
        if (response.success) {
          // Update local state
          const state = get();
          set({
            inboxMessages: state.inboxMessages.filter((msg) => msg._id !== messageId),
            sentboxMessages: state.sentboxMessages.filter((msg) => msg._id !== messageId),
            selectedMessage: state.selectedMessage?._id === messageId
              ? null
              : state.selectedMessage,
          });
          // Refresh summary
          get().loadSummary();
        }
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    },

    // UI actions
    setActiveTab: (tab: MessageTab) => {
      set({ activeTab: tab, selectedMessage: null, error: null });
      
      // Load data for the selected tab
      if (tab === 'inbox') {
        get().loadInbox();
      } else if (tab === 'sentbox') {
        get().loadSentbox();
      }
    },

    setSelectedMessage: (message: Message | null) => {
      set({ selectedMessage: message });
      
      // Mark as read if selecting an unread inbox message
      if (message && !message.isRead && get().activeTab === 'inbox') {
        get().markAsRead(message._id);
      }
    },

    clearError: () => {
      set({ error: null });
    },

    // Compose form actions
    updateComposeForm: (updates: Partial<MessageState['composeForm']>) => {
      const state = get();
      set({
        composeForm: {
          ...state.composeForm,
          ...updates,
        },
      });
    },

    clearComposeForm: () => {
      set({ composeForm: { ...initialComposeForm } });
    },

    setComposeRecipient: (username: string) => {
      const state = get();
      set({
        activeTab: 'compose',
        composeForm: {
          ...state.composeForm,
          to: username,
        },
      });
    },

    // Utility actions
    refreshData: async () => {
      const state = get();
      const promises = [get().loadSummary()];
      
      if (state.activeTab === 'inbox') {
        promises.push(get().loadInbox(state.currentPage));
      } else if (state.activeTab === 'sentbox') {
        promises.push(get().loadSentbox(state.currentPage));
      }
      
      await Promise.all(promises);
    },

    getUnreadCount: () => {
      const state = get();
      return state.summary?.unreadMessages || 0;
    },

    initializeSocketListeners: () => {
      const socket = getSocket();
      if (!socket) return;

      // Listen for new messages
      socket.on('message:new', (message: Message) => {
        const state = get();
        
        // Add to inbox if it's an incoming message
        if (state.activeTab === 'inbox') {
          set({
            inboxMessages: [message, ...state.inboxMessages],
          });
        }
        
        // Refresh summary to update unread count
        get().loadSummary();
      });

      // Listen for message read status updates
      socket.on('message:read', (data: { messageId: string; isRead: boolean }) => {
        const state = get();
        set({
          inboxMessages: state.inboxMessages.map((msg) =>
            msg._id === data.messageId ? { ...msg, isRead: data.isRead } : msg
          ),
          selectedMessage: state.selectedMessage?._id === data.messageId
            ? { ...state.selectedMessage, isRead: data.isRead }
            : state.selectedMessage,
        });
        
        // Refresh summary
        get().loadSummary();
      });

      // Listen for message deletions
      socket.on('message:deleted', (data: { messageId: string }) => {
        const state = get();
        set({
          inboxMessages: state.inboxMessages.filter((msg) => msg._id !== data.messageId),
          sentboxMessages: state.sentboxMessages.filter((msg) => msg._id !== data.messageId),
          selectedMessage: state.selectedMessage?._id === data.messageId
            ? null
            : state.selectedMessage,
        });
        
        // Refresh summary
        get().loadSummary();
      });
    },

    cleanupSocketListeners: () => {
      const socket = getSocket();
      if (!socket) return;

      socket.off('message:new');
      socket.off('message:read');
      socket.off('message:deleted');
    },
  }))
);

export default useMessageStore;
