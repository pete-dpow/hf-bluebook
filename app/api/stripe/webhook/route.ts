import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "build-placeholder"
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// Map Stripe price IDs to subscription tiers
// Update these with your actual Stripe price IDs
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_STANDARD_MONTHLY || "price_standard_monthly"]: "standard",
  [process.env.STRIPE_PRICE_STANDARD_YEARLY || "price_standard_yearly"]: "standard",
  [process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "price_professional_monthly"]: "professional",
  [process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || "price_professional_yearly"]: "professional",
};

// Token limits per tier
const TOKEN_LIMITS: Record<string, number> = {
  free: 50000,
  standard: 500000,
  professional: 2000000,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`🔔 Stripe webhook received: ${event.type}`);

    switch (event.type) {
      // ✅ Checkout completed - New subscription
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === "subscription" && session.subscription) {
          const userId = session.metadata?.supabase_user_id;
          const tier = session.metadata?.tier;

          if (userId && tier) {
            console.log(`✅ Checkout completed for user ${userId}, tier: ${tier}`);
            
            await supabaseAdmin
              .from("users")
              .update({
                subscription_tier: tier,
                subscription_status: "active",
                stripe_subscription_id: session.subscription as string,
                tokens_used: 0, // Reset tokens on new subscription
              })
              .eq("id", userId);
          }
        }
        break;
      }

      // ✅ Subscription updated (upgrade/downgrade)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user by Stripe customer ID
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userData) {
          // Get the price ID from the subscription
          const priceId = subscription.items.data[0]?.price?.id;
          const tier = priceId ? PRICE_TO_TIER[priceId] : null;

          const status = subscription.status === "active" || subscription.status === "trialing"
            ? "active"
            : subscription.status;

          console.log(`🔄 Subscription updated for user ${userData.id}, status: ${status}, tier: ${tier}`);

          await supabaseAdmin
            .from("users")
            .update({
              subscription_status: status,
              ...(tier && { subscription_tier: tier }),
            })
            .eq("id", userData.id);
        }
        break;
      }

      // ❌ Subscription deleted/cancelled
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user by Stripe customer ID
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userData) {
          console.log(`❌ Subscription cancelled for user ${userData.id}`);

          await supabaseAdmin
            .from("users")
            .update({
              subscription_tier: "free",
              subscription_status: "cancelled",
              stripe_subscription_id: null,
            })
            .eq("id", userData.id);
        }
        break;
      }

      // 💳 Payment succeeded
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get user by Stripe customer ID
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id, subscription_tier")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userData) {
          console.log(`💳 Payment succeeded for user ${userData.id}`);

          // Reset token usage on successful payment (new billing period)
          if (invoice.billing_reason === "subscription_cycle") {
            await supabaseAdmin
              .from("users")
              .update({
                tokens_used: 0,
                subscription_status: "active",
              })
              .eq("id", userData.id);
            
            console.log(`🔄 Token usage reset for user ${userData.id}`);
          }
        }
        break;
      }

      // ⚠️ Payment failed
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Get user by Stripe customer ID
        const { data: userData } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (userData) {
          console.log(`⚠️ Payment failed for user ${userData.id}`);

          await supabaseAdmin
            .from("users")
            .update({
              subscription_status: "past_due",
            })
            .eq("id", userData.id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Next.js 13+ App Router config
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
