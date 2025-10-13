import React, { useEffect, useState } from 'react';
import { getSocket } from '../../services/socket';
import { Message } from '../../services/messageService';
import { Link } from 'react-router-dom';

import { TIMEOUTS } from '@shared/constants/magic-numbers';
interface ToastMessage {
  id: string;
  message: Message;
  timestamp: number;
}

const MessageToast: React.FC = () => {
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      const toastId = `toast-${message._id}-${Date.now()}`;
      const newToast: ToastMessage = {
        id: toastId,
        message,
        timestamp: Date.now(),
      };

      setToastMessages(prev => [...prev, newToast]);

      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToastMessages(prev => prev.filter(toast => toast.id !== toastId));
      }, TIMEOUTS.FIVE_SECONDS);
    };

    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('message:new', handleNewMessage);
    };
  }, []);

  const removeToast = (id: string) => {
    setToastMessages(prev => prev.filter(toast => toast.id !== id));
  };

  if (toastMessages.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toastMessages.map((toast) => (
        <div
          key={toast.id}
          className="bg-blue-600 border border-blue-500 text-white p-4 rounded-lg shadow-lg max-w-sm animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium">📧 New Message</span>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-blue-200 hover:text-white text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="text-sm">
                <div className="font-medium mb-1">
                  From: {toast.message.from.username}
                </div>
                <div className="text-blue-100 truncate">
                  {toast.message.subject}
                </div>
              </div>
              <div className="mt-3">
                <Link
                  to="/messages"
                  onClick={() => removeToast(toast.id)}
                  className="inline-block px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs rounded transition-colors"
                >
                  View Messages
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageToast;
