// Socket.IO integration examples for real-time messaging with the new system
// These examples show how to integrate the new @game/shared message system
// into existing Socket.IO server and client implementations

import { Server, Socket } from 'socket.io';
import {
  // Message system
  processMessageTemplate,
  createMessage,
  createSystemMessage,
  GameMessage,
  EMPIRE_MESSAGES,
  BUILDING_MESSAGES,
  FLEET_MESSAGES,
  COMBAT_MESSAGES,
  SYSTEM_MESSAGES
} from '@game/shared';

// =============================================================================
// 1. ENHANCED SOCKET.IO SERVER SETUP
// =============================================================================

// Enhanced Socket.IO setup with integrated message system
export function setupEnhancedSocketIO(io: Server): void {
  // Enhanced authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        const errorMessage = createMessage(
          'system',
          'error',
          'Authentication token required for WebSocket connection',
          {
            code: 'AUTH_REQUIRED',
            persistent: true
          }
        );
        return next(new Error(JSON.stringify(errorMessage)));
      }

      // Verify token and attach user data
      const user = await verifyTokenAndGetUser(token);
      if (!user) {
        const errorMessage = createMessage(
          'system',
          'error',
          'Invalid authentication token',
          {
            code: 'AUTH_INVALID',
            persistent: true
          }
        );
        return next(new Error(JSON.stringify(errorMessage)));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      const errorMessage = createSystemMessage(
        'error',
        'Authentication failed',
        { persistent: true }
      );
      next(new Error(JSON.stringify(errorMessage)));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`🔌 User ${user.username} connected via Socket.IO`);

    // Enhanced connection setup
    setupUserRooms(socket, user);
    setupGameEventHandlers(socket, user, io);
    setupMessageHandlers(socket, user, io);
    setupDisconnectHandler(socket, user, io);

    // Send enhanced welcome message
    const welcomeMessage = processMessageTemplate(
      {
        id: 'system.connection.welcome',
        category: 'system',
        severity: 'success',
        template: 'Welcome to Attrition, {username}! Connection established.',
        defaultTimeout: 5000,
        variables: {
          username: { type: 'string', required: true, description: 'Username' }
        }
      },
      { username: user.username },
      {
        userId: user.id,
        connectionTime: new Date().toISOString()
      }
    );

    socket.emit('game:welcome', {
      message: welcomeMessage,
      serverInfo: {
        name: 'Attrition Game Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        features: ['real-time-messaging', 'enhanced-notifications']
      }
    });
  });

  // Add enhanced broadcasting methods
  setupEnhancedBroadcasting(io);
}

// =============================================================================
// 2. USER ROOMS AND SUBSCRIPTIONS
// =============================================================================

function setupUserRooms(socket: Socket, user: any) {
  // Join personal room
  socket.join(`user:${user.id}`);
  
  // Join empire room if user has an empire
  if (user.gameProfile.empireId) {
    socket.join(`empire:${user.gameProfile.empireId}`);
  }
  
  // Join universe and location-based rooms
  socket.join('universe:alpha');
  
  if (user.gameProfile.startingCoordinate) {
    try {
      const coord = parseCoordinate(user.gameProfile.startingCoordinate);
      socket.join(`galaxy:${coord.server}${coord.galaxy.toString().padStart(2, '0')}`);
      socket.join(`region:${coord.server}${coord.galaxy.toString().padStart(2, '0')}:${coord.region.toString().padStart(2, '0')}`);
    } catch (error) {
      console.warn(`Failed to parse coordinate for user ${user.username}:`, error);
    }
  }
}

// =============================================================================
// 3. GAME EVENT HANDLERS WITH MESSAGING
// =============================================================================

