"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGraceSweep = runGraceSweep;
const graceSweeper_1 = require("../../billing/graceSweeper");
async function runGraceSweep() {
    await (0, graceSweeper_1.sweepExpiredGracePeriods)();
}
//# sourceMappingURL=graceSweeper.js.map