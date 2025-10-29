// Message constants organized by game features with dynamic value support

import { MessageTemplate, MessageSeverity, MessageCategory } from './types';

/**
 * Authentication and login message templates
 */
export const AUTH_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  LOGIN_SUCCESS: {
    id: 'auth.login.success',
    category: 'auth' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Welcome back, {username}! Login successful.',
    defaultTimeout: 3000,
    variables: {
      username: { type: 'string', required: true, description: 'Username of the logged in user' }
    }
  },
  
  LOGOUT_SUCCESS: {
    id: 'auth.logout.success',
    category: 'auth' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'You have been logged out successfully.',
    defaultTimeout: 2000
  },
  
  REGISTRATION_SUCCESS: {
    id: 'auth.register.success',
    category: 'auth' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Account created successfully! Welcome to Attrition, {username}.',
    defaultTimeout: 4000,
    variables: {
      username: { type: 'string', required: true, description: 'New username' }
    }
  },
  
  // Error messages
  INVALID_CREDENTIALS: {
    id: 'auth.login.invalid_credentials',
    category: 'auth' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Invalid email or password. Please check your credentials and try again.',
    persistent: true
  },
  
  TOKEN_EXPIRED: {
    id: 'auth.token.expired',
    category: 'auth' as MessageCategory,
    severity: 'warning' as MessageSeverity,
    template: 'Your session has expired. Please log in again to continue.',
    persistent: true
  },
  
  ACCOUNT_LOCKED: {
    id: 'auth.account.locked',
    category: 'auth' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Your account has been locked due to too many failed login attempts. Please try again in {lockoutMinutes} minutes.',
    persistent: true,
    variables: {
      lockoutMinutes: { type: 'number', required: true, description: 'Minutes until unlock' }
    }
  },
  
  EMAIL_ALREADY_EXISTS: {
    id: 'auth.register.email_exists',
    category: 'auth' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'An account with this email already exists. Please use a different email or try logging in.',
    persistent: true
  }
};

/**
 * Empire management message templates
 */
export const EMPIRE_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  EMPIRE_CREATED: {
    id: 'empire.create.success',
    category: 'empire' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Empire "{empireName}" has been established! Your journey begins.',
    defaultTimeout: 5000,
    variables: {
      empireName: { type: 'string', required: true, description: 'Name of the new empire' }
    }
  },
  
  RESOURCES_UPDATED: {
    id: 'empire.resources.updated',
    category: 'empire' as MessageCategory,
    severity: 'info' as MessageSeverity,
    template: 'Resources updated: +{creditsGained} credits. Current balance: {totalCredits}',
    defaultTimeout: 2000,
    variables: {
      creditsGained: { type: 'number', required: true, description: 'Credits gained in update' },
      totalCredits: { type: 'number', required: true, description: 'Total current credits' }
    }
  },
  
  // Error messages
  INSUFFICIENT_CREDITS: {
    id: 'empire.credits.insufficient',
    category: 'empire' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Insufficient credits. Required: {required}, Available: {available}',
    persistent: true,
    variables: {
      required: { type: 'number', required: true, description: 'Credits required for action' },
      available: { type: 'number', required: true, description: 'Credits currently available' }
    }
  },
  
  EMPIRE_NOT_FOUND: {
    id: 'empire.not_found',
    category: 'empire' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Empire not found. Please create an empire first.',
    persistent: true
  }
};

/**
 * Building construction and management message templates
 */
