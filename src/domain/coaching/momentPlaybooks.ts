import type { SalesSkill } from '../../schemas/coaching';
import { MOMENT_TYPES } from '../../schemas/momentCoaching';
import type { MomentType } from '../../schemas/momentCoaching';

export type PlaybookStep = {
  stepNumber: number;
  description: string;
  examplePhrase: string;
};

export type ExampleResponse = {
  text: string;
  annotation: string;
};

export type MomentPlaybook = {
  momentType: MomentType;
  label: string;
  customerSignals: string[];
  skillMappings: SalesSkill[];
  steps: PlaybookStep[];
  strongExample: ExampleResponse;
  weakExample: ExampleResponse;
  commonMistakes: string[];
  coachingGuidance: string;
};

export const MOMENT_PLAYBOOK_CATALOG: Record<MomentType, MomentPlaybook> = {
  price_hesitation: {
    momentType: 'price_hesitation',
    label: 'Price Hesitation',
    customerSignals: [
      "that's expensive",
      "is this on sale",
      "I wasn't planning to spend that much",
      "do you have something cheaper",
      "that's a lot",
      "I'm not sure it's worth it",
      "the price",
      "too much",
    ],
    skillMappings: ['objection_handling', 'empathy'],
    steps: [
      {
        stepNumber: 1,
        description: 'Acknowledge the concern without dismissing or defending the price',
        examplePhrase: "I totally understand — that's a real investment.",
      },
      {
        stepNumber: 2,
        description:
          'Diagnose whether the objection is absolute budget or uncertainty about value',
        examplePhrase:
          "Is it more about the budget right now, or wanting to make sure it's worth it for you?",
      },
      {
        stepNumber: 3,
        description:
          'Reframe around value, longevity, or cost-per-use tied to what the customer said matters to them',
        examplePhrase:
          "Since you mentioned you wear blazers a few times a week, the cost-per-wear on this one actually comes out quite low.",
      },
      {
        stepNumber: 4,
        description:
          'Offer a low-commitment next step (try it on, compare options, or show an alternative price point)',
        examplePhrase:
          "Want to try it on first and see if the fit makes it feel more worth it? Or I can show you something similar at a lower price point.",
      },
    ],
    strongExample: {
      text: "I hear you — it is on the higher end. Can I ask what your hesitation is — is it the number itself, or are you unsure if it's right for you? [Customer: more the value.] That makes sense. This one is Italian wool, hand-finished, and the construction at this price is genuinely better than the next tier down. Want to try it on and see if the fit seals the deal?",
      annotation:
        'Acknowledges, diagnoses the real concern, reframes with specifics, proposes a low-commitment next step.',
    },
    weakExample: {
      text: "Oh, it's actually great value for the quality.",
      annotation:
        'Jumps straight to defence without acknowledging the feeling or understanding what "expensive" means to this customer.',
    },
    commonMistakes: [
      'Defending the price immediately without first acknowledging the concern',
      'Offering a discount before understanding whether the objection is budget or value',
      'Using generic "quality" language without tying it to what the customer said matters',
      'Ignoring the objection and moving to a different product feature',
    ],
    coachingGuidance:
      'Focus on whether the associate acknowledged the feeling first, diagnosed the real concern, and reframed with specifics rather than generic value claims.',
  },

  fit_sizing_uncertainty: {
    momentType: 'fit_sizing_uncertainty',
    label: 'Fit & Sizing Uncertainty',
    customerSignals: [
      "I don't know if it would fit me",
      "I'm not sure about the sizing",
      "I'm between sizes",
      "it looks small",
      "I'm not sure how it runs",
      "does it run true to size",
      "I usually have trouble finding things that fit",
    ],
    skillMappings: ['product_knowledge', 'empathy'],
    steps: [
      {
        stepNumber: 1,
        description: 'Validate the concern — fit uncertainty is real and common',
        examplePhrase: "That's such a valid thing to wonder — sizing really varies by brand.",
      },
      {
        stepNumber: 2,
        description:
          'Ask a clarifying question about their body or usual size to narrow down the right fit',
        examplePhrase: "What size do you usually wear, and do you prefer a more fitted or relaxed feel?",
      },
      {
        stepNumber: 3,
        description: 'Share specific product knowledge about how the item runs or is constructed',
        examplePhrase:
          "This one tends to run slightly slim through the shoulders — if you're between sizes I'd go up, especially if you want room to layer.",
      },
      {
        stepNumber: 4,
        description: 'Remove the risk by inviting them to try it on',
        examplePhrase:
          "The only way to really know is to try it on — that's what the fitting room is for.",
      },
    ],
    strongExample: {
      text: "Totally fair — sizing varies a lot between brands. What size do you usually go with? [Customer: I'm usually a medium but sometimes a large.] Got it. This one runs a little fitted through the chest, so if you're on the edge I'd lean large, especially if you want to layer anything under it. Want to grab both and try them on?",
      annotation:
        'Validates, asks the right question, gives product-specific guidance, and removes risk with a try-on.',
    },
    weakExample: {
      text: "It comes in small, medium, and large.",
      annotation:
        'Lists sizes without acknowledging the concern, asking about their needs, or offering any guidance.',
    },
    commonMistakes: [
      'Listing available sizes without addressing the uncertainty',
      'Giving generic advice ("just go up a size") without asking about their usual fit or body',
      'Not using product-specific knowledge about how the garment actually fits',
      'Failing to invite the customer to try it on',
    ],
    coachingGuidance:
      'Evaluate whether the associate asked about the customer\'s usual size and preferences before giving advice, and whether they offered a try-on to eliminate the risk.',
  },

  styling_request: {
    momentType: 'styling_request',
    label: 'Styling Request',
    customerSignals: [
      "what would I wear this with",
      "how would I style this",
      "I don't know what to put with it",
      "what goes with this",
      "can you help me put an outfit together",
      "I'm not sure what it pairs with",
    ],
    skillMappings: ['discovery_questions', 'product_knowledge', 'storytelling'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Ask a brief discovery question to understand their wardrobe and the occasion they have in mind',
        examplePhrase:
          "I'd love to help — are you thinking more casual day-to-day, or do you have a specific occasion in mind?",
      },
      {
        stepNumber: 2,
        description:
          'Give at least one concrete, specific styling suggestion based on what they said',
        examplePhrase:
          "For a casual look, this pairs really well with straight-leg denim and white trainers — very clean and easy.",
      },
      {
        stepNumber: 3,
        description:
          'Help them visualise it by connecting the suggestion to their life or wardrobe',
        examplePhrase:
          "If you already have slim jeans at home, you basically have 80% of the outfit sorted.",
      },
      {
        stepNumber: 4,
        description:
          'Optionally offer to show them a complementary piece in-store to complete the look',
        examplePhrase:
          "We actually have a few trousers that work perfectly with this — want me to grab one so you can see the full look?",
      },
    ],
    strongExample: {
      text: "Great question — are you thinking more casual or do you have something specific coming up? [Customer: mostly casual, weekends.] Perfect. This works really well with slim or straight jeans and a clean sneaker. If you want a slightly more put-together weekend look, you could swap the trainers for loafers. We have some nice slim chinos right over here that go brilliantly with it if you want to see the full picture.",
      annotation:
        'Discovers context first, gives specific grounded suggestions, helps visualise, and offers a next step.',
    },
    weakExample: {
      text: "You could wear it with jeans.",
      annotation:
        'Too generic — no discovery question, no visualisation, no specific guidance based on their context.',
    },
    commonMistakes: [
      'Giving generic suggestions without asking about the occasion or their existing wardrobe',
      'Listing options without helping the customer visualise the outfit',
      'Missing the opportunity to show a complementary in-store piece',
      'Giving styling advice based on the associate\'s taste rather than the customer\'s stated needs',
    ],
    coachingGuidance:
      'Check whether the associate asked a discovery question before styling, gave at least one specific and concrete suggestion, and helped the customer picture themselves in the outfit.',
  },

  product_comparison: {
    momentType: 'product_comparison',
    label: 'Product Comparison',
    customerSignals: [
      "what's the difference between these two",
      "which one is better",
      "I can't decide between",
      "I'm torn between",
      "how do these compare",
      "which would you choose",
      "is this one worth the extra",
    ],
    skillMappings: ['product_knowledge', 'closing'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Acknowledge the comparison and frame it positively — both options being considered is a sign of good taste',
        examplePhrase: "Both are great choices — let me break down the differences so you can decide.",
      },
      {
        stepNumber: 2,
        description:
          'Ask what matters most to the customer (e.g. fit, durability, versatility, occasion) to guide the comparison',
        examplePhrase: "Is versatility more important to you, or are you after something specific for a particular look?",
      },
      {
        stepNumber: 3,
        description: 'Give a clear, honest comparison based on meaningful differences — not just specs',
        examplePhrase:
          "The first one is more tailored and works better dressed up; the second is slightly more relaxed and easier to throw on casually. They're different rather than one being better.",
      },
      {
        stepNumber: 4,
        description:
          'Make a recommendation based on what they said, or suggest trying both on to decide',
        examplePhrase:
          "Based on what you said about wearing it mostly for work, I'd lean toward the first one. But honestly, trying them both on for two minutes will tell you more than I can.",
      },
    ],
    strongExample: {
      text: "Both are solid — what's most important to you, fit or versatility? [Customer: versatility.] Then I'd lean toward this one — the fabric is a bit more forgiving and works for casual and smart-casual. The other one is more tailored and sharper but less flexible day to day. Want to try this one first?",
      annotation:
        'Asks about priority, gives a meaningful comparison, makes a clear recommendation, and moves to action.',
    },
    weakExample: {
      text: "They're both really popular.",
      annotation:
        'Unhelpful — tells the customer nothing that helps them decide, and misses a closing opportunity.',
    },
    commonMistakes: [
      'Listing features without explaining what they mean for the customer\'s use case',
      'Refusing to make a recommendation when directly asked',
      'Framing one product as "better" without understanding what the customer needs',
      'Not moving toward a decision or try-on after the comparison',
    ],
    coachingGuidance:
      'Check whether the associate discovered what mattered to the customer before comparing, gave a meaningful (not just spec-based) comparison, and made a recommendation or moved toward a decision.',
  },

  quality_material_concern: {
    momentType: 'quality_material_concern',
    label: 'Quality & Material Concern',
    customerSignals: [
      "what's this made of",
      "will this last",
      "does it pill",
      "how do I wash this",
      "is this good quality",
      "it feels a bit thin",
      "is it durable",
      "what fabric is this",
      "does it shrink",
    ],
    skillMappings: ['product_knowledge', 'objection_handling'],
    steps: [
      {
        stepNumber: 1,
        description: 'Take the question seriously and answer it with specific, accurate product knowledge',
        examplePhrase: "Good question — this is 100% Merino wool, so it's naturally temperature-regulating and resistant to odour.",
      },
      {
        stepNumber: 2,
        description:
          'Connect the material properties to what the customer said they care about (durability, comfort, care ease)',
        examplePhrase:
          "If longevity is what you're after, Merino is actually one of the best — it holds its shape much better than cheaper wools and doesn't pill the way acrylics do.",
      },
      {
        stepNumber: 3,
        description:
          'Address any care concern proactively (washing, storage, wear life) if relevant',
        examplePhrase:
          "Machine-wash on a wool cycle or a quick hand-wash and it'll last for years. It's very low maintenance for the quality.",
      },
      {
        stepNumber: 4,
        description:
          'If the concern reveals genuine hesitation, offer an alternative or acknowledge the trade-off honestly',
        examplePhrase:
          "If you prefer something that goes straight in a hot wash, this cotton blend over here might be a better fit for your lifestyle.",
      },
    ],
    strongExample: {
      text: "Great question. This is a 100% Merino wool — it's naturally breathable, doesn't pill the way cheaper wool does, and holds its shape really well over time. Just a cool machine wash or hand-wash and it'll last you years. What specifically were you wondering about — durability, care, or something else?",
      annotation:
        'Specific product knowledge, connected to durability and care, and opens the door for further concern.',
    },
    weakExample: {
      text: "It's really good quality.",
      annotation:
        'Asserts quality without backing it up with any specifics — fails to address the actual concern.',
    },
    commonMistakes: [
      'Making vague quality claims without citing specific material or construction details',
      'Not connecting material properties to what the customer said they care about',
      'Ignoring a care question or giving incomplete washing instructions',
      'Being defensive about the product rather than honestly addressing a valid concern',
    ],
    coachingGuidance:
      'Check whether the associate gave specific material facts (not just "it\'s good quality"), connected those facts to the customer\'s concern, and addressed care or longevity if relevant.',
  },

  occasion_recommendation: {
    momentType: 'occasion_recommendation',
    label: 'Occasion-Based Recommendation',
    customerSignals: [
      "I have a wedding",
      "I need something for a job interview",
      "I'm going to a dinner",
      "I need something for a special occasion",
      "I have a work event",
      "I'm going on a date",
      "I need something smart",
      "I have a party",
      "I'm travelling",
    ],
    skillMappings: ['discovery_questions', 'product_knowledge', 'storytelling'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Ask a follow-up question to understand the occasion in more detail (formality, setting, weather, duration)',
        examplePhrase: "Exciting — what kind of vibe are you going for? Is it a formal ceremony or more of a relaxed celebration?",
      },
      {
        stepNumber: 2,
        description:
          'Make a targeted recommendation that is specific to the occasion they described',
        examplePhrase:
          "For a summer wedding where you want to look sharp but stay comfortable, this linen suit would be perfect — it breathes really well and photographs beautifully.",
      },
      {
        stepNumber: 3,
        description:
          'Help them visualise wearing it at the event — paint a picture of the context',
        examplePhrase:
          "Picture yourself in this at the reception — the colour is versatile enough to wear to the ceremony and dancing without looking overdressed.",
      },
      {
        stepNumber: 4,
        description:
          'Address any practical concerns for the occasion (comfort for long wear, formality level, dress code)',
        examplePhrase:
          "If you're going to be on your feet all day, the stretch in this fabric makes a real difference — you'll still look put-together at 10pm.",
      },
    ],
    strongExample: {
      text: "A summer wedding — great! Is it more of a garden party vibe or a formal church ceremony? [Customer: garden party, smart-casual.] Perfect. This linen-cotton blend is ideal — it's lightweight, looks sharp, and won't crease horribly if you're dancing. The colour is also versatile enough to wear again. Want to try it on?",
      annotation:
        'Discovers context, makes a targeted recommendation with specific fabric reasoning, connects to the occasion, and drives to try-on.',
    },
    weakExample: {
      text: "We have lots of things that would work for a wedding.",
      annotation:
        'Generic and unhelpful — no discovery, no specific recommendation, no assistance navigating the occasion.',
    },
    commonMistakes: [
      'Recommending something generic without asking about formality, setting, or dress code',
      'Failing to help the customer visualise wearing the item at the specific event',
      'Not addressing practical concerns like comfort for long wear or weather',
      'Overwhelm — showing too many options without narrowing based on occasion details',
    ],
    coachingGuidance:
      'Check whether the associate asked a follow-up question to understand the occasion before recommending, then made a specific suggestion tied to the event context.',
  },

  closing_opportunity: {
    momentType: 'closing_opportunity',
    label: 'Closing Opportunity',
    customerSignals: [
      "I really like this",
      "this is nice",
      "I might get this",
      "I think this could work",
      "this is exactly what I was looking for",
      "I love this",
      "this fits really well",
      "I'm going to think about it",
      "I'll come back for it",
    ],
    skillMappings: ['closing'],
    steps: [
      {
        stepNumber: 1,
        description: 'Affirm their positive signal without over-selling — mirror their energy',
        examplePhrase: "It suits you really well — the colour works great with your complexion.",
      },
      {
        stepNumber: 2,
        description:
          'Ask a forward-leaning question that moves them toward a decision without pressure',
        examplePhrase: "Were you thinking of grabbing it today, or still deciding?",
      },
      {
        stepNumber: 3,
        description:
          'If they hesitate (e.g. "I\'ll think about it"), acknowledge and gently uncover the remaining concern',
        examplePhrase: "Totally fine — is there anything holding you back, or is it more just wanting time to think it over?",
      },
      {
        stepNumber: 4,
        description:
          'If appropriate, offer a low-pressure reason to act (limited stock, completes an outfit, etc.) without false urgency',
        examplePhrase:
          "This colour sells out fast in this size — if you're already loving it, it might be worth grabbing now rather than risking it being gone.",
      },
    ],
    strongExample: {
      text: "That looks really good on you — the fit is exactly right. Are you thinking of taking it today? [Customer: I'll probably come back.] Of course — no pressure at all. Is there anything you're still unsure about, or just want to sit on it? [Customer: just need to check my budget.] Makes sense. Just so you know, this size and colour does move quickly — but if you're on the fence it's totally fine to think about it.",
      annotation:
        'Affirms the positive signal, gently asks a closing question, uncovers the real hesitation, and offers honest context without fake pressure.',
    },
    weakExample: {
      text: "Great! Do you want to come to the till?",
      annotation:
        'Skips affirming the moment, jumps straight to transaction, and misses the chance to surface any remaining objection.',
    },
    commonMistakes: [
      'Ignoring a buying signal and not advancing toward a decision',
      'Jumping to the transaction before building on the positive moment',
      'Creating fake urgency that feels manipulative ("last one in stock" when it isn\'t)',
      'Letting "I\'ll think about it" end the conversation without gently uncovering the real concern',
    ],
    coachingGuidance:
      'Check whether the associate recognised and affirmed the positive signal, asked a forward-leaning question, and — if the customer hesitated — gently surfaced the remaining concern rather than letting them walk away.',
  },

  reassurance_empathy_moment: {
    momentType: 'reassurance_empathy_moment',
    label: 'Reassurance & Empathy Moment',
    customerSignals: [
      "I'm not sure this is for me",
      "I don't usually dress like this",
      "I don't know if I can pull this off",
      "it's a bit outside my comfort zone",
      "I'm not very fashionable",
      "I never know what suits me",
      "shopping is stressful",
      "I'm not confident about this",
    ],
    skillMappings: ['empathy', 'storytelling'],
    steps: [
      {
        stepNumber: 1,
        description:
          'Lead with genuine empathy — acknowledge the feeling without dismissing it or rushing past it',
        examplePhrase: "That's such a common feeling — a lot of people find it hard to know what works for them.",
      },
      {
        stepNumber: 2,
        description:
          'Offer a grounding observation based on what you can see (the fit, the colour, what\'s working) to build confidence',
        examplePhrase:
          "From where I'm standing, the colour actually works really well with your skin tone — that part I can tell you for certain.",
      },
      {
        stepNumber: 3,
        description:
          'Reframe the risk — trying it is low stakes; they can always take it off',
        examplePhrase:
          "The worst case is you try it on and it doesn't feel right — that's totally fine, there's no pressure.",
      },
      {
        stepNumber: 4,
        description:
          'Invite them to trust a small step (try it on, look in the mirror) rather than asking for a big commitment',
        examplePhrase:
          "Let's just see what it looks like on — sometimes you just need to see yourself in it before it clicks.",
      },
    ],
    strongExample: {
      text: "I totally get that feeling — it's a different look than what you might usually go for. But for what it's worth, just looking at it now, the colour genuinely works with your complexion. That's the hardest part to judge without trying. Why don't you just pop it on? If it doesn't feel like you when you look in the mirror, we can try something else — no pressure at all.",
      annotation:
        'Validates the feeling, gives a specific grounded observation, removes the risk, and invites a small low-stakes step.',
    },
    weakExample: {
      text: "Oh you'd totally pull it off, it's great on everyone!",
      annotation:
        'Dismisses the feeling with empty reassurance and a generic claim that lacks credibility.',
    },
    commonMistakes: [
      'Rushing past the emotional moment to promote the product',
      'Offering empty reassurance ("you\'d totally pull it off") without specific grounding',
      'Making the decision feel bigger than it needs to be',
      'Not inviting a low-stakes next step like a try-on',
    ],
    coachingGuidance:
      'Check whether the associate led with genuine empathy before the product pitch, gave at least one specific grounded observation, and made trying it on feel low-stakes rather than a big commitment.',
  },
};

export function getPlaybook(momentType: MomentType): MomentPlaybook {
  const pb = MOMENT_PLAYBOOK_CATALOG[momentType];
  if (!pb) throw new Error(`No playbook found for moment type: ${momentType}`);
  return pb;
}

export function getPlaybookDescriptionsForClassification(): Array<{
  id: string;
  label: string;
  customerSignals: string[];
}> {
  return MOMENT_TYPES.map((id) => ({
    id,
    label: MOMENT_PLAYBOOK_CATALOG[id].label,
    customerSignals: MOMENT_PLAYBOOK_CATALOG[id].customerSignals,
  }));
}
