/**
 * Concrete implementations of service interfaces
 * These wrap existing services to conform to the dependency injection interfaces
 */

import { statusService } from './statusService';
import { getSocket } from './socket';
import { useMessageStore } from '../stores/messageStore';
import { 
  StatusService, 
  MessageService, 
  SocketService, 
  PlatformService,
  Services 
} from './types';

class StatusServiceImpl implements StatusService {
  async getStatus() {
    return statusService.getStatus();
  }
}

class MessageServiceImpl implements MessageService {
  getUnreadCount(): number {
    return useMessageStore.getState().getUnreadCount();
  }

  async loadSummary(): Promise<void> {
    return useMessageStore.getState().loadSummary();
  }

  initializeSocketListeners(): void {
    useMessageStore.getState().initializeSocketListeners();
  }

  cleanupSocketListeners(): void {
    useMessageStore.getState().cleanupSocketListeners();
  }
}

class SocketServiceImpl implements SocketService {
  getSocket() {
    return getSocket();
  }
}

class PlatformServiceImpl implements PlatformService {
  isDesktop(): boolean {
    return typeof window !== 'undefined' && !!(window as any).desktop;
  }

  async getVersion(): Promise<string | null> {
    if (!this.isDesktop() || !(window as any).desktop?.getVersion) {
      return null;
    }

    try {
      const version = await (window as any).desktop.getVersion();
      return typeof version === 'string' && version.trim().length > 0 ? version : null;
    } catch {
      return null;
    }
  }
}

/**
 * Create services container with all implementations
 */
export const createServices = (): Services => ({
  statusService: new StatusServiceImpl(),
  messageService: new MessageServiceImpl(),
  socketService: new SocketServiceImpl(),
  platformService: new PlatformServiceImpl(),
});