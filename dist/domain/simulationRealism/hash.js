"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashStringToNonNegativeInt = hashStringToNonNegativeInt;
exports.hashStringToIndex = hashStringToIndex;
function hashStringToNonNegativeInt(input) {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = (h * 31 + input.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}
function hashStringToIndex(input, modulo) {
    if (modulo <= 0)
        return 0;
    return hashStringToNonNegativeInt(input) % modulo;
}
//# sourceMappingURL=hash.js.map