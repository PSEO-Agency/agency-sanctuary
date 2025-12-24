import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Building2, Check, AlertCircle } from "lucide-react";

export default function AgencyInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    agencyName: "",
    agencySlug: "",
  });

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setLoading(false);
      setTokenError("No invite token provided");
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from("agency_invites")
        .select("*")
        .eq("token", token)
        .eq("invite_type", "agency")
        .eq("status", "pending")
        .single();

      if (error || !data) {
        setTokenError("Invalid or expired invite link");
        setTokenValid(false);
      } else if (new Date(data.expires_at) < new Date()) {
        setTokenError("This invite link has expired");
        setTokenValid(false);
      } else {
        setTokenValid(true);
        if (data.email) {
          setFormData(prev => ({ ...prev, email: data.email }));
        }
      }
    } catch (err) {
      setTokenError("Failed to validate invite");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleAgencyNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      agencyName: value,
      agencySlug: generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) return;

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-agency-invite", {
        body: {
          token,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          agencyName: formData.agencyName,
          agencySlug: formData.agencySlug,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Agency created successfully! Please log in.");
      navigate("/auth");
    } catch (err: any) {
      toast.error(err.message || "Failed to create agency");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/30 via-background to-primary/5 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{tokenError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/30 via-background to-primary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create Your Agency</CardTitle>
          <CardDescription>
            You've been invited to create an agency on PSEO Builder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Your Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">Agency Details</p>
              
              <div className="space-y-2">
                <Label htmlFor="agencyName">Agency Name</Label>
                <Input
                  id="agencyName"
                  value={formData.agencyName}
                  onChange={(e) => handleAgencyNameChange(e.target.value)}
                  placeholder="My Awesome Agency"
                  required
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="agencySlug">Agency Slug</Label>
                <Input
                  id="agencySlug"
                  value={formData.agencySlug}
                  onChange={(e) => setFormData(prev => ({ ...prev, agencySlug: e.target.value }))}
                  placeholder="my-awesome-agency"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Agency...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Create Agency & Sign Up
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
