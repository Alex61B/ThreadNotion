"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drillVariantIndexFromSeed = drillVariantIndexFromSeed;
const weaknessPressureCatalog_1 = require("../adaptive/weaknessPressureCatalog");
const hash_1 = require("../simulationRealism/hash");
/**
 * Deterministic variant index for catalog rotation from a stable seed (userId, conv id, etc.).
 */
function drillVariantIndexFromSeed(seed, skill, salt = '') {
    const opts = (0, weaknessPressureCatalog_1.catalogPressureOptionsForSkill)(skill);
    return (0, hash_1.hashStringToIndex)(`${seed}:${skill}:${salt}`, opts.length);
}
//# sourceMappingURL=drillVariations.js.map