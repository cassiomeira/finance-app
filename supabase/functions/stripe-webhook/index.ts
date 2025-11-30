import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    let event: Stripe.Event;
    
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Webhook signature verification failed:", message);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      event = JSON.parse(body);
      console.log("Warning: Webhook signature not verified");
    }

    console.log("Processing webhook event:", event.type);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout completed for customer:", session.customer);
        
        if (session.subscription && session.customer) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "premium",
              stripe_subscription_id: session.subscription as string,
            })
            .eq("stripe_customer_id", session.customer as string);
          
          if (error) {
            console.error("Error updating profile:", error);
          } else {
            console.log("Profile updated to premium");
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription updated:", subscription.id, subscription.status);
        
        const status = subscription.status === "active" ? "premium" : "free";
        
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: status })
          .eq("stripe_subscription_id", subscription.id);
        
        if (error) {
          console.error("Error updating subscription status:", error);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("Subscription deleted:", subscription.id);
        
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ 
            subscription_status: "cancelled",
            stripe_subscription_id: null 
          })
          .eq("stripe_subscription_id", subscription.id);
        
        if (error) {
          console.error("Error updating cancelled subscription:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("Payment failed for customer:", invoice.customer);
        
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "free" })
          .eq("stripe_customer_id", invoice.customer as string);
        
        if (error) {
          console.error("Error updating failed payment status:", error);
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
