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
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
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
    // Check for stored impersonation state
    const storedImpersonation = localStorage.getItem('impersonation');
    if (storedImpersonation) {
      setImpersonation(JSON.parse(storedImpersonation));
    }

    // Set up auth state listener
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

    // Check for existing session
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    toast.success("Account created successfully!");
  };

  const signOut = async () => {
    // Clear impersonation state
    localStorage.removeItem('impersonation');
    setImpersonation(null);
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
    navigate("/auth");
  };

  const impersonateUser = async (targetUserId: string) => {
    if (!profile) return;

    // Store original user info
    const impersonationState: ImpersonationState = {
      originalUserId: profile.id,
      originalRole: profile.role,
      isImpersonating: true,
    };

    localStorage.setItem('impersonation', JSON.stringify(impersonationState));
    setImpersonation(impersonationState);

    // Fetch the target user's profile
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();

    if (targetProfile) {
      setProfile(targetProfile);
      toast.success(`Now viewing as ${targetProfile.email}`);
      
      // Navigate to appropriate portal
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

    // Restore original user
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
      
      // Navigate back to original portal
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
        signUp,
        signOut,
        impersonateUser,
        stopImpersonation,
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
