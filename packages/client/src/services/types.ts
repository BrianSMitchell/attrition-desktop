/**
 * Service interfaces for dependency injection
 * This file defines the contracts for all services that can be injected into components
 */

import { ServerStatusData } from './statusService';
import { ApiResponse } from '@game/shared';

export interface StatusService {
  getStatus(): Promise<ApiResponse<ServerStatusData>>;
}

export interface MessageService {
  getUnreadCount(): number;
  loadSummary(): Promise<void>;
  initializeSocketListeners(): void;
  cleanupSocketListeners(): void;
}

export interface SocketService {
  getSocket(): any;
}

export interface PlatformService {
  isDesktop(): boolean;
  getVersion(): Promise<string | null>;
}

/**
 * Main services container interface
 */
export interface Services {
  statusService: StatusService;
  messageService: MessageService;
  socketService: SocketService;
  platformService: PlatformService;
}