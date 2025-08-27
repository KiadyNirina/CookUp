import { writable } from 'svelte/store'
import { supabase } from '$lib/supabase'

export const user = writable(null)
export const session = writable(null)

// Écouter les changements d'authentification
supabase.auth.onAuthStateChange((event, currentSession) => {
  session.set(currentSession)
  user.set(currentSession?.user ?? null)
})