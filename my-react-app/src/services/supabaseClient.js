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

function createMissingQueryResult(data = null) {
  return { data, error: missingConfigError() }
}

function createMissingQueryBuilder(defaultData = []) {
  const builder = {
    select() {
      return builder
    },
    insert() {
      return builder
    },
    update() {
      return builder
    },
    delete() {
      return builder
    },
    eq() {
      return builder
    },
    in() {
      return builder
    },
    gt() {
      return builder
    },
    gte() {
      return builder
    },
    lt() {
      return builder
    },
    lte() {
      return builder
    },
    order() {
      return builder
    },
    limit() {
      return builder
    },
    maybeSingle: async () => createMissingQueryResult(null),
    single: async () => createMissingQueryResult(null),
    then(resolve) {
      return Promise.resolve(createMissingQueryResult(defaultData)).then(resolve)
    },
    catch(reject) {
      return Promise.resolve(createMissingQueryResult(defaultData)).catch(reject)
    },
  }

  return builder
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(missingConfigMessage)
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
      from: () => createMissingQueryBuilder([]),
      storage: {
        from: () => ({
          getPublicUrl: (path) => ({ data: { publicUrl: '' } }),
          upload: async () => ({ data: null, error: missingConfigError() }),
          remove: async () => ({ error: missingConfigError() }),
        }),
      },
      functions: {
        invoke: async () => ({ data: null, error: missingConfigError() }),
      },
      rpc: async () => createMissingQueryResult(null),
    }
  : createClient(supabaseUrl, supabaseAnonKey)
