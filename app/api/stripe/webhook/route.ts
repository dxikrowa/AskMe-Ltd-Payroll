
export const runtime = "nodejs";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

async function updateUserFromSubscription(subscription: Stripe.Subscription, fallbackCustomerId?: string | null, fallbackUserId?: string | null) {
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  const userId = subscription.metadata?.userId || fallbackUserId || undefined;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  
  const data = { 
    stripeSubscriptionId: subscription.id, 
    stripeStatus: subscription.status, 
    stripePriceId: priceId, 
    stripeCustomerId: customerId ?? fallbackCustomerId ?? undefined 
  } as any;

  try {
    if (userId) {
      await prisma.user.update({ where: { id: userId }, data });
      return;
    }
    const cId = customerId ?? fallbackCustomerId;
    if (cId) {
      const u = await prisma.user.findFirst({ where: { stripeCustomerId: cId } });
      if (u) {
        await prisma.user.update({ where: { id: u.id }, data });
        return;
      }
    }
    const uSub = await prisma.user.findFirst({ where: { stripeSubscriptionId: subscription.id } });
    if (uSub) {
      await prisma.user.update({ where: { id: uSub.id }, data });
    }
  } catch (err) {
    console.error("Failed to update user subscription status in DB", err);
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");
  if (!signature) return new NextResponse("Missing stripe signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subscription = await stripe.subscriptions.retrieve(String(session.subscription));
        await updateUserFromSubscription(subscription, session.customer ? String(session.customer) : null, session.metadata?.userId || session.client_reference_id || null);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateUserFromSubscription(subscription);
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler error:", err);
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
