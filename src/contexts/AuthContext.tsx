import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AppRole = "super_admin" | "agency_admin" | "sub_account_user";

interface UserRole {
  role: AppRole;
  context_id: string | null;
  context_type: "agency" | "subaccount" | "platform" | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  agency_id: string | null;
  sub_account_id: string | null;
  onboarding_completed?: boolean;
}

interface ImpersonationState {
  originalUserId: string;
  originalRole: AppRole;
  isImpersonating: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: UserRole[];
  loading: boolean;
  impersonation: ImpersonationState | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, metadata?: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 15000; // 15 seconds timeout for fetching profile/roles

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const navigate = useNavigate();
  
  // Refs to prevent race conditions and duplicate processing
  const initializedRef = useRef(false);
  const processingAuthRef = useRef(false);
  const lastProcessedUserIdRef = useRef<string | null>(null);

  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }, []);

  const fetchUserRoles = useCallback(async (userId: string): Promise<UserRole[]> => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, context_id, context_type")
        .eq("user_id", userId);

      if (error) throw error;
      return (data as UserRole[]) || [];
    } catch (error) {
      console.error("Error fetching user roles:", error);
      return [];
    }
  }, []);

  // Handle user data loading with timeout
  const loadUserData = useCallback(async (userId: string) => {
    // Prevent duplicate processing for the same user
    if (processingAuthRef.current && lastProcessedUserIdRef.current === userId) {
      return;
    }
    
    processingAuthRef.current = true;
    lastProcessedUserIdRef.current = userId;

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS);
      });

      // Race between data fetching and timeout
      const [profileData, rolesData] = await Promise.race([
        Promise.all([
          fetchUserProfile(userId),
          fetchUserRoles(userId)
        ]),
        timeoutPromise
      ]) as [UserProfile | null, UserRole[]];

      setProfile(profileData);
      setRoles(rolesData);
    } catch (error) {
      console.error("Error loading user data:", error);
      // On timeout or error, still set loading to false to prevent stuck state
      setProfile(null);
      setRoles([]);
    } finally {
      processingAuthRef.current = false;
      setLoading(false);
    }
  }, [fetchUserProfile, fetchUserRoles]);

  // Handle visibility change for mobile backgrounding
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Refresh session when app comes back to foreground
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          if (currentSession?.user && currentSession.user.id !== lastProcessedUserIdRef.current) {
            setSession(currentSession);
            setUser(currentSession.user);
            loadUserData(currentSession.user.id);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, loadUserData]);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const storedImpersonation = localStorage.getItem('impersonation');
    if (storedImpersonation) {
      try {
        setImpersonation(JSON.parse(storedImpersonation));
      } catch {
        localStorage.removeItem('impersonation');
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // Only process if this is a meaningful change
        const newUserId = currentSession?.user?.id ?? null;
        const currentUserId = lastProcessedUserIdRef.current;
        
        // Handle sign out
        if (event === 'SIGNED_OUT' || !currentSession) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setRoles([]);
          lastProcessedUserIdRef.current = null;
          setLoading(false);
          return;
        }

        // Handle sign in or token refresh
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Only fetch user data if it's a new user or explicit sign in
          if (event === 'SIGNED_IN' || newUserId !== currentUserId) {
            // Use setTimeout to avoid potential deadlock with Supabase
            setTimeout(() => {
              loadUserData(currentSession.user.id);
            }, 0);
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (existingSession?.user) {
        setSession(existingSession);
        setUser(existingSession.user);
        loadUserData(existingSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const hasRole = useCallback((role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  }, [roles]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
      }
    }
  }, [user, fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    // Detect if we're on a custom domain (not Lovable preview)
    const isCustomDomain = 
      !window.location.hostname.includes('lovable.app') &&
      !window.location.hostname.includes('lovableproject.com');

    if (isCustomDomain) {
      // Bypass auth-bridge by getting OAuth URL directly for custom domains
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          skipBrowserRedirect: true, // Get URL instead of auto-redirecting
        },
      });

      if (error) throw error;

      // Security: Validate OAuth URL before redirect to prevent open redirect
      if (data?.url) {
        const oauthUrl = new URL(data.url);
        const allowedHosts = ['accounts.google.com'];
        if (!allowedHosts.some(host => oauthUrl.hostname === host)) {
          throw new Error('Invalid OAuth redirect URL');
        }
        window.location.href = data.url; // Manual redirect
      }
    } else {
      // For Lovable domains, use normal flow (auth-bridge handles it)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          ...metadata,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    
    if (error) throw error;
    
    toast.success("Account created! You can now sign in.");
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });

    if (error) throw error;
    toast.success("Password reset email sent! Check your inbox.");
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    toast.success("Password updated successfully!");
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem('impersonation');
    setImpersonation(null);
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    setRoles([]);
    lastProcessedUserIdRef.current = null;
    navigate("/auth");
  }, [navigate]);

  const impersonateUser = useCallback(async (targetUserId: string) => {
    if (!profile) return;

    const impersonationState: ImpersonationState = {
      originalUserId: profile.id,
      originalRole: profile.role,
      isImpersonating: true,
    };

    localStorage.setItem('impersonation', JSON.stringify(impersonationState));
    setImpersonation(impersonationState);

    const targetProfile = await fetchUserProfile(targetUserId);

    if (targetProfile) {
      setProfile(targetProfile);
      toast.success(`Now viewing as ${targetProfile.email}`);
      
      switch (targetProfile.role) {
        case "super_admin":
          navigate("/super-admin");
          break;
        case "agency_admin":
          navigate(`/agency/${targetProfile.agency_id}`);
          break;
        case "sub_account_user":
          navigate(`/subaccount/${targetProfile.sub_account_id}/dashboard`);
          break;
      }
    }
  }, [profile, fetchUserProfile, navigate]);

  const stopImpersonation = useCallback(async () => {
    if (!impersonation) return;

    const originalProfile = await fetchUserProfile(impersonation.originalUserId);

    if (originalProfile) {
      setProfile(originalProfile);
      localStorage.removeItem('impersonation');
      setImpersonation(null);
      toast.success("Returned to your account");
      
      switch (originalProfile.role) {
        case "super_admin":
          navigate("/super-admin");
          break;
        case "agency_admin":
          navigate(`/agency/${originalProfile.agency_id}`);
          break;
      }
    }
  }, [impersonation, fetchUserProfile, navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        impersonation,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        impersonateUser,
        stopImpersonation,
        refreshProfile,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}