export const BUILDING_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  CONSTRUCTION_STARTED: {
    id: 'building.construction.started',
    category: 'building' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Construction of {buildingName} started at {locationCoord}. Completion in {constructionTime} minutes.',
    defaultTimeout: 4000,
    variables: {
      buildingName: { type: 'string', required: true, description: 'Name of building being constructed' },
      locationCoord: { type: 'string', required: true, description: 'Location coordinates' },
      constructionTime: { type: 'number', required: true, description: 'Minutes until completion' }
    }
  },
  
  CONSTRUCTION_COMPLETED: {
    id: 'building.construction.completed',
    category: 'building' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: '{buildingName} construction completed at {locationCoord}!',
    defaultTimeout: 3000,
    variables: {
      buildingName: { type: 'string', required: true, description: 'Name of completed building' },
      locationCoord: { type: 'string', required: true, description: 'Location coordinates' }
    }
  },
  
  BUILDING_UPGRADED: {
    id: 'building.upgrade.completed',
    category: 'building' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: '{buildingName} upgraded to level {newLevel} at {locationCoord}',
    defaultTimeout: 3000,
    variables: {
      buildingName: { type: 'string', required: true, description: 'Name of upgraded building' },
      newLevel: { type: 'number', required: true, description: 'New building level' },
      locationCoord: { type: 'string', required: true, description: 'Location coordinates' }
    }
  },
  
  // Error messages
  LOCATION_OCCUPIED: {
    id: 'building.location.occupied',
    category: 'building' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Location {locationCoord} is already occupied. Choose a different location.',
    persistent: true,
    variables: {
      locationCoord: { type: 'string', required: true, description: 'Occupied location coordinates' }
    }
  },
  
  TECH_REQUIREMENTS_NOT_MET: {
    id: 'building.tech.requirements_not_met',
    category: 'building' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Technology requirements not met for {buildingName}. Required: {requiredTech}',
    persistent: true,
    variables: {
      buildingName: { type: 'string', required: true, description: 'Building requiring technology' },
      requiredTech: { type: 'string', required: true, description: 'Required technology description' }
    }
  },
  
  BUILDING_LIMIT_REACHED: {
    id: 'building.limit.reached',
    category: 'building' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Building limit reached for {buildingType}. Maximum: {maxAllowed}',
    persistent: true,
    variables: {
      buildingType: { type: 'string', required: true, description: 'Type of building' },
      maxAllowed: { type: 'number', required: true, description: 'Maximum allowed buildings' }
    }
  }
};

/**
 * Research and technology message templates
 */
export const RESEARCH_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  RESEARCH_STARTED: {
    id: 'research.started',
    category: 'research' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Research project "{researchName}" started. Estimated completion: {estimatedTime} hours.',
    defaultTimeout: 4000,
    variables: {
      researchName: { type: 'string', required: true, description: 'Name of research project' },
      estimatedTime: { type: 'number', required: true, description: 'Hours until completion' }
    }
  },
  
  RESEARCH_COMPLETED: {
    id: 'research.completed',
    category: 'research' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Research "{researchName}" completed! New technologies unlocked.',
    defaultTimeout: 5000,
    variables: {
      researchName: { type: 'string', required: true, description: 'Name of completed research' }
    }
  },
  
  TECH_LEVEL_UP: {
    id: 'research.tech.level_up',
    category: 'research' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: '{techCategory} technology advanced to level {newLevel}!',
    defaultTimeout: 3000,
    variables: {
      techCategory: { type: 'string', required: true, description: 'Technology category' },
      newLevel: { type: 'number', required: true, description: 'New technology level' }
    }
  },
  
  // Error messages
  INSUFFICIENT_LAB_LEVEL: {
    id: 'research.lab.insufficient_level',
    category: 'research' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Research lab level {currentLevel} insufficient. Required: level {requiredLevel}',
    persistent: true,
    variables: {
      currentLevel: { type: 'number', required: true, description: 'Current lab level' },
      requiredLevel: { type: 'number', required: true, description: 'Required lab level' }
    }
  }
};

/**
 * Fleet and ship management message templates
 */
