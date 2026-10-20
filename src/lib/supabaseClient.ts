import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const validUrl = (() => {
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
})();

export const supabaseConfigurationError =
  !supabaseUrl || !supabasePublishableKey
    ? "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the root .env.local file, then restart the development server."
    : !validUrl
      ? "VITE_SUPABASE_URL must be a valid http or https URL. Check the root .env.local file."
      : !supabasePublishableKey.startsWith("sb_publishable_")
        ? "Use the Supabase publishable key (starts with sb_publishable_), not a secret or service-role key."
        : "";

export const supabase: SupabaseClient | undefined =
  !supabaseConfigurationError && supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : undefined;
