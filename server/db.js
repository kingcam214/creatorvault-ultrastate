"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
export const db = {};
exports.getDb = getDb;
exports.upsertUser = upsertUser;
exports.getUserByOpenId = getUserByOpenId;
exports.getUserById = getUserById;
exports.getAllUsers = getAllUsers;
exports.getUsersByRole = getUsersByRole;
exports.updateUserRole = updateUserRole;
exports.updateCreatorStatus = updateCreatorStatus;
exports.updateUserProfile = updateUserProfile;
exports.createEmmaNetworkEntry = createEmmaNetworkEntry;
exports.getEmmaNetworkByUserId = getEmmaNetworkByUserId;
exports.getAllEmmaNetwork = getAllEmmaNetwork;
exports.updateEmmaNetwork = updateEmmaNetwork;
exports.addToWaitlist = addToWaitlist;
exports.getWaitlistByEmail = getWaitlistByEmail;
exports.getAllWaitlist = getAllWaitlist;
exports.updateWaitlistStatus = updateWaitlistStatus;
exports.createContent = createContent;
exports.getContentByUserId = getContentByUserId;
exports.getContentById = getContentById;
exports.getAllContent = getAllContent;
exports.updateContentStatus = updateContentStatus;
exports.createPayment = createPayment;
exports.getPaymentsByUserId = getPaymentsByUserId;
exports.getPaymentByStripeId = getPaymentByStripeId;
exports.createVideoJob = createVideoJob;
exports.getVideoJobById = getVideoJobById;
exports.getVideoJobsByUserId = getVideoJobsByUserId;
exports.updateVideoJob = updateVideoJob;
exports.logAnalyticsEvent = logAnalyticsEvent;
exports.getAnalyticsByUserId = getAnalyticsByUserId;
exports.getAnalyticsByEventType = getAnalyticsByEventType;
exports.getCulturalTemplates = getCulturalTemplates;
exports.createCulturalTemplate = createCulturalTemplate;
exports.createBrandAffiliation = createBrandAffiliation;
exports.getBrandAffiliationsByUserId = getBrandAffiliationsByUserId;
var drizzle_orm_1 = require("drizzle-orm");
var mysql2_1 = require("drizzle-orm/mysql2");
var schema_1 = require("../drizzle/schema");
var env_1 = require("./_core/env");
var _db = null;
function getDb() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (!_db && process.env.DATABASE_URL) {
                try {
                    _db = (0, mysql2_1.drizzle)(process.env.DATABASE_URL);
                }
                catch (error) {
                    console.warn("[Database] Failed to connect:", error);
                    _db = null;
                }
            }
            return [2 /*return*/, _db];
        });
    });
}
// Export db instance for direct use
// Only initialize if DATABASE_URL is set
exports.db = process.env.DATABASE_URL ? (0, mysql2_1.drizzle)(process.env.DATABASE_URL) : null;
// ============ USER MANAGEMENT ============
function upsertUser(user) {
    return __awaiter(this, void 0, void 0, function () {
        var db, values_1, updateSet_1, textFields, assignNullable, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!user.openId) {
                        throw new Error("User openId is required for upsert");
                    }
                    return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db) {
                        console.warn("[Database] Cannot upsert user: database not available");
                        return [2 /*return*/];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    values_1 = {
                        openId: user.openId,
                    };
                    updateSet_1 = {};
                    textFields = ["name", "email", "loginMethod", "language", "country", "primaryBrand", "creatorStatus"];
                    assignNullable = function (field) {
                        var value = user[field];
                        if (value === undefined)
                            return;
                        var normalized = value !== null && value !== void 0 ? value : null;
                        values_1[field] = normalized;
                        updateSet_1[field] = normalized;
                    };
                    textFields.forEach(assignNullable);
                    if (user.lastSignedIn !== undefined) {
                        values_1.lastSignedIn = user.lastSignedIn;
                        updateSet_1.lastSignedIn = user.lastSignedIn;
                    }
                    if (user.role !== undefined) {
                        values_1.role = user.role;
                        updateSet_1.role = user.role;
                    }
                    else if (user.openId === env_1.ENV.ownerOpenId) {
                        values_1.role = "king";
                        updateSet_1.role = "king";
                    }
                    if (user.referredBy !== undefined) {
                        values_1.referredBy = user.referredBy;
                        updateSet_1.referredBy = user.referredBy;
                    }
                    if (user.contentType !== undefined) {
                        values_1.contentType = user.contentType;
                        updateSet_1.contentType = user.contentType;
                    }
                    if (!values_1.lastSignedIn) {
                        values_1.lastSignedIn = new Date();
                    }
                    if (Object.keys(updateSet_1).length === 0) {
                        updateSet_1.lastSignedIn = new Date();
                    }
                    return [4 /*yield*/, db.insert(schema_1.users).values(values_1).onDuplicateKeyUpdate({
                            set: updateSet_1,
                        })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    console.error("[Database] Failed to upsert user:", error_1);
                    throw error_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function getUserByOpenId(openId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, undefined];
                    return [4 /*yield*/, db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.openId, openId)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : undefined];
            }
        });
    });
}
function getUserById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, undefined];
                    return [4 /*yield*/, db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : undefined];
            }
        });
    });
}
function getAllUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.users).orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function getUsersByRole(role) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.role, role)).orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateUserRole(userId, role) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.users).set({ role: role }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function updateCreatorStatus(userId, status) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.users).set({ creatorStatus: status }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function updateUserProfile(userId, data) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.users).set(data).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============ EMMA NETWORK ============
function createEmmaNetworkEntry(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.emmaNetwork).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getEmmaNetworkByUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.select().from(schema_1.emmaNetwork).where((0, drizzle_orm_1.eq)(schema_1.emmaNetwork.userId, userId)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
function getAllEmmaNetwork() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.emmaNetwork).orderBy((0, drizzle_orm_1.desc)(schema_1.emmaNetwork.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateEmmaNetwork(id, data) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.emmaNetwork).set(data).where((0, drizzle_orm_1.eq)(schema_1.emmaNetwork.id, id))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============ WAITLIST ============
function addToWaitlist(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.waitlist).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getWaitlistByEmail(email) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.select().from(schema_1.waitlist).where((0, drizzle_orm_1.eq)(schema_1.waitlist.email, email)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
function getAllWaitlist() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.waitlist).orderBy((0, drizzle_orm_1.desc)(schema_1.waitlist.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateWaitlistStatus(id, status) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.waitlist).set({ status: status }).where((0, drizzle_orm_1.eq)(schema_1.waitlist.id, id))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============ CONTENT ============
function createContent(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.content).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getContentByUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.content).where((0, drizzle_orm_1.eq)(schema_1.content.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.content.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function getContentById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.select().from(schema_1.content).where((0, drizzle_orm_1.eq)(schema_1.content.id, id)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
function getAllContent() {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.content).orderBy((0, drizzle_orm_1.desc)(schema_1.content.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateContentStatus(id, status) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.content).set({ status: status }).where((0, drizzle_orm_1.eq)(schema_1.content.id, id))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============ PAYMENTS ============
function createPayment(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.payments).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getPaymentsByUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function getPaymentByStripeId(stripePaymentId) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.select().from(schema_1.payments).where((0, drizzle_orm_1.eq)(schema_1.payments.stripePaymentId, stripePaymentId)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
// ============ VIDEO GENERATION ============
function createVideoJob(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.videoGenerationJobs).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getVideoJobById(id) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.select().from(schema_1.videoGenerationJobs).where((0, drizzle_orm_1.eq)(schema_1.videoGenerationJobs.id, id)).limit(1)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result.length > 0 ? result[0] : null];
            }
        });
    });
}
function getVideoJobsByUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.videoGenerationJobs).where((0, drizzle_orm_1.eq)(schema_1.videoGenerationJobs.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.videoGenerationJobs.createdAt))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function updateVideoJob(id, data) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/];
                    return [4 /*yield*/, db.update(schema_1.videoGenerationJobs).set(data).where((0, drizzle_orm_1.eq)(schema_1.videoGenerationJobs.id, id))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// ============ ANALYTICS ============
function logAnalyticsEvent(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.analyticsEvents).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getAnalyticsByUserId(userId_1) {
    return __awaiter(this, arguments, void 0, function (userId, limit) {
        var db;
        if (limit === void 0) { limit = 100; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.analyticsEvents).where((0, drizzle_orm_1.eq)(schema_1.analyticsEvents.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_1.analyticsEvents.createdAt)).limit(limit)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function getAnalyticsByEventType(eventType_1) {
    return __awaiter(this, arguments, void 0, function (eventType, limit) {
        var db;
        if (limit === void 0) { limit = 100; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.analyticsEvents).where((0, drizzle_orm_1.eq)(schema_1.analyticsEvents.eventType, eventType)).orderBy((0, drizzle_orm_1.desc)(schema_1.analyticsEvents.createdAt)).limit(limit)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// ============ CULTURAL TEMPLATES ============
function getCulturalTemplates(culture, contentType) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    if (!contentType) return [3 /*break*/, 3];
                    return [4 /*yield*/, db.select().from(schema_1.culturalContentTemplates)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.culturalContentTemplates.culture, culture), (0, drizzle_orm_1.eq)(schema_1.culturalContentTemplates.contentType, contentType)))
                            .orderBy((0, drizzle_orm_1.desc)(schema_1.culturalContentTemplates.effectivenessScore))];
                case 2: return [2 /*return*/, _a.sent()];
                case 3: return [4 /*yield*/, db.select().from(schema_1.culturalContentTemplates)
                        .where((0, drizzle_orm_1.eq)(schema_1.culturalContentTemplates.culture, culture))
                        .orderBy((0, drizzle_orm_1.desc)(schema_1.culturalContentTemplates.effectivenessScore))];
                case 4: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function createCulturalTemplate(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.culturalContentTemplates).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
// ============ BRAND AFFILIATIONS ============
function createBrandAffiliation(data) {
    return __awaiter(this, void 0, void 0, function () {
        var db, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, db.insert(schema_1.brandAffiliations).values(data)];
                case 2:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getBrandAffiliationsByUserId(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var db;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDb()];
                case 1:
                    db = _a.sent();
                    if (!db)
                        return [2 /*return*/, []];
                    return [4 /*yield*/, db.select().from(schema_1.brandAffiliations).where((0, drizzle_orm_1.eq)(schema_1.brandAffiliations.userId, userId))];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
