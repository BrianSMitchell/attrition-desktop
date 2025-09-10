import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMessageStore } from '../stores/messageStore';

export const useMessages = () => {
  const navigate = useNavigate();
  const { setComposeRecipient, getUnreadCount } = useMessageStore();

  const sendMessageTo = useCallback((username: string, subject?: string) => {
    setComposeRecipient(username);
    if (subject) {
      // If subject is provided, update the compose form
      const { updateComposeForm } = useMessageStore.getState();
      updateComposeForm({ subject });
    }
    navigate('/messages');
  }, [navigate, setComposeRecipient]);

  const goToMessages = useCallback(() => {
    navigate('/messages');
  }, [navigate]);

  const goToInbox = useCallback(() => {
    const { setActiveTab } = useMessageStore.getState();
    setActiveTab('inbox');
    navigate('/messages');
  }, [navigate]);

  const goToCompose = useCallback(() => {
    const { setActiveTab } = useMessageStore.getState();
    setActiveTab('compose');
    navigate('/messages');
  }, [navigate]);

  const hasUnreadMessages = useCallback(() => {
    return getUnreadCount() > 0;
  }, [getUnreadCount]);

  return {
    sendMessageTo,
    goToMessages,
    goToInbox,
    goToCompose,
    hasUnreadMessages,
    unreadCount: getUnreadCount(),
  };
};

export default useMessages;
