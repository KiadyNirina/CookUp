import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

// Store pour l'utilisateur actuel
export const user = writable(null);

// Store pour la session actuelle
export const session = writable(null);

// Fonction pour initialiser l'authentification
export async function initAuth() {
  try {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    console.log('Initial session:', currentSession);
    console.log('Initial user:', currentUser);
    
    session.set(currentSession);
    user.set(currentUser);
    
    return { user: currentUser, session: currentSession };
  } catch (error) {
    console.error('Error initializing auth:', error);
    session.set(null);
    user.set(null);
    return { user: null, session: null };
  }
}

// Écouter les changements d'authentification
supabase.auth.onAuthStateChange((event, currentSession) => {
  console.log('Auth state changed:', event, currentSession?.user?.email);
  
  session.set(currentSession);
  user.set(currentSession?.user ?? null);
});

// Fonction pour se déconnecter
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      return { success: false, error };
    }
    
    user.set(null);
    session.set(null);
    
    return { success: true };
  } catch (error) {
    console.error('Sign out exception:', error);
    return { success: false, error };
  }
}

// Fonction pour vérifier si l'utilisateur est connecté
export function isAuthenticated() {
  let userValue;
  user.subscribe(value => userValue = value)();
  return !!userValue;
}

// Fonction pour créer ou mettre à jour un profil utilisateur
export async function upsertUserProfile(userData) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userData.id,
        email: userData.email,
        username: userData.email?.split('@')[0] || 'user',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting profile:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception upserting profile:', error);
    return { success: false, error };
  }
}

// Fonction pour récupérer le profil utilisateur
export async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception fetching profile:', error);
    return { success: false, error };
  }
}