export const FLEET_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  FLEET_CREATED: {
    id: 'fleet.created',
    category: 'fleet' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Fleet "{fleetName}" created with {shipCount} ships.',
    defaultTimeout: 3000,
    variables: {
      fleetName: { type: 'string', required: true, description: 'Name of the new fleet' },
      shipCount: { type: 'number', required: true, description: 'Number of ships in fleet' }
    }
  },
  
  FLEET_DEPARTED: {
    id: 'fleet.departed',
    category: 'fleet' as MessageCategory,
    severity: 'info' as MessageSeverity,
    template: 'Fleet "{fleetName}" departed for {destination}. Arrival in {travelTime} hours.',
    defaultTimeout: 4000,
    variables: {
      fleetName: { type: 'string', required: true, description: 'Name of departing fleet' },
      destination: { type: 'string', required: true, description: 'Destination coordinates' },
      travelTime: { type: 'number', required: true, description: 'Travel time in hours' }
    }
  },
  
  FLEET_ARRIVED: {
    id: 'fleet.arrived',
    category: 'fleet' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Fleet "{fleetName}" arrived at {destination}.',
    defaultTimeout: 3000,
    variables: {
      fleetName: { type: 'string', required: true, description: 'Name of arriving fleet' },
      destination: { type: 'string', required: true, description: 'Arrival destination' }
    }
  },
  
  SHIP_CONSTRUCTED: {
    id: 'fleet.ship.constructed',
    category: 'fleet' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: '{shipType} construction completed at {locationCoord}.',
    defaultTimeout: 3000,
    variables: {
      shipType: { type: 'string', required: true, description: 'Type of ship constructed' },
      locationCoord: { type: 'string', required: true, description: 'Construction location' }
    }
  },
  
  // Error messages
  FLEET_IN_TRANSIT: {
    id: 'fleet.in_transit',
    category: 'fleet' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Fleet "{fleetName}" is currently in transit and cannot be commanded.',
    persistent: true,
    variables: {
      fleetName: { type: 'string', required: true, description: 'Name of fleet in transit' }
    }
  },
  
  INSUFFICIENT_SHIPYARD_LEVEL: {
    id: 'fleet.shipyard.insufficient_level',
    category: 'fleet' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Shipyard level {currentLevel} insufficient to build {shipType}. Required: level {requiredLevel}',
    persistent: true,
    variables: {
      currentLevel: { type: 'number', required: true, description: 'Current shipyard level' },
      shipType: { type: 'string', required: true, description: 'Ship type being built' },
      requiredLevel: { type: 'number', required: true, description: 'Required shipyard level' }
    }
  }
};

/**
 * Combat and warfare message templates
 */
export const COMBAT_MESSAGES: Record<string, MessageTemplate> = {
  // Success messages
  BATTLE_VICTORY: {
    id: 'combat.battle.victory',
    category: 'combat' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Victory! Your fleet defeated {enemyName} at {locationCoord}. Spoils: {spoils}',
    defaultTimeout: 6000,
    variables: {
      enemyName: { type: 'string', required: true, description: 'Name of defeated enemy' },
      locationCoord: { type: 'string', required: true, description: 'Battle location' },
      spoils: { type: 'string', required: true, description: 'Resources or items gained' }
    }
  },
  
  DEFENSE_SUCCESSFUL: {
    id: 'combat.defense.successful',
    category: 'combat' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Your defenses at {locationCoord} successfully repelled an attack by {attackerName}.',
    defaultTimeout: 5000,
    variables: {
      locationCoord: { type: 'string', required: true, description: 'Defended location' },
      attackerName: { type: 'string', required: true, description: 'Name of attacker' }
    }
  },
  
  // Warning messages
  UNDER_ATTACK: {
    id: 'combat.under_attack',
    category: 'combat' as MessageCategory,
    severity: 'warning' as MessageSeverity,
    template: 'Your territory at {locationCoord} is under attack by {attackerName}!',
    persistent: true,
    variables: {
      locationCoord: { type: 'string', required: true, description: 'Location under attack' },
      attackerName: { type: 'string', required: true, description: 'Name of attacker' }
    }
  },
  
  // Error messages
  BATTLE_DEFEAT: {
    id: 'combat.battle.defeat',
    category: 'combat' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Defeat! Your fleet was destroyed by {enemyName} at {locationCoord}.',
    persistent: true,
    variables: {
      enemyName: { type: 'string', required: true, description: 'Name of victorious enemy' },
      locationCoord: { type: 'string', required: true, description: 'Battle location' }
    }
  },
  
  COMBAT_IN_PROGRESS: {
    id: 'combat.in_progress',
    category: 'combat' as MessageCategory,
    severity: 'warning' as MessageSeverity,
    template: 'Combat in progress at {locationCoord}. Fleet commands unavailable.',
    persistent: true,
    variables: {
      locationCoord: { type: 'string', required: true, description: 'Combat location' }
    }
  }
};

