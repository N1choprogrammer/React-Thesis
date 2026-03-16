// src/services/supabaseClient.js (or .jsx / .ts depending on your file)

import { createClient } from "@supabase/supabase-js"

// Make sure these env variables exist in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (!supabaseUrl || !supabaseAnonKey)
  ? {
      from: (table) => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
    }
  : createClient(supabaseUrl, supabaseAnonKey)
