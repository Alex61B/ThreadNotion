"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
const stripe_1 = __importDefault(require("stripe"));
let stripeSingleton = null;
function getStripe() {
    if (stripeSingleton)
        return stripeSingleton;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is required');
    }
    stripeSingleton = new stripe_1.default(secretKey, {
        apiVersion: '2026-03-25.dahlia',
        typescript: true,
    });
    return stripeSingleton;
}
//# sourceMappingURL=stripeClient.js.map