function setupGameEventHandlers(socket: Socket, user: any, io: Server) {
  // Building construction events
  socket.on('building:construct', async (data, callback) => {
    try {
      const { locationCoord, buildingType } = data;
      const empireId = user.gameProfile.empireId;

      // Validate and start construction (business logic)
      const result = await startBuildingConstruction(empireId, locationCoord, buildingType);
      
      if (result.success) {
        // Create and broadcast success message
        const message = processMessageTemplate(
          BUILDING_MESSAGES.CONSTRUCTION_STARTED,
          {
            buildingName: result.building.displayName,
            locationCoord,
            constructionTime: result.building.constructionTimeMinutes
          },
          {
            empireId,
            locationCoord,
            buildingId: result.building.id
          }
        );

        // Broadcast to empire and location
        io.broadcastToEmpire(empireId, 'game:message', message);
        io.broadcastToLocation(locationCoord, 'building:construction-started', {
          building: result.building,
          message
        });

        callback({ success: true, building: result.building, message });
      } else {
        // Send error message
        const errorMessage = createMessage(
          'building',
          'error',
          result.error || 'Construction failed',
          {
            persistent: true,
            context: { empireId, locationCoord }
          }
        );

        socket.emit('game:message', errorMessage);
        callback({ success: false, error: result.error, message: errorMessage });
      }

    } catch (error) {
      const errorMessage = createSystemMessage(
        'error',
        'Failed to process construction request',
        { persistent: true }
      );
      
      socket.emit('game:message', errorMessage);
      callback({ success: false, error: 'Internal error', message: errorMessage });
    }
  });

  // Fleet movement events
  socket.on('fleet:move', async (data, callback) => {
    try {
      const { fleetId, destination } = data;
      const empireId = user.gameProfile.empireId;

      const result = await moveFleet(fleetId, destination);
      
      if (result.success) {
        // Create departure message
        const departureMessage = processMessageTemplate(
          FLEET_MESSAGES.FLEET_DEPARTED,
          {
            fleetName: result.fleet.name,
            destination,
            travelTime: result.travelTimeHours
          },
          { empireId, fleetId }
        );

        // Broadcast immediately
        io.broadcastToEmpire(empireId, 'game:message', departureMessage);
        io.broadcastToEmpire(empireId, 'fleet:departed', {
          fleet: result.fleet,
          destination,
          travelTime: result.travelTimeHours,
          message: departureMessage
        });

        // Schedule arrival message
        scheduleFleetArrivalMessage(io, empireId, result.fleet, destination, result.arrivalTime);

        callback({ success: true, fleet: result.fleet, message: departureMessage });
      } else {
        const errorMessage = createMessage(
          'fleet',
          'error',
          result.error || 'Fleet movement failed',
          { persistent: true, context: { empireId, fleetId } }
        );

        socket.emit('game:message', errorMessage);
        callback({ success: false, error: result.error, message: errorMessage });
      }

    } catch (error) {
      const errorMessage = createSystemMessage(
        'error',
        'Failed to process fleet movement',
        { persistent: true }
      );
      
      socket.emit('game:message', errorMessage);
      callback({ success: false, error: 'Internal error', message: errorMessage });
    }
  });

  // Research completion events
  socket.on('research:start', async (data, callback) => {
    try {
      const { researchType, projectName } = data;
      const empireId = user.gameProfile.empireId;

      const result = await startResearch(empireId, researchType, projectName);
      
      if (result.success) {
        const message = createMessage(
          'research',
          'success',
          `Research project "${projectName}" started successfully`,
          {
            timeout: 4000,
            context: { empireId, researchType, projectName }
          }
        );

        io.broadcastToEmpire(empireId, 'game:message', message);
        callback({ success: true, research: result.research, message });
      } else {
        const errorMessage = createMessage(
          'research',
          'error',
          result.error || 'Research failed to start',
          { persistent: true }
        );

        socket.emit('game:message', errorMessage);
        callback({ success: false, error: result.error, message: errorMessage });
      }

    } catch (error) {
      const errorMessage = createSystemMessage(
        'error',
        'Failed to start research',
        { persistent: true }
      );
      
      socket.emit('game:message', errorMessage);
      callback({ success: false, error: 'Internal error', message: errorMessage });
    }
  });
}

// =============================================================================
// 4. MESSAGE-SPECIFIC HANDLERS
// =============================================================================

function setupMessageHandlers(socket: Socket, user: any, io: Server) {
  // Subscribe to specific message categories
  socket.on('messages:subscribe', (data) => {
    const { categories = [], locations = [] } = data;
    
    // Join category-specific rooms
    categories.forEach((category: string) => {
      socket.join(`messages:${category}`);
    });
    
    // Join location-specific message rooms
    locations.forEach((location: string) => {
      socket.join(`messages:location:${location}`);
    });

    const confirmMessage = createSystemMessage(
      'info',
      `Subscribed to ${categories.length} message categories and ${locations.length} locations`,
      { timeout: 3000 }
    );

    socket.emit('game:message', confirmMessage);
  });

  // Unsubscribe from message categories
  socket.on('messages:unsubscribe', (data) => {
    const { categories = [], locations = [] } = data;
    
    categories.forEach((category: string) => {
      socket.leave(`messages:${category}`);
    });
    
    locations.forEach((location: string) => {
      socket.leave(`messages:location:${location}`);
    });
  });

  // Handle message acknowledgments
  socket.on('message:acknowledge', (data) => {
    const { messageId, action } = data;
    
    // Log message interaction for analytics
    console.log(`Message ${messageId} acknowledged by ${user.username} with action: ${action}`);
    
    // Handle specific actions if needed
    if (action === 'dismissed') {
      // Message was dismissed by user
    } else if (action === 'action_clicked') {
      // User clicked an action button
    }
  });
}

