/**
 * Centralized API exports
 * All API functions are organized by domain and match the swagger.json specification
 */

// Authentication APIs
export * from './auth';

// Driver Profile & Location APIs
export * from './driver';

// Shift Management APIs
export * from './shifts';

// Job Management APIs
export * from './jobs';

// Parking APIs
export * from './parking';

// Pickup/Delivery APIs
export * from './pickup';

// Statistics APIs
export * from './stats';

// WhatsApp Integration APIs
export * from './whatsapp';

// Client utilities
export * from './client';

// Shared types
export * from './types';
