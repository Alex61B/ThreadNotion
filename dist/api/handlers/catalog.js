"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPersonas = listPersonas;
exports.listProducts = listProducts;
const db_1 = require("../../db");
async function listPersonas() {
    const personas = await db_1.prisma.persona.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const transformed = personas.map((p) => ({
        id: p.id,
        name: p.name,
        tone: p.tone,
        values: p.values,
        instructions: p.instructions,
        createdAt: p.createdAt.toISOString(),
    }));
    return { status: 200, body: { ok: true, personas: transformed, data: transformed } };
}
async function listProducts() {
    const products = await db_1.prisma.product.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const transformed = products.map((p) => ({
        id: p.id,
        name: p.title,
        title: p.title,
        description: p.description,
        brand: p.brand,
        price: p.price,
        currency: p.currency,
        sku: p.sku,
        attributes: p.attributes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
    }));
    return { status: 200, body: { ok: true, products: transformed, data: transformed } };
}
//# sourceMappingURL=catalog.js.map