// =============================================================================
// 5. ENHANCED BROADCASTING METHODS
// =============================================================================

function setupEnhancedBroadcasting(io: Server) {
  // Broadcast message to empire with template processing
  io.broadcastEmpireMessage = (
    empireId: string,
    template: any,
    variables: Record<string, any>,
    context?: any
  ) => {
    const message = processMessageTemplate(template, variables, {
      empireId,
      timestamp: new Date(),
      ...context
    });

    io.to(`empire:${empireId}`).emit('game:message', message);
    return message;
  };

  // Broadcast to location (galaxy/region/system)
  io.broadcastToLocation = (locationCoord: string, event: string, data: any) => {
    try {
      const coord = parseCoordinate(locationCoord);
      
      // Broadcast to different scope levels
      io.to(`galaxy:${coord.server}${coord.galaxy.toString().padStart(2, '0')}`).emit(event, {
        scope: 'galaxy',
        location: locationCoord,
        ...data
      });
      
      io.to(`region:${coord.server}${coord.galaxy.toString().padStart(2, '0')}:${coord.region.toString().padStart(2, '0')}`).emit(event, {
        scope: 'region',
        location: locationCoord,
        ...data
      });
      
    } catch (error) {
      console.warn(`Failed to broadcast to location ${locationCoord}:`, error);
    }
  };

  // Broadcast system-wide message
  io.broadcastSystemMessage = (
    severity: 'success' | 'error' | 'warning' | 'info',
    message: string,
    options?: { persistent?: boolean; timeout?: number }
  ) => {
    const systemMessage = createSystemMessage(severity, message, options);
    io.emit('game:message', systemMessage);
    return systemMessage;
  };

  // Broadcast maintenance message
  io.broadcastMaintenance = (estimatedEndTime: string) => {
    const message = processMessageTemplate(
      SYSTEM_MESSAGES.MAINTENANCE_MODE,
      { expectedEnd: estimatedEndTime },
      { maintenanceId: `maint_${Date.now()}` }
    );

    io.emit('game:message', message);
    return message;
  };
}

// =============================================================================
// 6. DISCONNECT HANDLING WITH MESSAGES
// =============================================================================

