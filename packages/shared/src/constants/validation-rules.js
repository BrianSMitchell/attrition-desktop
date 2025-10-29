"use strict";
/**
 * Validation Rules Constants
 *
 * Centralizes all input validation patterns, form validation logic, and error messages
 * used across the Attrition application. This ensures consistent validation behavior
 * and centralized management of validation rules and error messages.
 *
 * @fileoverview Validation patterns, rules, and helpers for forms and inputs
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALIDATION_UTILS = exports.FORM_VALIDATORS = exports.VALIDATION_HELPERS = exports.VALIDATION_MESSAGES = exports.VALIDATION_LENGTHS = exports.VALIDATION_PATTERNS = void 0;
/**
 * Regular Expression Patterns for Validation
 */
exports.VALIDATION_PATTERNS = {
    /** Email validation pattern */
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /** Game coordinate patterns */
    COORDINATES: {
        /** Galaxy coordinate format: A00:12:34:56 (server, galaxy, region, system, body) */
        GALAXY_COORD: /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/,
        /** Simple coordinate format: 1:2:3 or -1:-2:-3 */
        SIMPLE_COORD: /^-?\d+:-?\d+:-?\d+$/,
        /** Numeric coordinate format: numbers only */
        NUMERIC_COORD: /^\d+:\d+:\d+$/,
    },
    /** Text patterns */
    TEXT: {
        /** Username: alphanumeric + underscores, 3-30 characters */
        USERNAME: /^[a-zA-Z0-9_]{3,30}$/,
        /** Password: at least 6 characters, any characters */
        PASSWORD: /^.{6,}$/,
        /** Strong password: min 8 chars, uppercase, lowercase, number */
        STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
        /** No special characters */
        ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
        /** Letters only */
        LETTERS_ONLY: /^[a-zA-Z\s]+$/,
        /** Numbers only */
        NUMBERS_ONLY: /^\d+$/,
    },
    /** Game-specific patterns */
    GAME: {
        /** Fleet name: letters, numbers, spaces, hyphens */
        FLEET_NAME: /^[a-zA-Z0-9\s-]{1,50}$/,
        /** Empire name: letters, numbers, spaces, apostrophes */
        EMPIRE_NAME: /^[a-zA-Z0-9\s']{2,50}$/,
        /** Resource amount: positive numbers */
        RESOURCE_AMOUNT: /^\d+(\.\d{1,2})?$/,
    },
};
/**
 * Validation Length Constraints
 */
exports.VALIDATION_LENGTHS = {
    /** Email constraints */
    EMAIL: {
        MIN: 5,
        MAX: 254,
    },
    /** Username constraints */
    USERNAME: {
        MIN: 3,
        MAX: 30,
    },
    /** Password constraints */
    PASSWORD: {
        MIN: 6,
        MAX: 128,
    },
    /** Text input constraints */
    TEXT: {
        MIN_REQUIRED: 1,
        SHORT_TEXT: 100,
        MEDIUM_TEXT: 255,
        LONG_TEXT: 1000,
    },
    /** Game-specific constraints */
    GAME: {
        FLEET_NAME: { MIN: 1, MAX: 50 },
        EMPIRE_NAME: { MIN: 2, MAX: 50 },
        COORDINATE_PARTS: { MIN: 1, MAX: 5 },
    },
};
/**
 * Validation Error Messages
 * Centralized error messages for consistent user experience
 */
exports.VALIDATION_MESSAGES = {
    /** Required field messages */
    REQUIRED: {
        FIELD: 'This field is required',
        EMAIL: 'Please enter your email address',
        PASSWORD: 'Please enter your password',
        USERNAME: 'Please enter your username',
        COORDINATE: 'Please enter a coordinate',
        DESTINATION: 'Please enter a destination coordinate',
    },
    /** Format validation messages */
    FORMAT: {
        EMAIL: 'Please enter a valid email address',
        COORDINATE_GALAXY: 'Invalid coordinate format. Use format: A00:12:34:56',
        COORDINATE_SIMPLE: 'Invalid coordinate format. Use format: x:y:z (e.g., 1:2:3)',
        USERNAME: 'Username can only contain letters, numbers, and underscores',
        PASSWORD_WEAK: 'Password must be at least 6 characters long',
        PASSWORD_STRONG: 'Password must contain uppercase, lowercase, and number',
    },
    /** Length validation messages */
    LENGTH: {
        USERNAME_SHORT: 'Username must be at least 3 characters long',
        USERNAME_LONG: 'Username cannot exceed 30 characters',
        PASSWORD_SHORT: 'Password must be at least 6 characters long',
        EMAIL_INVALID: 'Email address is too long',
        TEXT_TOO_LONG: 'Text exceeds maximum length',
    },
    /** Business logic validation messages */
    BUSINESS: {
        SAME_LOCATION: 'Cannot dispatch to current location',
        LOCATION_NOT_FOUND: 'Destination not found or inaccessible',
        INVALID_DESTINATION: 'Invalid destination type. Can only travel to planets or asteroids',
        API_UNAVAILABLE: 'Location validation API not available',
        NETWORK_ERROR: 'Network error while validating destination',
        PASSWORDS_MISMATCH: 'Passwords do not match',
        INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again',
    },
    /** Service and connection messages */
    SERVICE: {
        AUTH_UNAVAILABLE: 'Authentication service is temporarily unavailable. Please try again in a moment',
        NO_INTERNET: 'No internet connection. Please check your connection and try again',
        SERVER_UNREACHABLE: 'Cannot reach authentication server. Please check your connection and try again',
        CONNECTION_TIMEOUT: 'Connection timeout. Please check your internet connection and try again',
        TOO_MANY_REQUESTS: 'Too many login attempts. Please wait a moment before trying again',
    },
};
/**
 * Validation Helper Functions
 * Reusable validation logic for common patterns
 */
exports.VALIDATION_HELPERS = {
    /** Basic validation helpers */
    isEmpty: (value) => !value || value.trim().length === 0,
    isNotEmpty: (value) => Boolean(value && value.trim().length > 0),
    hasMinLength: (value, minLength) => Boolean(value && value.trim().length >= minLength),
    hasMaxLength: (value, maxLength) => value.length <= maxLength,
    isWithinLength: (value, min, max) => Boolean(value && value.trim().length >= min && value.length <= max),
    /** Pattern matching helpers */
    matchesPattern: (value, pattern) => pattern.test(value),
    /** Email validation */
    isValidEmail: (email) => exports.VALIDATION_PATTERNS.EMAIL.test(email.trim()),
    /** Username validation */
    isValidUsername: (username) => exports.VALIDATION_HELPERS.isWithinLength(username, exports.VALIDATION_LENGTHS.USERNAME.MIN, exports.VALIDATION_LENGTHS.USERNAME.MAX) &&
        exports.VALIDATION_PATTERNS.TEXT.USERNAME.test(username),
    /** Password validation */
    isValidPassword: (password) => password.length >= exports.VALIDATION_LENGTHS.PASSWORD.MIN,
    isStrongPassword: (password) => exports.VALIDATION_PATTERNS.TEXT.STRONG_PASSWORD.test(password),
    /** Coordinate validation */
    isValidGalaxyCoordinate: (coord) => exports.VALIDATION_PATTERNS.COORDINATES.GALAXY_COORD.test(coord.trim()),
    isValidSimpleCoordinate: (coord) => exports.VALIDATION_PATTERNS.COORDINATES.SIMPLE_COORD.test(coord.trim()),
    /** Game-specific validation */
    isValidFleetName: (name) => exports.VALIDATION_HELPERS.isWithinLength(name, exports.VALIDATION_LENGTHS.GAME.FLEET_NAME.MIN, exports.VALIDATION_LENGTHS.GAME.FLEET_NAME.MAX) &&
        exports.VALIDATION_PATTERNS.GAME.FLEET_NAME.test(name),
    isValidEmpireName: (name) => exports.VALIDATION_HELPERS.isWithinLength(name, exports.VALIDATION_LENGTHS.GAME.EMPIRE_NAME.MIN, exports.VALIDATION_LENGTHS.GAME.EMPIRE_NAME.MAX) &&
        exports.VALIDATION_PATTERNS.GAME.EMPIRE_NAME.test(name),
    /** Location and destination validation */
    isSameLocation: (coord1, coord2) => coord1.trim() === coord2.trim(),
    isValidDestinationType: (type) => type === 'planet' || type === 'asteroid',
};
/**
 * Comprehensive Form Validators
 * High-level validation functions that combine multiple rules
 */
exports.FORM_VALIDATORS = {
    /** Authentication form validators */
    AUTH: {
        /** Validate login form */
        validateLogin: (email, password) => {
            const errors = [];
            if (exports.VALIDATION_HELPERS.isEmpty(email)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.EMAIL);
            }
            else if (!exports.VALIDATION_HELPERS.isValidEmail(email)) {
                errors.push(exports.VALIDATION_MESSAGES.FORMAT.EMAIL);
            }
            if (exports.VALIDATION_HELPERS.isEmpty(password)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.PASSWORD);
            }
            else if (!exports.VALIDATION_HELPERS.isValidPassword(password)) {
                errors.push(exports.VALIDATION_MESSAGES.FORMAT.PASSWORD_WEAK);
            }
            return { isValid: errors.length === 0, errors };
        },
        /** Validate registration form */
        validateRegistration: (email, username, password, confirmPassword) => {
            const errors = [];
            // Email validation
            if (exports.VALIDATION_HELPERS.isEmpty(email)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.EMAIL);
            }
            else if (!exports.VALIDATION_HELPERS.isValidEmail(email)) {
                errors.push(exports.VALIDATION_MESSAGES.FORMAT.EMAIL);
            }
            // Username validation
            if (exports.VALIDATION_HELPERS.isEmpty(username)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.USERNAME);
            }
            else if (!exports.VALIDATION_HELPERS.isValidUsername(username)) {
                if (!exports.VALIDATION_HELPERS.hasMinLength(username, exports.VALIDATION_LENGTHS.USERNAME.MIN)) {
                    errors.push(exports.VALIDATION_MESSAGES.LENGTH.USERNAME_SHORT);
                }
                else {
                    errors.push(exports.VALIDATION_MESSAGES.FORMAT.USERNAME);
                }
            }
            // Password validation
            if (exports.VALIDATION_HELPERS.isEmpty(password)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.PASSWORD);
            }
            else if (!exports.VALIDATION_HELPERS.isValidPassword(password)) {
                errors.push(exports.VALIDATION_MESSAGES.LENGTH.PASSWORD_SHORT);
            }
            // Confirm password validation
            if (password !== confirmPassword) {
                errors.push(exports.VALIDATION_MESSAGES.BUSINESS.PASSWORDS_MISMATCH);
            }
            return { isValid: errors.length === 0, errors };
        },
    },
    /** Game form validators */
    GAME: {
        /** Validate coordinate input */
        validateCoordinate: (coordinate, currentLocation) => {
            const errors = [];
            const coord = coordinate.trim();
            if (exports.VALIDATION_HELPERS.isEmpty(coord)) {
                errors.push(exports.VALIDATION_MESSAGES.REQUIRED.COORDINATE);
                return { isValid: false, errors };
            }
            // Check if it matches either coordinate format
            const isGalaxyFormat = exports.VALIDATION_HELPERS.isValidGalaxyCoordinate(coord);
            const isSimpleFormat = exports.VALIDATION_HELPERS.isValidSimpleCoordinate(coord);
            if (!isGalaxyFormat && !isSimpleFormat) {
                // Try to determine which format was intended based on the input
                if (coord.includes(':') && coord.match(/[A-Z]/)) {
                    errors.push(exports.VALIDATION_MESSAGES.FORMAT.COORDINATE_GALAXY);
                }
                else {
                    errors.push(exports.VALIDATION_MESSAGES.FORMAT.COORDINATE_SIMPLE);
                }
                return { isValid: false, errors };
            }
            // Check if it's the same as current location
            if (currentLocation && exports.VALIDATION_HELPERS.isSameLocation(coord, currentLocation)) {
                errors.push(exports.VALIDATION_MESSAGES.BUSINESS.SAME_LOCATION);
            }
            return { isValid: errors.length === 0, errors };
        },
        /** Validate fleet dispatch form */
        validateFleetDispatch: (destinationCoord, currentLocation) => {
            return exports.FORM_VALIDATORS.GAME.validateCoordinate(destinationCoord, currentLocation);
        },
    },
};
/**
 * Validation Utilities
 * Helper functions for managing validation state and results
 */
