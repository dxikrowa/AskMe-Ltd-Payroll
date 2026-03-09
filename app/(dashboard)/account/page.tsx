import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Stripe from "stripe";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user) {
    redirect("/login");
  }

  let subscriptionStatus: string | null = null;
  let subscriptionEndsAt: Date | null = null;

  if (user.stripeSubscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(
        user.stripeSubscriptionId
      );

      subscriptionStatus = sub.status;

      // Fix for Stripe typing mismatch
      let periodEnd: number | null = null;

      if ("current_period_end" in sub && typeof sub.current_period_end === "number") {
        periodEnd = sub.current_period_end;
      } else if (sub.items?.data?.length) {
        const item = sub.items.data[0] as any;
        if (typeof item.current_period_end === "number") {
          periodEnd = item.current_period_end;
        }
      }

      subscriptionEndsAt = periodEnd ? new Date(periodEnd * 1000) : null;
    } catch (error) {
      subscriptionStatus = null;
      subscriptionEndsAt = null;
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-semibold mb-6">My Account</h1>

      <div className="space-y-4 border rounded-lg p-6 bg-white shadow-sm">
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Subscription Status</p>
          <p className="font-medium">
            {subscriptionStatus ? subscriptionStatus : "No active subscription"}
          </p>
        </div>

        {subscriptionEndsAt && (
          <div>
            <p className="text-sm text-gray-500">Current Period Ends</p>
            <p className="font-medium">
              {subscriptionEndsAt.toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}