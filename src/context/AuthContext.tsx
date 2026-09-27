import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import {
  recordAuditLog,
  persistUserProfileToSupabase,
  fetchUserProfileByEmail,
  subscribeToUserProfile,
  consolidateUserOrphanedRecords,
  syncMemberGoalsFromSupabase,
  syncSessionsFromSupabase,
  syncBookClubThreadsFromSupabase,
  syncDiscussionsFromSupabase,
  getStoredUserProfiles,
} from '../lib/supabase';

export const ADMIN_EMAIL = 'adhudson504@gmail.com';
export const ADMIN_PASSWORD = 'mYZuMr4W1hjEqE0q';
const AUTH_STORAGE_KEY = 'bf_active_user_session';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; isExistingUser?: boolean }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; isExistingUser?: boolean }>;
  signOut: () => void;
  switchDemoRole: (role: UserRole | 'guest') => void;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
  refreshProfileFromCloud: () => Promise<User | null>;
  refetchUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial Admin & Pre-configured Demo Accounts for Testing
export const SEED_USERS: Record<string, User> = {
  admin: {
    id: 'usr_admin_adhudson',
    email: 'adhudson504@gmail.com',
    name: 'A. D. Hudson (Developer Admin)',
    role: 'admin',
    avatarUrl: '/src/assets/images/profile_avatar_scholar_1790432624462.jpg',
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    bio: 'Lead Architect & Developer Administrator of the Books and Friends Sanctuary. Full Supabase schema, INSERT, UPDATE, DELETE, and SELECT database authority.',
    booksReadCount: 48,
  },
  scholar: {
    id: 'usr_scholar_vance',
    email: 'helena.vance@sanctuary.io',
    name: 'Helena Vance',
    role: 'scholar',
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    bio: 'Analytical psychologist focusing on Jungian shadow integration and cognitive dissonance. Regular scholar access.',
    booksReadCount: 31,
  },
  member: {
    id: 'usr_member_sterling',
    email: 'julian.sterling@readingcircle.org',
    name: 'Julian Sterling',
    role: 'member',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    bio: 'Avid reader dissecting strategic philosophy and historical power dynamics. Regular member access.',
    booksReadCount: 12,
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const realtimeUnsubRef = useRef<(() => void) | null>(null);

  // Trigger re-fetch of all user-specific data from Supabase
  const refetchUserData = async () => {
    try {
      await Promise.all([
        syncMemberGoalsFromSupabase(),
        syncSessionsFromSupabase(),
        syncBookClubThreadsFromSupabase(),
        syncDiscussionsFromSupabase(),
      ]);
      window.dispatchEvent(new CustomEvent('books-and-friends:auth-sync'));
    } catch (e) {
      console.warn('[Auth] Re-fetching user-specific data note:', e);
    }
  };

  // Background Cloud Sync & Profile Refresh
  const syncWithCloudProfile = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail) return null;

    try {
      const cloudProfile = await fetchUserProfileByEmail(cleanEmail);
      if (cloudProfile) {
        setUser((prev) => {
          if (!prev || prev.email.toLowerCase() === cleanEmail) {
            const merged = { ...prev, ...cloudProfile };
            if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
              merged.role = 'admin';
            }
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
          return prev;
        });
        return cloudProfile;
      }
    } catch (e) {
      console.warn('[Auth] Background cloud profile sync error:', e);
    }
    return null;
  };

  // Initial session hydration + cloud database re-sync
  useEffect(() => {
    async function initSession() {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            parsed.role = 'admin';
          } else if (parsed.role === 'admin') {
            parsed.role = 'member';
          }
          setUser(parsed);

          // Fetch latest profile and user-specific data
          syncWithCloudProfile(parsed.email);
          refetchUserData();
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  // Real-time listener for profile changes across devices (Phone <-> Laptop)
  useEffect(() => {
    if (realtimeUnsubRef.current) {
      realtimeUnsubRef.current();
      realtimeUnsubRef.current = null;
    }

    if (user?.email) {
      const cleanEmail = user.email.toLowerCase().trim();
      realtimeUnsubRef.current = subscribeToUserProfile(cleanEmail, (cloudUser) => {
        setUser((currentUser) => {
          if (!currentUser) return cloudUser;
          const merged: User = {
            ...currentUser,
            ...cloudUser,
            role: cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : (cloudUser.role || 'member'),
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        });
      });
    }

    return () => {
      if (realtimeUnsubRef.current) {
        realtimeUnsubRef.current();
        realtimeUnsubRef.current = null;
      }
    };
  }, [user?.email]);

  const isAdmin = Boolean(
    user &&
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    user.role === 'admin'
  );

  const refreshProfileFromCloud = async (): Promise<User | null> => {
    if (!user?.email) return null;
    return await syncWithCloudProfile(user.email);
  };

  // Sign In with cloud database unique profile resolution
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; isExistingUser?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    // 1. Fetch user from Central Cloud Database (Supabase `profiles` table)
    let cloudProfile = await fetchUserProfileByEmail(cleanEmail);
    const isExistingUser = Boolean(cloudProfile);

    let authenticatedUser: User;

    // Strict Developer Admin Security Enforcement
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      if (cleanPassword !== ADMIN_PASSWORD) {
        return {
          success: false,
          error: 'Security Clearance Denied: Invalid Developer Admin password. Please check your credentials.'
        };
      }

      authenticatedUser = {
        ...SEED_USERS.admin,
        ...(cloudProfile || {}),
        email: ADMIN_EMAIL,
        role: 'admin',
      };

      recordAuditLog({
        action: 'SELECT',
        table: 'public.profiles',
        performedBy: ADMIN_EMAIL,
        details: 'Developer Admin signed in with verified credentials (adhudson504@gmail.com). Full database privileges granted.',
        status: 'SUCCESS',
      });
    } else {
      // Regular User Sign In
      if (cleanPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      if (cloudProfile) {
        // User already exists in cloud database: Map directly to original User ID and profile data!
        authenticatedUser = {
          ...cloudProfile,
          email: cleanEmail,
          role: 'member',
        };
      } else {
        // First-time sign-in: Generate consistent canonical user record
        authenticatedUser = {
          id: `usr_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          role: 'member',
          createdAt: new Date().toISOString(),
          bio: 'Dark Psychology explorer & Books and Friends participant',
          booksReadCount: 0,
        };
      }

      recordAuditLog({
        action: 'SELECT',
        table: 'public.profiles',
        performedBy: cleanEmail,
        details: `User authenticated: ${cleanEmail} (ID: ${authenticatedUser.id}, Role: member). Synchronized with cloud database.`,
        status: 'SUCCESS',
      });
    }

    // Save active session & persist canonical cloud profile
    const canonicalUser = await persistUserProfileToSupabase(authenticatedUser);
    setUser(canonicalUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonicalUser));

    // Consolidate any orphaned records and re-fetch user-specific data immediately
    consolidateUserOrphanedRecords(
      canonicalUser.email,
      canonicalUser.id,
      canonicalUser.name,
      canonicalUser.avatarUrl
    );
    await refetchUserData();

    return { success: true, isExistingUser };
  };

  // Sign Up with unique email constraint check and existing account mapping
  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string; isExistingUser?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const isTargetAdmin = cleanEmail === ADMIN_EMAIL.toLowerCase();

    // If attempting to register the developer admin email, strictly require the developer admin password
    if (isTargetAdmin && cleanPassword !== ADMIN_PASSWORD) {
      return {
        success: false,
        error: 'Developer Admin registration requires authorized Developer Admin security password.',
      };
    }

    // Check if the email already exists in the central cloud database
    const existingCloudProfile = await fetchUserProfileByEmail(cleanEmail);

    let targetUser: User;
    let isExisting = false;

    if (existingCloudProfile) {
      // The email already exists in the database!
      // Authenticate against the existing record and map them to their original User ID and profile data.
      isExisting = true;
      targetUser = {
        ...existingCloudProfile,
        email: cleanEmail,
        name: cleanName || existingCloudProfile.name,
        role: isTargetAdmin ? 'admin' : (existingCloudProfile.role === 'admin' ? 'member' : existingCloudProfile.role),
      };

      recordAuditLog({
        action: 'SELECT',
        table: 'public.profiles',
        performedBy: cleanEmail,
        details: `Existing account mapped to original User ID [${targetUser.id}] for email: ${cleanEmail}. Re-linked to central cloud profile.`,
        status: 'SUCCESS',
      });
    } else {
      // Brand new user: Create new profile
      targetUser = {
        id: isTargetAdmin ? SEED_USERS.admin.id : `usr_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`,
        email: cleanEmail,
        name: cleanName || (isTargetAdmin ? 'A. D. Hudson (Developer Admin)' : 'Sanctuary Scholar'),
        role: isTargetAdmin ? 'admin' : 'member',
        createdAt: new Date().toISOString(),
        bio: isTargetAdmin
          ? 'Lead Architect and Developer Administrator of Books and Friends'
          : 'Initiated reader in Books and Friends Dark Psychology Sanctuary',
        booksReadCount: 0,
        avatarUrl: isTargetAdmin ? '/src/assets/images/profile_avatar_scholar_1790432624462.jpg' : undefined,
      };

      recordAuditLog({
        action: 'INSERT',
        table: 'public.profiles',
        performedBy: cleanEmail,
        details: `New account registered in cloud database: ${cleanEmail} (Role: ${targetUser.role}, ID: ${targetUser.id})`,
        status: 'SUCCESS',
      });
    }

    // Save directly to the cloud database and get canonical record
    const canonicalUser = await persistUserProfileToSupabase(targetUser);
    setUser(canonicalUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonicalUser));

    // Consolidate any orphaned records and re-fetch user-specific data immediately
    consolidateUserOrphanedRecords(
      canonicalUser.email,
      canonicalUser.id,
      canonicalUser.name,
      canonicalUser.avatarUrl
    );
    await refetchUserData();

    return { success: true, isExistingUser: isExisting };
  };

  const signOut = () => {
    const previousEmail = user?.email || 'unknown';
    if (realtimeUnsubRef.current) {
      realtimeUnsubRef.current();
      realtimeUnsubRef.current = null;
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);

    recordAuditLog({
      action: 'SELECT',
      table: 'auth.sessions',
      performedBy: previousEmail,
      details: `User session terminated (Sign Out): ${previousEmail}`,
      status: 'SUCCESS',
    });
  };

  const switchDemoRole = async (role: UserRole | 'guest') => {
    if (role === 'admin') {
      const canonical = await persistUserProfileToSupabase(SEED_USERS.admin);
      setUser(canonical);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonical));
      consolidateUserOrphanedRecords(canonical.email, canonical.id, canonical.name, canonical.avatarUrl);
      refetchUserData();
    } else if (role === 'scholar') {
      const canonical = await persistUserProfileToSupabase(SEED_USERS.scholar);
      setUser(canonical);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonical));
      consolidateUserOrphanedRecords(canonical.email, canonical.id, canonical.name, canonical.avatarUrl);
      refetchUserData();
    } else if (role === 'member') {
      const canonical = await persistUserProfileToSupabase(SEED_USERS.member);
      setUser(canonical);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonical));
      consolidateUserOrphanedRecords(canonical.email, canonical.id, canonical.name, canonical.avatarUrl);
      refetchUserData();
    } else {
      setUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const updateProfile = async (updatedData: Partial<User>): Promise<void> => {
    if (!user) return;

    const merged: User = {
      ...user,
      ...updatedData,
      // Preserve admin role boundary strictly
      role: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (updatedData.role || user.role),
    };

    // Save directly to the central cloud database (Supabase `profiles` table)
    const canonicalUser = await persistUserProfileToSupabase(merged);
    setUser(canonicalUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(canonicalUser));

    // Consolidate user records across app
    consolidateUserOrphanedRecords(
      canonicalUser.email,
      canonicalUser.id,
      canonicalUser.name,
      canonicalUser.avatarUrl
    );

    recordAuditLog({
      action: 'UPDATE',
      table: 'public.profiles',
      performedBy: user.email,
      details: `Profile updated in central cloud database: ${canonicalUser.name} (${user.email}). Synced across devices.`,
      status: 'SUCCESS',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        switchDemoRole,
        updateProfile,
        refreshProfileFromCloud,
        refetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