exports.VALIDATION_UTILS = {
    /** Create validation result object */
    createValidationResult: (isValid, errors = []) => ({
        isValid,
        errors,
        hasErrors: errors.length > 0,
        firstError: errors.length > 0 ? errors[0] : null,
    }),
    /** Combine multiple validation results */
    combineValidationResults: (...results) => {
        const allErrors = results.flatMap(result => result.errors);
        return exports.VALIDATION_UTILS.createValidationResult(results.every(result => result.isValid), allErrors);
    },
    /** Format error messages for display */
    formatErrorsForDisplay: (errors) => {
        if (errors.length === 0)
            return '';
        if (errors.length === 1)
            return errors[0];
        return errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    },
    /** Get field-specific error from validation result */
    getFieldError: (result, fieldName) => {
        const fieldErrors = result.errors.filter(error => error.toLowerCase().includes(fieldName.toLowerCase()));
        return fieldErrors.length > 0 ? fieldErrors[0] : result.firstError;
    },
};
/**
 * Export default for convenience
 */
exports.default = {
    PATTERNS: exports.VALIDATION_PATTERNS,
    LENGTHS: exports.VALIDATION_LENGTHS,
    MESSAGES: exports.VALIDATION_MESSAGES,
    HELPERS: exports.VALIDATION_HELPERS,
    VALIDATORS: exports.FORM_VALIDATORS,
    UTILS: exports.VALIDATION_UTILS,
};
