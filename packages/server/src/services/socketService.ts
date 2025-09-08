import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { parseCoord } from '@game/shared';

const onlineUserSocketCounts = new Map<string, number>();

export function getOnlineUniqueUsersCount(): number {
  return onlineUserSocketCounts.size;
}

export function setupSocketIO(io: Server): void {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`🔌 User ${user.username} connected via Socket.IO`);

    // Track online unique users (per authenticated user)
    try {
      const userId = (user._id as any).toString?.() ?? String(user._id);
      const current = onlineUserSocketCounts.get(userId) || 0;
      onlineUserSocketCounts.set(userId, current + 1);
    } catch (err) {
      console.warn('Failed to update online user counters:', err);
    }

    // Broadcast presence update
    try {
      io.emit('presence:update', {
        playersOnline: getOnlineUniqueUsersCount(),
        socketsConnected: io.of('/').sockets.size
      });
    } catch {}

    // Join user to their personal room
    socket.join(`user:${user._id}`);

    // Join user to game rooms if they have an empire
    if (user.gameProfile.empireId) {
      socket.join(`empire:${user.gameProfile.empireId}`);
    }

    // Join user to coordinate-based rooms if they have a starting location
    if (user.gameProfile.startingCoordinate) {
      try {
        const coord = parseCoord(user.gameProfile.startingCoordinate);
        // Join galaxy and region rooms for local events
        socket.join(`galaxy:${coord.server}${coord.galaxy.toString().padStart(2, '0')}`);
        socket.join(`region:${coord.server}${coord.galaxy.toString().padStart(2, '0')}:${coord.region.toString().padStart(2, '0')}`);
      } catch (error) {
        console.warn(`Failed to parse starting coordinate for user ${user.username}:`, error);
      }
    }

    // Join the Alpha universe
    socket.join('universe:A');

    // Handle game events
    socket.on('game:ping', (callback) => {
      callback({
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Pong from server'
      });
    });

    socket.on('game:join_universe', (data, callback) => {
      // TODO: Implement universe joining logic
      socket.join('universe:alpha');
      callback({
        success: true,
        message: 'Joined Alpha Universe'
      });
    });

    socket.on('game:empire_update', (data) => {
      // Broadcast empire updates to relevant players
      socket.to(`empire:${user.gameProfile.empireId}`).emit('empire:updated', {
        empireId: user.gameProfile.empireId,
        update: data
      });
    });

    socket.on('disconnect', (reason) => {
      try {
        const userId = (user._id as any).toString?.() ?? String(user._id);
        const curr = onlineUserSocketCounts.get(userId) || 0;
        if (curr <= 1) {
          onlineUserSocketCounts.delete(userId);
        } else {
          onlineUserSocketCounts.set(userId, curr - 1);
        }
      } catch (err) {
        console.warn('Failed to update online user counters on disconnect:', err);
      }

      // Broadcast presence update
      try {
        io.emit('presence:update', {
          playersOnline: getOnlineUniqueUsersCount(),
          socketsConnected: io.of('/').sockets.size
        });
      } catch {}

      console.log(`🔌 User ${user.username} disconnected: ${reason}`);
    });

    // Send welcome message
    socket.emit('game:welcome', {
      message: `Welcome to Alpha Server, ${user.username}!`,
      serverInfo: {
        name: 'Alpha Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Utility functions for broadcasting
  io.broadcastToUniverse = (universeId: string, event: string, data: any) => {
    io.to(`universe:${universeId}`).emit(event, data);
  };

  io.broadcastToEmpire = (empireId: string, event: string, data: any) => {
    io.to(`empire:${empireId}`).emit(event, data);
  };

  io.sendToUser = (userId: string, event: string, data: any) => {
    io.to(`user:${userId}`).emit(event, data);
  };
}

// Extend Socket.IO Server interface
declare module 'socket.io' {
  interface Server {
    broadcastToUniverse(universeId: string, event: string, data: any): void;
    broadcastToEmpire(empireId: string, event: string, data: any): void;
    sendToUser(userId: string, event: string, data: any): void;
  }
}
