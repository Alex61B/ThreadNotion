import { prisma } from '../db';
import { mapStripeSubscriptionStatus, planTypeFromStripePriceId, seatBundleFromStripePriceId } from './subscriptionState';
import { upsertUserEntitlement } from './entitlements';
import { upsertTeamEntitlement } from './teamEntitlements';

const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

function getSubscriptionPriceId(sub: any): string | null {
  const item = sub.items.data[0];
  const price = item?.price?.id;
  return price ?? null;
}

async function findBillingAccountIdByStripeCustomer(customerId: string): Promise<string | null> {
  const acct = await prisma.billingAccount.findUnique({ where: { stripeCustomerId: customerId } });
  return acct?.id ?? null;
}

async function upsertInvoiceRecord(args: {
  billingAccountId: string;
  invoice: any;
}): Promise<void> {
  const inv = args.invoice;
  const issuedAtSeconds = typeof inv.created === 'number' ? inv.created : Math.floor(Date.now() / 1000);
  await prisma.invoiceRecord.upsert({
    where: { stripeInvoiceId: inv.id },
    create: {
      billingAccountId: args.billingAccountId,
      stripeInvoiceId: inv.id,
      amountDue: inv.amount_due ?? 0,
      amountPaid: inv.amount_paid ?? 0,
      currency: inv.currency ?? 'usd',
      status: inv.status ?? 'unknown',
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdfUrl: inv.invoice_pdf ?? null,
      issuedAt: new Date(issuedAtSeconds * 1000),
    },
    update: {
      amountDue: inv.amount_due ?? 0,
      amountPaid: inv.amount_paid ?? 0,
      currency: inv.currency ?? 'usd',
      status: inv.status ?? 'unknown',
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      invoicePdfUrl: inv.invoice_pdf ?? null,
      issuedAt: new Date(issuedAtSeconds * 1000),
    },
  });
}

async function ensureUserBillingAccount(params: {
  userId: string;
  stripeCustomerId: string;
}): Promise<{ billingAccountId: string }> {
  const existing = await prisma.billingAccount.findUnique({ where: { userId: params.userId } });
  if (existing) {
    if (existing.stripeCustomerId !== params.stripeCustomerId) {
      await prisma.billingAccount.update({
        where: { id: existing.id },
        data: { stripeCustomerId: params.stripeCustomerId },
      });
    }
    return { billingAccountId: existing.id };
  }

  const created = await prisma.billingAccount.create({
    data: {
      type: 'USER',
      userId: params.userId,
      stripeCustomerId: params.stripeCustomerId,
    },
  });
  return { billingAccountId: created.id };
}

async function ensureTeamBillingAccount(params: {
  teamId: string;
  stripeCustomerId: string;
}): Promise<{ billingAccountId: string }> {
  const existing = await prisma.billingAccount.findUnique({ where: { teamId: params.teamId } });
  if (existing) {
    if (existing.stripeCustomerId !== params.stripeCustomerId) {
      await prisma.billingAccount.update({
        where: { id: existing.id },
        data: { stripeCustomerId: params.stripeCustomerId },
      });
    }
    return { billingAccountId: existing.id };
  }

  const created = await prisma.billingAccount.create({
    data: {
      type: 'TEAM',
      teamId: params.teamId,
      stripeCustomerId: params.stripeCustomerId,
    },
  });
  return { billingAccountId: created.id };
}

