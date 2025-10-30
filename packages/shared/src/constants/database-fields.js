"use strict";
/**
 * Shared Database Field Constants
 *
 * Common database field names used across packages.
 * This prevents cross-package dependencies while maintaining consistent field naming.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_FIELDS = void 0;
exports.DB_FIELDS = {
    // Buildings table fields (shared across client and server)
    BUILDINGS: {
        ID: 'id',
        NAME: 'name',
        COORDINATE: 'coordinate',
        BUILDING_KEY: 'building_key',
        LEVEL: 'level',
        IS_ACTIVE: 'is_active',
        COMPLETES_AT: 'completes_at',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    },
    // Empires table fields (shared across client and server)
    EMPIRES: {
        ID: 'id',
        USER_ID: 'user_id',
        NAME: 'name',
        HOME_SYSTEM: 'home_system',
        TERRITORIES: 'territories',
        CREDITS: 'credits',
        ENERGY: 'energy',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    },
    // Tech Queue table fields
    TECH_QUEUE: {
        ID: 'id',
        EMPIRE_ID: 'empire_id',
        TECH_KEY: 'tech_key',
        STATUS: 'status',
        STARTED_AT: 'started_at',
        COMPLETES_AT: 'completes_at',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    },
    // Users table fields
    USERS: {
        ID: 'id',
        USERNAME: 'username',
        EMAIL: 'email',
        CREATED_AT: 'created_at',
        UPDATED_AT: 'updated_at'
    },
    // Messages table fields
    MESSAGES: {
        ID: 'id',
        FROM_USER_ID: 'from_user_id',
        TO_USER_ID: 'to_user_id',
        SUBJECT: 'subject',
        CONTENT: 'content',
        IS_READ: 'is_read',
        CREATED_AT: 'created_at'
    }
};