function setupDisconnectHandler(socket: Socket, user: any, io: Server) {
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User ${user.username} disconnected: ${reason}`);

    // Optionally send disconnect message to empire members
    if (user.gameProfile.empireId && reason !== 'client namespace disconnect') {
      const disconnectMessage = createSystemMessage(
        'info',
        `${user.username} has disconnected`,
        { timeout: 3000 }
      );

      // Only send to other empire members (not the disconnected user)
      socket.to(`empire:${user.gameProfile.empireId}`).emit('player:disconnected', {
        username: user.username,
        message: disconnectMessage
      });
    }

    // Update online player count
    updateOnlinePlayerCount(io);
  });
}

// =============================================================================
// 7. SCHEDULED MESSAGING SYSTEM
// =============================================================================

// Schedule fleet arrival message
function scheduleFleetArrivalMessage(
  io: Server,
  empireId: string,
  fleet: any,
  destination: string,
  arrivalTime: Date
) {
  const delay = arrivalTime.getTime() - Date.now();
  
  if (delay > 0) {
    setTimeout(() => {
      const arrivalMessage = processMessageTemplate(
        FLEET_MESSAGES.FLEET_ARRIVED,
        {
          fleetName: fleet.name,
          destination
        },
        { empireId, fleetId: fleet.id }
      );

      io.broadcastToEmpire(empireId, 'game:message', arrivalMessage);
      io.broadcastToEmpire(empireId, 'fleet:arrived', {
        fleet,
        destination,
        message: arrivalMessage
      });

    }, delay);
  }
}

// Schedule building completion message
export function scheduleBuildingCompletion(
  io: Server,
  empireId: string,
  building: any,
  completionTime: Date
) {
  const delay = completionTime.getTime() - Date.now();
  
  if (delay > 0) {
    setTimeout(() => {
      const completionMessage = processMessageTemplate(
        BUILDING_MESSAGES.CONSTRUCTION_COMPLETED,
        {
          buildingName: building.displayName,
          locationCoord: building.locationCoord
        },
        { empireId, buildingId: building.id }
      );

      io.broadcastToEmpire(empireId, 'game:message', completionMessage);
      io.broadcastToLocation(building.locationCoord, 'building:completed', {
        building,
        message: completionMessage
      });

    }, delay);
  }
}

// =============================================================================
// 8. COMBAT MESSAGING SYSTEM
// =============================================================================

// Handle combat events with real-time messaging
export function handleCombatEvents(io: Server) {
  // Battle start
  io.handleBattleStart = (attackerEmpire: string, defenderEmpire: string, location: string) => {
    // Message to attacker
    const attackMessage = createMessage(
      'combat',
      'info',
      `Your fleet has engaged in battle at ${location}`,
      { timeout: 5000, context: { location, role: 'attacker' } }
    );

    // Message to defender
    const defenseMessage = processMessageTemplate(
      COMBAT_MESSAGES.UNDER_ATTACK,
      {
        locationCoord: location,
        attackerName: 'Enemy Fleet' // Would get actual name from data
      },
      { empireId: defenderEmpire, location }
    );

    io.broadcastToEmpire(attackerEmpire, 'game:message', attackMessage);
    io.broadcastToEmpire(defenderEmpire, 'game:message', defenseMessage);
  };

  // Battle result
  io.handleBattleResult = (
    winnerEmpire: string,
    loserEmpire: string,
    location: string,
    spoils: any
  ) => {
    // Victory message
    const victoryMessage = processMessageTemplate(
      COMBAT_MESSAGES.BATTLE_VICTORY,
      {
        enemyName: 'Enemy Fleet',
        locationCoord: location,
        spoils: formatSpoils(spoils)
      },
      { empireId: winnerEmpire, location }
    );

    // Defeat message
    const defeatMessage = processMessageTemplate(
      COMBAT_MESSAGES.BATTLE_DEFEAT,
      {
        enemyName: 'Enemy Fleet',
        locationCoord: location
      },
      { empireId: loserEmpire, location }
    );

    io.broadcastToEmpire(winnerEmpire, 'game:message', victoryMessage);
    io.broadcastToEmpire(loserEmpire, 'game:message', defeatMessage);

    // Broadcast to location observers
    io.broadcastToLocation(location, 'battle:concluded', {
      winner: winnerEmpire,
      loser: loserEmpire,
      location,
      spoils
    });
  };
}

// =============================================================================
// 9. UTILITY FUNCTIONS
// =============================================================================

function parseCoordinate(coord: string) {
  // Parse coordinate string like "A00:10:22:10"
  const parts = coord.split(':');
  return {
    server: parts[0].charAt(0),
    galaxy: parseInt(parts[0].slice(1)),
    region: parseInt(parts[1]),
    system: parseInt(parts[2]),
    body: parseInt(parts[3])
  };
}

function formatSpoils(spoils: any): string {
  const items = [];
  if (spoils.credits) items.push(`${spoils.credits.toLocaleString()} credits`);
  if (spoils.resources) items.push('resources');
  if (spoils.ships) items.push(`${spoils.ships} ships`);
  return items.join(', ');
}

function updateOnlinePlayerCount(io: Server) {
  const onlineCount = io.of('/').sockets.size;
  io.emit('presence:update', {
    playersOnline: onlineCount,
    timestamp: new Date().toISOString()
  });
}

// Extend Socket.IO Server interface for new methods
declare module 'socket.io' {
  interface Server {
    broadcastEmpireMessage(
      empireId: string,
      template: any,
      variables: Record<string, any>,
      context?: any
    ): GameMessage;
    
    broadcastToLocation(locationCoord: string, event: string, data: any): void;
    
    broadcastSystemMessage(
      severity: 'success' | 'error' | 'warning' | 'info',
      message: string,
      options?: { persistent?: boolean; timeout?: number }
    ): GameMessage;
    
    broadcastMaintenance(estimatedEndTime: string): GameMessage;
    
    handleBattleStart(attackerEmpire: string, defenderEmpire: string, location: string): void;
    
    handleBattleResult(
      winnerEmpire: string,
      loserEmpire: string,
      location: string,
      spoils: any
    ): void;
  }
}

// =============================================================================
// 10. PLACEHOLDER FUNCTIONS (TO BE IMPLEMENTED)
// =============================================================================

async function verifyTokenAndGetUser(token: string): Promise<any> {
  // Implement JWT verification and user lookup
  throw new Error('Not implemented');
}

async function startBuildingConstruction(empireId: string, locationCoord: string, buildingType: string) {
  // Implement building construction logic
  throw new Error('Not implemented');
}

async function moveFleet(fleetId: string, destination: string) {
  // Implement fleet movement logic
  throw new Error('Not implemented');
}

async function startResearch(empireId: string, researchType: string, projectName: string) {
  // Implement research logic
  throw new Error('Not implemented');
}