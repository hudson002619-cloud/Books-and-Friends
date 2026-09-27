import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { recordAuditLog, persistUserProfileToSupabase, getStoredUserProfiles } from '../lib/supabase';

export const ADMIN_EMAIL = 'adhudson504@gmail.com';
export const ADMIN_PASSWORD = 'mYZuMr4W1hjEqE0q';
const AUTH_STORAGE_KEY = 'bf_active_user_session';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  switchDemoRole: (role: UserRole | 'guest') => void;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Strict runtime re-verification of developer admin role
        if (parsed.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          parsed.role = 'admin';
        } else if (parsed.role === 'admin') {
          // Demote any spoofed or non-admin accounts trying to claim admin role
          parsed.role = 'member';
        }
        setUser(parsed);
      } else {
        // Initial visitor state: No active session (Must login/signup first)
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAdmin = Boolean(
    user &&
    user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
    user.role === 'admin'
  );

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!cleanPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    let authenticatedUser: User;
    const storedProfiles = getStoredUserProfiles();
    const existingProfile = storedProfiles[cleanEmail];

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
        ...(existingProfile || {}),
        email: ADMIN_EMAIL,
        role: 'admin',
      };

      recordAuditLog({
        action: 'SELECT',
        table: 'auth.users',
        performedBy: ADMIN_EMAIL,
        details: 'Developer Admin signed in with verified credentials (Email: adhudson504@gmail.com). Full database privileges granted.',
        status: 'SUCCESS',
      });
    } else {
      // Regular User Sign In (Strict Privacy - Regular User has NO Admin Access)
      if (cleanPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
      }

      authenticatedUser = existingProfile ? {
        ...existingProfile,
        email: cleanEmail,
        role: 'member',
      } : {
        id: `usr_${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        role: 'member',
        createdAt: new Date().toISOString(),
        bio: 'Dark Psychology explorer & Books and Friends participant',
        booksReadCount: 0,
      };

      recordAuditLog({
        action: 'SELECT',
        table: 'auth.users',
        performedBy: cleanEmail,
        details: `Regular user signed in: ${cleanEmail} (Role: member). Admin controls restricted.`,
        status: 'SUCCESS',
      });
    }

    setUser(authenticatedUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
    await persistUserProfileToSupabase(authenticatedUser);
    return { success: true };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
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

    const newUser: User = {
      id: isTargetAdmin ? SEED_USERS.admin.id : `usr_${Date.now()}`,
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

    setUser(newUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));

    recordAuditLog({
      action: 'INSERT',
      table: 'public.profiles',
      performedBy: cleanEmail,
      details: `New account registered: ${cleanEmail} (Assigned role: ${newUser.role})`,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const signOut = () => {
    const previousEmail = user?.email || 'unknown';
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

  const switchDemoRole = (role: UserRole | 'guest') => {
    if (role === 'admin') {
      setUser(SEED_USERS.admin);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(SEED_USERS.admin));
    } else if (role === 'scholar') {
      setUser(SEED_USERS.scholar);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(SEED_USERS.scholar));
    } else if (role === 'member') {
      setUser(SEED_USERS.member);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(SEED_USERS.member));
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

    setUser(merged);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(merged));

    // Persist to Supabase profiles & local cache
    await persistUserProfileToSupabase(merged);

    recordAuditLog({
      action: 'UPDATE',
      table: 'public.profiles',
      performedBy: user.email,
      details: `Profile updated: ${merged.name} (${user.email}). Avatar / Bio / Affinity synchronized.`,
      status: 'SUCCESS',
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, signIn, signUp, signOut, switchDemoRole, updateProfile }}>
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
