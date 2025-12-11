import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type AppRole = "super_admin" | "agency_admin" | "sub_account_user";

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
  loading: boolean;
  impersonation: ImpersonationState | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedImpersonation = localStorage.getItem('impersonation');
    if (storedImpersonation) {
      setImpersonation(JSON.parse(storedImpersonation));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    
    if (error) throw error;
    
    // Don't create agency here - it will be created during onboarding
    // The profile is created automatically via the database trigger
    
    toast.success("Account created! You can now sign in.");
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    });

    if (error) throw error;
    toast.success("Password reset email sent! Check your inbox.");
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    toast.success("Password updated successfully!");
  };

  const signOut = async () => {
    localStorage.removeItem('impersonation');
    setImpersonation(null);
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    navigate("/auth");
  };

  const impersonateUser = async (targetUserId: string) => {
    if (!profile) return;

    const impersonationState: ImpersonationState = {
      originalUserId: profile.id,
      originalRole: profile.role,
      isImpersonating: true,
    };

    localStorage.setItem('impersonation', JSON.stringify(impersonationState));
    setImpersonation(impersonationState);

    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

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
  };

  const stopImpersonation = async () => {
    if (!impersonation) return;

    const { data: originalProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", impersonation.originalUserId)
      .single();

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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
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
