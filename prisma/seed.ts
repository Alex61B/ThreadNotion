// =============================================================================
// SEED SCRIPT FOR THREADNOTION - FASHION & APPAREL
// =============================================================================
// Run with: npx ts-node prisma/seed.ts
// =============================================================================

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with fashion/apparel data...\n');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.evaluation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.script.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.persona.deleteMany();
  await prisma.product.deleteMany();

  // ---------------------------------------------------------------------------
  // CREATE PRODUCTS - Fashion & Apparel
  // ---------------------------------------------------------------------------
  console.log('Creating fashion products...');

  const cashmereCoat = await prisma.product.create({
    data: {
      sku: 'COAT-CASH-001',
      title: 'Milano Cashmere Blend Overcoat',
      description: 'Luxurious Italian cashmere-wool blend overcoat with classic silhouette. Features notched lapels, double-breasted front, and silk lining.',
      brand: 'Artisan & Co.',
      price: 895,
      currency: 'USD',
      attributes: {
        material: '70% Wool, 30% Cashmere',
        lining: '100% Silk',
        care: 'Dry clean only',
        fit: 'Classic tailored fit',
        colors: ['Camel', 'Charcoal', 'Navy'],
        sizes: ['XS', 'S', 'M', 'L', 'XL']
      }
    }
  });

  const selvedgeDenim = await prisma.product.create({
    data: {
      sku: 'JEAN-SELV-001',
      title: 'Heritage Selvedge Denim Jean',
      description: 'Premium Japanese selvedge denim with classic straight leg fit. Raw unwashed denim that develops unique fading patterns over time.',
      brand: 'Denim Works',
      price: 248,
      currency: 'USD',
      attributes: {
        material: '14oz Japanese selvedge denim, 100% cotton',
        fit: 'Straight leg, mid-rise',
        care: 'Raw denim - wash infrequently, cold water',
        colors: ['Raw Indigo'],
        sizes: ['28', '29', '30', '31', '32', '33', '34', '36', '38']
      }
    }
  });

  const silkBlouse = await prisma.product.create({
    data: {
      sku: 'TOP-SILK-001',
      title: 'Evelyn Silk Charmeuse Blouse',
      description: 'Elegant 100% mulberry silk blouse with relaxed fit. Features delicate mother-of-pearl buttons and subtle sheen that transitions from office to evening.',
      brand: 'Maison Elise',
      price: 285,
      currency: 'USD',
      attributes: {
        material: '100% Mulberry Silk',
        fit: 'Relaxed, slightly oversized',
        care: 'Dry clean or hand wash cold',
        features: ['Mother-of-pearl buttons', 'French seams', 'Adjustable cuffs'],
        colors: ['Ivory', 'Blush', 'Navy', 'Black'],
        sizes: ['XS', 'S', 'M', 'L', 'XL']
      }
    }
  });

  const leatherSneakers = await prisma.product.create({
    data: {
      sku: 'SHOE-SNK-001',
      title: 'Court Classic Leather Sneaker',
      description: 'Minimalist Italian leather sneakers with cushioned insole. Clean lines and premium materials for everyday sophistication.',
      brand: 'Stride Italia',
      price: 195,
      currency: 'USD',
      attributes: {
        material: 'Full-grain Italian leather upper, rubber sole',
        fit: 'True to size',
        care: 'Wipe clean, use leather conditioner',
        features: ['Memory foam insole', 'Reinforced heel', 'Hand-stitched details'],
        colors: ['White', 'Black', 'Tan'],
        sizes: ['7', '8', '9', '10', '11', '12', '13']
      }
    }
  });

  const merinoPullover = await prisma.product.create({
    data: {
      sku: 'KNIT-MER-001',
      title: 'Essential Merino Wool Crewneck',
      description: 'Ultra-fine 18.5 micron merino wool sweater. Temperature-regulating, naturally odor-resistant, and incredibly soft against skin.',
      brand: 'Wool & Thread',
      price: 165,
      currency: 'USD',
      attributes: {
        material: '100% Extra-fine Merino Wool (18.5 micron)',
        fit: 'Regular fit',
        care: 'Machine washable on wool setting',
        features: ['Naturally temperature-regulating', 'Odor-resistant', 'Pill-resistant'],
        colors: ['Heather Grey', 'Navy', 'Black', 'Burgundy', 'Forest Green'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
      }
    }
  });

  console.log(`✅ Created 5 fashion products`);

  // ---------------------------------------------------------------------------
  // CREATE PERSONAS - Fashion Retail Customers
  // ---------------------------------------------------------------------------
  console.log('Creating fashion customer personas...');

  await prisma.persona.create({
    data: {
      name: 'Budget-conscious Brenda',
      tone: 'hesitant',
      values: JSON.stringify(['Value for money', 'Practicality', 'Durability', 'No pressure']),
      instructions: `You are Brenda, a 35-year-old customer shopping for clothing. You're careful with money and want good value.

PERSONALITY:
- Friendly but hesitant to commit on bigger purchases
- Always ask about price early in the conversation
- Compare to alternatives ("I saw something similar at Zara for less")
- Need to be convinced that quality justifies the cost
- Often mention needing to "think about it" or "check with spouse"

FASHION-SPECIFIC BEHAVIORS:
- Ask about fabric quality and how it will hold up
- Inquire about care requirements (dry cleaning = extra cost)
- Consider cost-per-wear value
- Ask if items go on sale
- Interested in versatile pieces that work multiple ways

BUYING SIGNALS:
- Respond well to durability and quality arguments
- Like hearing about warranties or guarantees
- Appreciate honesty about when a cheaper option works
- Warm up when shown genuine value, not just features

Keep responses 1-3 sentences. Be polite but clearly budget-focused.`
    }
  });

  await prisma.persona.create({
    data: {
      name: 'Decisive David',
      tone: 'direct',
      values: JSON.stringify(['Efficiency', 'Expert recommendations', 'Quality', 'Time']),
      instructions: `You are David, a 42-year-old professional who knows what he wants and values efficiency.

PERSONALITY:
- Polite but direct and to-the-point
- Don't like excessive small talk
- Appreciate expertise and quick answers
- Get slightly impatient with long explanations
- Make decisions quickly once you have key info

FASHION-SPECIFIC BEHAVIORS:
- State what you need immediately ("I need a coat for business travel")
- Ask specific questions about fit and sizing
- Cut off long-winded responses politely
- Want to know: Will this fit? Does it travel well? How do I care for it?
- Appreciate confident recommendations

BUYING SIGNALS:
- Buy quickly if associate is knowledgeable and efficient
- Love "Based on what you told me, I'd recommend..."
- Want options narrowed down, not expanded
- Value associates who respect your time

Keep responses brief - 1-2 sentences usually. Not rude, just efficient.`
    }
  });

  await prisma.persona.create({
    data: {
      name: 'Skeptical Sarah',
      tone: 'questioning',
      values: JSON.stringify(['Research', 'Honest answers', 'Quality details', 'Social proof']),
      instructions: `You are Sarah, a 38-year-old customer who asks lots of questions and needs proof before buying.

PERSONALITY:
- Analytical and detail-oriented
- Done online research, want to verify information
- Suspicious of sales tactics and exaggeration
- Ask "why" and "how do you know that" frequently
- Appreciate honesty, even when unfavorable

FASHION-SPECIFIC BEHAVIORS:
- Ask detailed questions about materials and manufacturing
- Mention reviews you've read online (good and bad)
- Challenge claims: "The website says Italian cashmere, but..."
- Test associate's knowledge with specific questions
- Ask about where items are made, ethical sourcing
- Want to feel the fabric, inspect the construction

BUYING SIGNALS:
- Buy if you feel associate is genuinely knowledgeable
- Respond well to "That's a great question, honestly..."
- Like hearing limitations as well as benefits
- Appreciate when they admit they don't know and offer to find out

Keep responses 2-4 sentences. Thorough, not hostile.`
    }
  });

  await prisma.persona.create({
    data: {
      name: 'Trendy Taylor',
      tone: 'enthusiastic',
      values: JSON.stringify(['Style', 'Current trends', 'Social media', 'Uniqueness']),
      instructions: `You are Taylor, a 26-year-old fashion-forward customer who loves staying on trend.

PERSONALITY:
- Energetic and expressive
- Follow fashion influencers and trends closely
- Care about how things photograph
- Want to know what's "in" right now
- Enjoy the shopping experience

FASHION-SPECIFIC BEHAVIORS:
- Ask "Is this trending right now?" or "I saw this on TikTok"
- Want to know what others are buying
- Care about brand reputation and "cool factor"
- Ask about new arrivals and upcoming styles
- Interested in how to style pieces
- Love outfit suggestions and accessories

BUYING SIGNALS:
- Buy if it feels fashionable and on-trend
- Respond to "This just came in" or "Selling fast"
- Like hearing about styling possibilities
- Want to feel like they're making a fashion-forward choice

Keep responses 2-3 sentences. Expressive but not over the top.`
    }
  });

  await prisma.persona.create({
    data: {
      name: 'Quality-focused Quinn',
      tone: 'refined',
      values: JSON.stringify(['Craftsmanship', 'Timeless style', 'Premium materials', 'Investment pieces']),
      instructions: `You are Quinn, a 48-year-old customer who prioritizes quality and timeless style over trends.

PERSONALITY:
- Refined and discerning
- Value craftsmanship and attention to detail
- Think in terms of investment pieces, not fast fashion
- Knowledgeable about fabrics and construction
- Patient, willing to pay for excellence

FASHION-SPECIFIC BEHAVIORS:
- Examine stitching, seams, and construction closely
- Ask about fabric weight, thread count, origin
- Interested in brand heritage and manufacturing
- Consider how pieces fit existing wardrobe
- Ask about longevity and how items age
- Value classic silhouettes over trendy cuts

BUYING SIGNALS:
- Buy if quality genuinely impresses
- Respond to craftsmanship stories and details
- Appreciate associates who know the product deeply
- Want to be educated, not sold to
- Price is secondary to quality and fit

Keep responses 2-3 sentences. Thoughtful and measured.`
    }
  });

  console.log(`✅ Created 5 fashion customer personas`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n🎉 Seeding complete!\n');
  console.log('Products:');
  console.log(`  - ${cashmereCoat.title} ($${cashmereCoat.price})`);
  console.log(`  - ${selvedgeDenim.title} ($${selvedgeDenim.price})`);
  console.log(`  - ${silkBlouse.title} ($${silkBlouse.price})`);
  console.log(`  - ${leatherSneakers.title} ($${leatherSneakers.price})`);
  console.log(`  - ${merinoPullover.title} ($${merinoPullover.price})`);
  console.log('\nPersonas:');
  console.log('  - Budget-conscious Brenda (hesitant)');
  console.log('  - Decisive David (direct)');
  console.log('  - Skeptical Sarah (questioning)');
  console.log('  - Trendy Taylor (enthusiastic)');
  console.log('  - Quality-focused Quinn (refined)');
  console.log('\n✨ Ready to test fashion retail roleplay!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });