// src/services/supabaseClient.js (or .jsx / .ts depending on your file)

import { createClient } from "@supabase/supabase-js"

// Make sure these env variables exist in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const missingConfigMessage =
  "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment."

function missingConfigError() {
  return { message: missingConfigMessage }
}

export const supabase = (!supabaseUrl || !supabaseAnonKey)
  ? {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: null, error: missingConfigError() }),
        signUp: async () => ({ data: null, error: missingConfigError() }),
        signInWithOAuth: async () => ({ data: null, error: missingConfigError() }),
        resetPasswordForEmail: async () => ({ error: missingConfigError() }),
      },
      from: (table) => ({
        select: async () => ({ data: [], error: missingConfigError() }),
        insert: async () => ({ data: null, error: missingConfigError() }),
        update: async () => ({ data: null, error: missingConfigError() }),
        delete: async () => ({ data: null, error: missingConfigError() }),
        eq: function() { return this; },
        single: function() { return this; },
      }),
      storage: {
        from: (bucket) => ({
          getPublicUrl: (path) => ({ data: { publicUrl: '' } }),
          upload: async () => ({ data: null, error: missingConfigError() }),
          remove: async () => ({ error: missingConfigError() }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: missingConfigError() }),
      },
      rpc: async () => ({ data: null, error: missingConfigError() }),
    }
  : createClient(supabaseUrl, supabaseAnonKey)