/**
 * System and validation message templates
 */
export const SYSTEM_MESSAGES: Record<string, MessageTemplate> = {
  // Info messages
  MAINTENANCE_MODE: {
    id: 'system.maintenance.active',
    category: 'system' as MessageCategory,
    severity: 'warning' as MessageSeverity,
    template: 'Server maintenance in progress. Expected completion: {expectedEnd}',
    persistent: true,
    variables: {
      expectedEnd: { type: 'string', required: true, description: 'Expected maintenance end time' }
    }
  },
  
  CONNECTION_RESTORED: {
    id: 'system.connection.restored',
    category: 'system' as MessageCategory,
    severity: 'success' as MessageSeverity,
    template: 'Connection to server restored.',
    defaultTimeout: 3000
  },
  
  // Error messages
  CONNECTION_LOST: {
    id: 'system.connection.lost',
    category: 'system' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Connection to server lost. Attempting to reconnect...',
    persistent: true
  },
  
  RATE_LIMIT_EXCEEDED: {
    id: 'system.rate_limit.exceeded',
    category: 'system' as MessageCategory,
    severity: 'warning' as MessageSeverity,
    template: 'Rate limit exceeded. Please wait {retryAfter} seconds before trying again.',
    persistent: true,
    variables: {
      retryAfter: { type: 'number', required: true, description: 'Seconds until retry allowed' }
    }
  },
  
  // Validation messages
  VALIDATION_FAILED: {
    id: 'validation.failed',
    category: 'validation' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Validation failed: {validationErrors}',
    persistent: true,
    variables: {
      validationErrors: { type: 'string', required: true, description: 'List of validation errors' }
    }
  },
  
  INVALID_FORMAT: {
    id: 'validation.format.invalid',
    category: 'validation' as MessageCategory,
    severity: 'error' as MessageSeverity,
    template: 'Invalid format for {fieldName}. Expected: {expectedFormat}',
    persistent: true,
    variables: {
      fieldName: { type: 'string', required: true, description: 'Name of field with invalid format' },
      expectedFormat: { type: 'string', required: true, description: 'Expected format description' }
    }
  }
};

/**
 * All message templates combined for easy access
 */
export const ALL_MESSAGE_TEMPLATES: Record<string, MessageTemplate> = {
  ...AUTH_MESSAGES,
  ...EMPIRE_MESSAGES,
  ...BUILDING_MESSAGES,
  ...RESEARCH_MESSAGES,
  ...FLEET_MESSAGES,
  ...COMBAT_MESSAGES,
  ...SYSTEM_MESSAGES
};

/**
 * Message template lookup by category
 */
export const MESSAGE_TEMPLATES_BY_CATEGORY: Record<MessageCategory, Record<string, MessageTemplate>> = {
  auth: AUTH_MESSAGES,
  empire: EMPIRE_MESSAGES,
  building: BUILDING_MESSAGES,
  research: RESEARCH_MESSAGES,
  fleet: FLEET_MESSAGES,
  combat: COMBAT_MESSAGES,
  trade: {}, // TODO: Add trade messages
  diplomacy: {}, // TODO: Add diplomacy messages
  exploration: {}, // TODO: Add exploration messages
  system: SYSTEM_MESSAGES,
  validation: SYSTEM_MESSAGES, // Validation messages are part of system
  network: SYSTEM_MESSAGES // Network messages are part of system
};