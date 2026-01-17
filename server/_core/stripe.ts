import Stripe from "stripe";
import { ENV } from "./env";

// Stripe is OPTIONAL - only initialize if configured
export const stripe = ENV.stripeSecretKey 
  ? new Stripe(ENV.stripeSecretKey)
  : null;
