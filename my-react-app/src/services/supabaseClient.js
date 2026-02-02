// src/services/supabaseClient.js (or .jsx / .ts depending on your file)

import { createClient } from "@supabase/supabase-js"

// Make sure these env variables exist in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase URL or anon key. Check your .env file.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
