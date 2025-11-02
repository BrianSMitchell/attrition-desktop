import React, { useEffect, useState } from 'react';
import { useMessageStore, MessageTab } from '../../stores/messageStore';

import { TIMEOUTS, GAME_CONSTANTS } from '@game/shared';
import { LAYOUT_CLASSES } from '../../constants/css-constants';
const MessagesPage: React.FC = () => {
  const {
    activeTab,
    inboxMessages,
    sentboxMessages,
    selectedMessage,
    isLoading,
    error,
    composeForm,
    summary,
    setActiveTab,
    setSelectedMessage,
    loadSummary,
    loadInbox,
    loadSentbox,
    clearError,
    sendMessage,
    updateComposeForm,
    clearComposeForm,
    markAllAsRead,
    deleteMessage,
  } = useMessageStore();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    loadSummary();
    if (activeTab === 'inbox') {
      loadInbox();
    } else if (activeTab === 'sentbox') {
      loadSentbox();
    }
  }, []);

  const currentMessages = activeTab === 'inbox' ? inboxMessages : sentboxMessages;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.content.trim()) {
      updateComposeForm({ error: 'Please fill in all fields' });
      return;
    }

    const success = await sendMessage({
      toUsername: composeForm.to.trim(),
      subject: composeForm.subject.trim(),
      content: composeForm.content.trim(),
    });

    if (success) {
      // Form cleared automatically by store
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (deleteConfirm === messageId) {
      await deleteMessage(messageId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(messageId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), TIMEOUTS.THREE_SECONDS);
    }
  };

  const formatMessageDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (GAME_CONSTANTS.MILLISECONDS_PER_SECOND * GAME_CONSTANTS.SECONDS_PER_MINUTE));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMinutes < 60) {
        return diffMinutes <= 1 ? 'just now' : `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown date';
    }
  };

  const TabButton: React.FC<{ tab: MessageTab; label: string; count?: number }> = ({
    tab,
    label,
    count,
  }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white border-b-2 border-blue-400'
            : 'bg-gray-700 text-gray-300 hover:text-white hover:bg-gray-600'
        }`}
      >
        {label}
        {typeof count === 'number' && count > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="game-card">
        <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
          <h1 className="text-2xl font-bold">Messages</h1>
          {summary && (
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Total: {summary.totalMessages}</span>
              <span>Unread: {summary.unreadMessages}</span>
              {activeTab === 'inbox' && summary.unreadMessages > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Mark All Read
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="game-card p-0">
        <div className="border-b border-gray-600">
          <div className="flex space-x-1 p-4">
            <TabButton
              tab="inbox"
              label="Inbox"
              count={summary?.unreadMessages}
            />
            <TabButton tab="sentbox" label="Sentbox" />
            <TabButton tab="compose" label="Compose" />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-900/30 border border-red-700 text-red-300">
            <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-300"
              >
                âœ•
              </button>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* Inbox/Sentbox Tab Content */}
          {(activeTab === 'inbox' || activeTab === 'sentbox') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200">
                  {activeTab === 'inbox' ? 'Inbox' : 'Sent Messages'}
                </h3>
                
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {!isLoading && currentMessages.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No messages found
                  </div>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {currentMessages.map((message) => (
                    <div
                      key={message._id}
                      onClick={() => {
                        try {
                          clearError(); // Clear any previous errors
                          
                          // Validate message data before selecting
                          if (!message || !message._id) {
                            console.error('Invalid message data:', message);
                            return;
                          }
                          
                          setSelectedMessage(message);
                        } catch (error) {
                          console.error('Error selecting message:', error);
                        }
                      }}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedMessage?._id === message._id
                          ? 'bg-blue-900/50 border border-blue-700'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-200">
                              {activeTab === 'inbox' ? message.from.username : message.to.username}
                            </span>
                            {activeTab === 'inbox' && !message.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <div className="text-sm text-gray-300 truncate">
                            {message.subject}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatMessageDate(message.createdAt)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMessage(message._id);
                          }}
                          className={`text-xs px-2 py-1 rounded ${
                            deleteConfirm === message._id
                              ? 'bg-red-600 text-white'
                              : 'text-gray-400 hover:text-red-400'
                          }`}
                        >
                          {deleteConfirm === message._id ? 'Confirm' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message Detail */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200">Message Detail</h3>
                
                {selectedMessage ? (
                  <div className="bg-gray-800 rounded p-4 space-y-4">
                    <div className="border-b border-gray-600 pb-3">
                      <div className="text-sm text-gray-400 space-y-1">
                        <div>
                          <span className="font-medium">From:</span> {selectedMessage.from.username}
                          {selectedMessage.from.empireName && (
                            <span className="ml-1 text-gray-500">({selectedMessage.from.empireName})</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">To:</span> {selectedMessage.to.username}
                          {selectedMessage.to.empireName && (
                            <span className="ml-1 text-gray-500">({selectedMessage.to.empireName})</span>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {formatMessageDate(selectedMessage.createdAt)}
                        </div>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-200 mt-2">
                        {selectedMessage.subject}
                      </h4>
                    </div>
                    
                    <div className="text-gray-300 whitespace-pre-wrap">
                      {selectedMessage.content}
                    </div>

                    {activeTab === 'inbox' && (
                      <div className="flex space-x-2 pt-3">
                        <button
                          onClick={() => {
                            updateComposeForm({
                              to: selectedMessage.from.username,
                              subject: `Re: ${selectedMessage.subject}`,
                              content: '',
                            });
                            setActiveTab('compose');
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded p-8 text-center text-gray-400">
                    Select a message to view details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Compose Tab Content */}
          {activeTab === 'compose' && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Compose Message</h3>
              
              {composeForm.error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded">
                  {composeForm.error}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label htmlFor="to" className="block text-sm font-medium text-gray-300 mb-2">
                    To (Username)
                  </label>
                  <input
                    type="text"
                    id="to"
                    value={composeForm.to}
                    onChange={(e) => updateComposeForm({ to: e.target.value })}
                    placeholder="Enter recipient username"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={composeForm.isSending}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={composeForm.subject}
                    onChange={(e) => updateComposeForm({ subject: e.target.value })}
                    placeholder="Enter message subject"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={composeForm.isSending}
                  />
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    id="content"
                    value={composeForm.content}
                    onChange={(e) => updateComposeForm({ content: e.target.value })}
                    placeholder="Enter your message..."
                    rows={8}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={composeForm.isSending}
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={composeForm.isSending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {composeForm.isSending ? 'Sending...' : 'Send Message'}
                  </button>
                  <button
                    type="button"
                    onClick={clearComposeForm}
                    disabled={composeForm.isSending}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;

