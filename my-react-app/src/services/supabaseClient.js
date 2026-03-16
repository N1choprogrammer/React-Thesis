// src/services/supabaseClient.js (or .jsx / .ts depending on your file)

import { createClient } from "@supabase/supabase-js"

// Make sure these env variables exist in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (!supabaseUrl || !supabaseAnonKey)
  ? {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ data: null, error: null }),
        signUp: async () => ({ data: null, error: null }),
        signInWithOAuth: async () => ({ data: null, error: null }),
        resetPasswordForEmail: async () => ({ error: null }),
      },
      from: (table) => ({
        select: async () => ({ data: [], error: null }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
        eq: function() { return this; },
        single: function() { return this; },
      }),
      storage: {
        from: (bucket) => ({
          getPublicUrl: (path) => ({ data: { publicUrl: '' } }),
          upload: async () => ({ data: null, error: null }),
          remove: async () => ({ error: null }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: null }),
      },
      rpc: async () => ({ data: null, error: null }),
    }
  : createClient(supabaseUrl, supabaseAnonKey)
