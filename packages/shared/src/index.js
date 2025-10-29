"use strict";
/* Shared types and utilities for Attrition */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESPONSE_FORMAT = exports.HTTP_STATUS = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./validation"), exports);
__exportStar(require("./random"), exports);
__exportStar(require("./tech"), exports);
__exportStar(require("./buildings"), exports);
__exportStar(require("./overhaul"), exports);
__exportStar(require("./defenses"), exports);
__exportStar(require("./units"), exports);
__exportStar(require("./capacities"), exports);
__exportStar(require("./structureLevels"), exports);
__exportStar(require("./energyBudget"), exports);
__exportStar(require("./constants/configuration-keys"), exports);
__exportStar(require("./constants/database-fields"), exports);
__exportStar(require("./constants/env-vars"), exports);
__exportStar(require("./constants/file-paths"), exports);
__exportStar(require("./constants/magic-numbers"), exports);
__exportStar(require("./constants/string-constants"), exports);
__exportStar(require("./constants/business-thresholds"), exports);
__exportStar(require("./constants/validation-rules"), exports);
// Export response formats without ApiResponse to avoid conflict
var response_formats_1 = require("./constants/response-formats");
Object.defineProperty(exports, "HTTP_STATUS", { enumerable: true, get: function () { return response_formats_1.HTTP_STATUS; } });
Object.defineProperty(exports, "RESPONSE_FORMAT", { enumerable: true, get: function () { return response_formats_1.RESPONSE_FORMAT; } });
