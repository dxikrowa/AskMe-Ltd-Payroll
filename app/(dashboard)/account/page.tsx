import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  let subscriptionStatus: string | null = null;
  let subscriptionEndsAt: Date | null = null;

  if (user.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      subscriptionStatus = sub.status;
      let periodEnd: number | null = null;

      if ("current_period_end" in sub && typeof sub.current_period_end === "number") {
        periodEnd = sub.current_period_end;
      } else if (sub.items?.data?.length) {
        const item = sub.items.data[0] as any;
        if (typeof item.current_period_end === "number") periodEnd = item.current_period_end;
      }
      subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;
    } catch {
      subscriptionStatus = null;
      subscriptionEndsAt = null;
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 0" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>My Account</h1>

      <div style={{ borderRadius: 14, padding: 24, background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}>
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Email</p>
          <p style={{ fontWeight: 600, fontSize: 16 }}>{user.email}</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Subscription Status</p>
          <p style={{ fontWeight: 600, fontSize: 16, color: subscriptionStatus === 'active' ? '#10b981' : 'inherit' }}>
            {subscriptionStatus ? subscriptionStatus.toUpperCase() : "No active subscription"}
          </p>
        </div>

        {subscriptionEndsAt && (
          <div>
            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Current Period Ends</p>
            <p style={{ fontWeight: 600, fontSize: 16 }}>{subscriptionEndsAt.toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}