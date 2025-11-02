/**
 * String Constants
 * 
 * Centralized definition of hardcoded strings used throughout the application
 * to prevent magic strings and ensure consistency.
 */

// Loading and Status Messages
export const LOADING_MESSAGES = {
  DEFAULT: 'Loading...',
  ATTRITION: 'Loading Attrition...',
  DATA: 'Loading data...',
  CONNECTING: 'Connecting...',
  INITIALIZING: 'Initializing...',
  PLEASE_WAIT: 'Please wait...',
} as const;

// Button and Action Text
export const BUTTON_TEXT = {
  SAVE: 'Save',
  CANCEL: 'Cancel',
  SUBMIT: 'Submit',
  START: 'Start',
  EDIT: 'Edit',
  DELETE: 'Delete',
  CREATE: 'Create',
  UPDATE: 'Update',
  CONFIRM: 'Confirm',
  OK: 'OK',
  YES: 'Yes',
  NO: 'No',
  CLOSE: 'Close',
  BACK: 'Back',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  CONTINUE: 'Continue',
  RETRY: 'Retry',
  RELOAD: 'Reload',
  REFRESH: 'Refresh',
} as const;

// Form Labels and Placeholders
export const FORM_LABELS = {
  EMAIL: 'Email',
  PASSWORD: 'Password',
  USERNAME: 'Username',
  NAME: 'Name',
  FIRST_NAME: 'First Name',
  LAST_NAME: 'Last Name',
  PHONE: 'Phone',
  ADDRESS: 'Address',
  DESCRIPTION: 'Description',
  TITLE: 'Title',
  SEARCH: 'Search',
} as const;

export const FORM_PLACEHOLDERS = {
  EMAIL: 'Enter your email',
  PASSWORD: 'Enter your password',
  USERNAME: 'Enter your username',
  NAME: 'Enter your name',
  SEARCH: 'Search...',
  DESCRIPTION: 'Enter description...',
  SELECT_OPTION: 'Select an option',
} as const;

// Common Success Messages
export const SUCCESS_TEXT = {
  SAVED: 'Saved successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  OPERATION_COMPLETE: 'Operation completed successfully',
  SUCCESS: 'Success',
} as const;

// Common Error Messages  
export const ERROR_TEXT = {
  ERROR: 'Error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_INPUT: 'Invalid input',
  NETWORK_ERROR: 'Network error occurred',
  SOMETHING_WRONG: 'Something went wrong',
  TRY_AGAIN: 'Please try again',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Not found',
  SERVER_ERROR: 'Server error',
  TIMEOUT: 'Request timed out',
  UNKNOWN_ERROR: 'An unknown error occurred',
} as const;

// Notification and Status Messages
export const NOTIFICATION_TEXT = {
  WARNING: 'Warning',
  NOTICE: 'Notice',
  INFO: 'Info',
  ALERT: 'Alert',
} as const;

// Navigation and Page Text
export const PAGE_TEXT = {
  HOME: 'Home',
  DASHBOARD: 'Dashboard',
  PROFILE: 'Profile',
  SETTINGS: 'Settings',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  REGISTER: 'Register',
  HELP: 'Help',
  ABOUT: 'About',
  CONTACT: 'Contact',
  PRIVACY: 'Privacy Policy',
  TERMS: 'Terms of Service',
  PAGE_NOT_FOUND: 'Page not found',
  ACCESS_DENIED: 'Access denied',
} as const;

// Status and State Text - High Priority (190 opportunities)
export const STATUS_TEXT = {
  ONLINE: 'Online',
  OFFLINE: 'Offline', 
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  AVAILABLE: 'Available',
  UNAVAILABLE: 'Unavailable',
  PENDING: 'Pending',
  COMPLETE: 'Complete',
  IN_PROGRESS: 'In Progress',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  ERROR: 'Error',
  LOADING: 'Loading',
  PROCESSING: 'Processing',
  CONNECTING: 'Connecting',
  CONNECTED: 'Connected',
  DISCONNECTED: 'Disconnected',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
} as const;

// Game-Specific Text Constants - High Priority (175 opportunities)
export const GAME_TEXT = {
  // Core Game Elements
  EMPIRE: 'Empire',
  BUILDING: 'Building',
  BUILDINGS: 'Buildings',
  FLEET: 'Fleet',
  FLEETS: 'Fleets', 
  RESEARCH: 'Research',
  COMBAT: 'Combat',
  CREDITS: 'Credits',
  ENERGY: 'Energy',
  RESOURCES: 'Resources',
  TECHNOLOGY: 'Technology',
  CONSTRUCTION: 'Construction',
  LEVEL: 'Level',
  UPGRADE: 'Upgrade',
  
  // Game States and Properties
  STATUS: 'Status',
  LOCATION: 'Location',
  COORDINATES: 'Coordinates',
  TIME_REMAINING: 'Time Remaining',
  PROGRESS: 'Progress',
  COMPLETE: 'Complete',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  
  // Game Actions (subset from scan results)
  BUILD: 'Build',
  CONSTRUCT: 'Construct',
  LAUNCH: 'Launch',
  ATTACK: 'Attack',
  DEFEND: 'Defend',
} as const;

// Generic Display Text
export const DISPLAY_TEXT = {
  NONE: 'None',
  ALL: 'All',
  ANY: 'Any',
  OTHER: 'Other',
  UNKNOWN: 'Unknown',
  N_A: 'N/A',
  TOTAL: 'Total',
  SUBTOTAL: 'Subtotal',
  COUNT: 'Count',
  AMOUNT: 'Amount',
  QUANTITY: 'Quantity',
  PRICE: 'Price',
  VALUE: 'Value',
  PERCENT: '%',
  CURRENCY: '$',
  DATE: 'Date',
  TIME: 'Time',
  TODAY: 'Today',
  YESTERDAY: 'Yesterday',
  TOMORROW: 'Tomorrow',
  NOW: 'Now',
  NEVER: 'Never',
  ALWAYS: 'Always',
  SOMETIMES: 'Sometimes',
  OPTIONAL: 'Optional',
  REQUIRED: 'Required',
  RECOMMENDED: 'Recommended',
  ENABLED: 'Enabled',
  DISABLED: 'Disabled',
  ON: 'On',
  OFF: 'Off',
  TRUE: 'True',
  FALSE: 'False',
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  VISIBLE: 'Visible',
  HIDDEN: 'Hidden',
  // Status indicators (also available in STATUS_TEXT)
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  UNAVAILABLE: 'Unavailable',
  AVAILABLE: 'Available',
} as const;

// All constants combined for convenience
export const STRING_CONSTANTS = {
  LOADING: LOADING_MESSAGES,
  BUTTONS: BUTTON_TEXT,
  FORM_LABELS,
  FORM_PLACEHOLDERS,
  SUCCESS: SUCCESS_TEXT,
  ERROR: ERROR_TEXT,
  PAGES: PAGE_TEXT,
  STATUS: STATUS_TEXT,
  GAME: GAME_TEXT,
  DISPLAY: DISPLAY_TEXT,
} as const;
