import { Server } from 'socket.io';

/**
 * Socket Manager - Central manager for Socket.IO instance
 * 
 * This module provides a safe way to access the Socket.IO server instance
 * across the application without circular dependencies.
 */

// Store the Socket.IO server instance
let ioInstance: Server | undefined;

/**
 * Initialize the socket manager with a Socket.IO server instance
 * This should be called once during server startup from index.ts
 */
export function initSocketManager(io: Server): void {
  if (ioInstance) {
    console.warn('[SocketManager] Socket.IO instance already initialized');
  }
  ioInstance = io;
  console.log('[SocketManager] Socket.IO instance registered');
}

/**
 * Get the current Socket.IO server instance
 * Returns undefined if not yet initialized
 */
export function getSocketIO(): Server | undefined {
  return ioInstance;
}

/**
 * Emit an event to a specific room
 * 
 * @param room - The room to emit to (e.g., 'empire:123abc')
 * @param event - The event name
 * @param data - The event data payload
 * @returns true if emitted successfully, false otherwise
 */
export function emitToRoom(room: string, event: string, data: any): boolean {
  if (!ioInstance) {
    console.warn(`[SocketManager] Cannot emit ${event} to ${room}: Socket.IO not initialized`);
    return false;
  }

  try {
    ioInstance.to(room).emit(event, data);
    return true;
  } catch (error) {
    console.error(`[SocketManager] Error emitting ${event} to ${room}:`, error);
    return false;
  }
}

/**
 * Emit an event to a specific user by their empire ID
 * 
 * @param empireId - The empire ID (user identifier)
 * @param event - The event name
 * @param data - The event data payload
 * @returns true if emitted successfully, false otherwise
 */
export function emitToEmpire(empireId: string, event: string, data: any): boolean {
  return emitToRoom(`empire:${empireId}`, event, data);
}

/**
 * Broadcast an event to all connected clients
 * 
 * @param event - The event name
 * @param data - The event data payload
 * @returns true if emitted successfully, false otherwise
 */
export function broadcastEvent(event: string, data: any): boolean {
  if (!ioInstance) {
    console.warn(`[SocketManager] Cannot broadcast ${event}: Socket.IO not initialized`);
    return false;
  }

  try {
    ioInstance.emit(event, data);
    return true;
  } catch (error) {
    console.error(`[SocketManager] Error broadcasting ${event}:`, error);
    return false;
  }
}

/**
 * Check if Socket.IO is initialized and ready
 */
export function isSocketIOReady(): boolean {
  return ioInstance !== undefined;
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): { connected: number; rooms: string[] } {
  if (!ioInstance) {
    return { connected: 0, rooms: [] };
  }

  const sockets = ioInstance.of('/').sockets;
  const rooms: string[] = [];
  
  // Get all room names
  ioInstance.of('/').adapter.rooms.forEach((_, roomName) => {
    rooms.push(roomName);
  });

  return {
    connected: sockets.size,
    rooms
  };
}

/**
 * Emit a fleet update event to the owner empire
 * Convenience wrapper for the common fleet:updated event
 */
export function emitFleetUpdate(empireId: string, fleetData: {
  fleetId: string;
  locationCoord: string;
  name: string;
  sizeCredits: number;
  unitCount: number;
  unitAdded?: {
    unitKey: string;
    creditsCost: number;
  };
}): boolean {
  return emitToEmpire(empireId, 'fleet:updated', fleetData);
}

/**
 * Emit a resource update event to the owner empire
 * Convenience wrapper for the common resources:updated event
 */
export function emitResourceUpdate(empireId: string, resources: any): boolean {
  return emitToEmpire(empireId, 'resources:updated', resources);
}

/**
 * Emit a tech completion event to the owner empire
 * Convenience wrapper for the common tech:completed event
 */
export function emitTechComplete(empireId: string, techData: {
  techKey: string;
  level: number;
  locationCoord: string;
}): boolean {
  return emitToEmpire(empireId, 'tech:completed', techData);
}