export async function handleStripeEvent(event: any): Promise<void> {
  // Idempotency (log table is the idempotency store)
  const seen = await prisma.billingEventLog.findFirst({ where: { stripeEventId: event.id } });
  if (seen) return;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const stripeCustomerId = session.customer;
      if (typeof stripeCustomerId !== 'string') return;
      const userId = session.metadata?.userId;
      if (!userId) return;
      const teamId = session.metadata?.teamId;
      const planTypeMeta = session.metadata?.planType;
      const isTeamCheckout = planTypeMeta === 'TEAM' && typeof teamId === 'string' && teamId.length > 0;

      const { billingAccountId } = isTeamCheckout
        ? await ensureTeamBillingAccount({ teamId: teamId!, stripeCustomerId })
        : await ensureUserBillingAccount({ userId, stripeCustomerId });
      await prisma.billingEventLog.create({
        data: {
          billingAccountId,
          type: event.type,
          stripeEventId: event.id,
          payload: { type: event.type, customerId: stripeCustomerId, subscriptionId: session.subscription } as any,
        },
      });

      // Create placeholder subscription row; real state comes from subscription.* webhooks
      await prisma.subscription.upsert({
        where: { billingAccountId },
        create: {
          billingAccountId,
          planType: isTeamCheckout ? 'TEAM' : 'INDIVIDUAL',
          seatBundle: isTeamCheckout
            ? session.metadata?.seatBundle === '25'
              ? 'SEATS_25'
              : session.metadata?.seatBundle === '50'
                ? 'SEATS_50'
                : 'SEATS_10'
            : 'NONE',
          status: 'INACTIVE',
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
        },
        update: {
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
        },
      });

      if (isTeamCheckout) {
        // Actual seat bundle will be set by subscription.updated once the subscription is visible via webhooks.
        const seatBundle =
          session.metadata?.seatBundle === '25'
            ? 'SEATS_25'
            : session.metadata?.seatBundle === '50'
              ? 'SEATS_50'
              : 'SEATS_10';
        await upsertTeamEntitlement({ teamId: teamId!, planType: 'TEAM', seatBundle });
      } else {
        await upsertUserEntitlement({ userId, planType: 'INDIVIDUAL' });
      }
      return;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const billingAccountId = await findBillingAccountIdByStripeCustomer(customerId);
      if (!billingAccountId) return;
      const priceId = getSubscriptionPriceId(sub);
      await prisma.billingEventLog.create({
        data: {
          billingAccountId,
          type: event.type,
          stripeEventId: event.id,
          payload: { type: event.type, subscriptionId: sub.id, status: sub.status, priceId: priceId } as any,
        },
      });
      const billingAccount = await prisma.billingAccount.findUnique({ where: { id: billingAccountId } });
      const userId = billingAccount?.userId ?? null;
      const teamId = billingAccount?.teamId ?? null;
      const status = mapStripeSubscriptionStatus(sub.status);

      const planType = planTypeFromStripePriceId(priceId);
      const seatBundle = seatBundleFromStripePriceId(priceId);

      await prisma.subscription.upsert({
        where: { billingAccountId },
        create: {
          billingAccountId,
          planType,
          seatBundle,
          status,
          currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
        },
        update: {
          planType,
          seatBundle,
          status,
          currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000) : null,
          currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
        },
      });

      // Entitlement follows subscription state: ACTIVE or PAST_DUE => paid, else free
      if (teamId) {
        if (status === 'ACTIVE' || status === 'PAST_DUE') {
          await upsertTeamEntitlement({ teamId, planType: 'TEAM', seatBundle });
        } else {
          await upsertTeamEntitlement({ teamId, planType: 'FREE', seatBundle: 'NONE' });
        }
      } else if (userId) {
        if (status === 'ACTIVE' || status === 'PAST_DUE') {
          await upsertUserEntitlement({ userId, planType: 'INDIVIDUAL' });
        } else {
          await upsertUserEntitlement({ userId, planType: 'FREE' });
        }
      }
      return;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as any;
      const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
      const billingAccountId = await findBillingAccountIdByStripeCustomer(customerId);
      if (!billingAccountId) return;
      await prisma.billingEventLog.create({
        data: {
          billingAccountId,
          type: event.type,
          stripeEventId: event.id,
          payload: { type: event.type, invoiceId: inv.id, customerId } as any,
        },
      });
      const acct = await prisma.billingAccount.findUnique({ where: { id: billingAccountId } });
      if (!acct) return;

      await prisma.subscription.updateMany({
        where: { billingAccountId },
        data: {
          status: 'PAST_DUE',
          gracePeriodEndsAt: new Date(Date.now() + GRACE_MS),
        },
      });
      await upsertInvoiceRecord({ billingAccountId, invoice: inv });
      if (acct.teamId) {
        // keep paid during grace
        const sub = await prisma.subscription.findUnique({ where: { billingAccountId } });
        await upsertTeamEntitlement({ teamId: acct.teamId, planType: 'TEAM', seatBundle: sub?.seatBundle ?? 'SEATS_10' });
      } else if (acct.userId) {
        await upsertUserEntitlement({ userId: acct.userId, planType: 'INDIVIDUAL' });
      }
      return;
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as any;
      const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
      const billingAccountId = await findBillingAccountIdByStripeCustomer(customerId);
      if (!billingAccountId) return;
      await prisma.billingEventLog.create({
        data: {
          billingAccountId,
          type: event.type,
          stripeEventId: event.id,
          payload: { type: event.type, invoiceId: inv.id, customerId } as any,
        },
      });
      const acct = await prisma.billingAccount.findUnique({ where: { id: billingAccountId } });
      if (!acct) return;

      await prisma.subscription.updateMany({
        where: { billingAccountId },
        data: {
          status: 'ACTIVE',
          gracePeriodEndsAt: null,
        },
      });
      await upsertInvoiceRecord({ billingAccountId, invoice: inv });
      if (acct.teamId) {
        const sub = await prisma.subscription.findUnique({ where: { billingAccountId } });
        await upsertTeamEntitlement({ teamId: acct.teamId, planType: 'TEAM', seatBundle: sub?.seatBundle ?? 'SEATS_10' });
      } else if (acct.userId) {
        await upsertUserEntitlement({ userId: acct.userId, planType: 'INDIVIDUAL' });
      }
      return;
    }

    case 'invoice.finalized': {
      const inv = event.data.object as any;
      const customerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
      const billingAccountId = await findBillingAccountIdByStripeCustomer(customerId);
      if (!billingAccountId) return;
      await prisma.billingEventLog.create({
        data: {
          billingAccountId,
          type: event.type,
          stripeEventId: event.id,
          payload: { type: event.type, invoiceId: inv.id, customerId } as any,
        },
      });
      await upsertInvoiceRecord({ billingAccountId, invoice: inv });
      return;
    }
  }
}

