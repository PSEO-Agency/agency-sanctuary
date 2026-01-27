import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type AudienceLevel = "country_partner" | "agency" | "subaccount";

export interface Announcement {
  id: string;
  created_by: string | null;
  title: string;
  description: string;
  image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  audience: AudienceLevel[];
  published_at: string;
  is_draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementInput {
  title: string;
  description: string;
  image_url?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  audience: AudienceLevel[];
  published_at?: string;
  is_draft?: boolean;
}

interface AnnouncementRead {
  announcement_id: string;
  read_at: string;
}

export function useAnnouncements() {
  const { user, hasRole } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reads, setReads] = useState<AnnouncementRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Determine user's audience levels (mapped to announcement audience types)
  const userAudienceLevels = useMemo(() => {
    const levels: AudienceLevel[] = [];
    if (hasRole("country_partner")) levels.push("country_partner");
    if (hasRole("agency_admin")) levels.push("agency");
    if (hasRole("sub_account_user")) levels.push("subaccount");
    return levels;
  }, [hasRole]);

  const isSuperAdmin = hasRole("super_admin");

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false });

      if (error) throw error;
      
      // Type cast the data properly
      const typedData = (data || []).map(item => ({
        ...item,
        audience: item.audience as AudienceLevel[]
      })) as Announcement[];
      
      setAnnouncements(typedData);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch read status
  const fetchReads = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("announcement_reads")
        .select("announcement_id, read_at")
        .eq("user_id", user.id);

      if (error) throw error;
      setReads(data || []);
    } catch (error) {
      console.error("Error fetching reads:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      fetchReads();
    }
  }, [user, fetchAnnouncements, fetchReads]);

  // Get unread announcements
  const unreadAnnouncements = useMemo(() => {
    const readIds = new Set(reads.map(r => r.announcement_id));
    return announcements.filter(a => 
      !a.is_draft && 
      !readIds.has(a.id) &&
      new Date(a.published_at) <= new Date()
    );
  }, [announcements, reads]);

  // Get unread count
  const unreadCount = unreadAnnouncements.length;

  // Get announcements by audience level
  const getAnnouncementsByAudience = useCallback((audience: AudienceLevel) => {
    return announcements.filter(a => 
      !a.is_draft && 
      a.audience.includes(audience) &&
      new Date(a.published_at) <= new Date()
    );
  }, [announcements]);

  // Get unread announcements by audience
  const getUnreadByAudience = useCallback((audience: AudienceLevel) => {
    const readIds = new Set(reads.map(r => r.announcement_id));
    return announcements.filter(a => 
      !a.is_draft && 
      a.audience.includes(audience) &&
      !readIds.has(a.id) &&
      new Date(a.published_at) <= new Date()
    );
  }, [announcements, reads]);

  // Mark announcement as read
  const markAsRead = useCallback(async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("announcement_reads")
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
        });

      if (error && !error.message.includes("duplicate")) throw error;
      
      setReads(prev => [...prev, { announcement_id: announcementId, read_at: new Date().toISOString() }]);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }, [user]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = unreadAnnouncements.map(a => a.id);
    
    try {
      const inserts = unreadIds.map(id => ({
        announcement_id: id,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("announcement_reads")
        .upsert(inserts, { onConflict: "announcement_id,user_id" });

      if (error) throw error;
      
      await fetchReads();
      toast.success("All announcements marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark announcements as read");
    }
  }, [user, unreadAnnouncements, fetchReads]);

  // Create announcement (super admin only)
  const createAnnouncement = useCallback(async (data: CreateAnnouncementInput) => {
    if (!user || !isSuperAdmin) {
      toast.error("Unauthorized");
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .insert({
          ...data,
          created_by: user.id,
        });

      if (error) throw error;
      
      await fetchAnnouncements();
      toast.success(data.is_draft ? "Draft saved" : "Announcement published");
    } catch (error) {
      console.error("Error creating announcement:", error);
      toast.error("Failed to create announcement");
      throw error;
    }
  }, [user, isSuperAdmin, fetchAnnouncements]);

  // Update announcement
  const updateAnnouncement = useCallback(async (id: string, data: Partial<CreateAnnouncementInput>) => {
    if (!user || !isSuperAdmin) {
      toast.error("Unauthorized");
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .update(data)
        .eq("id", id);

      if (error) throw error;
      
      await fetchAnnouncements();
      toast.success("Announcement updated");
    } catch (error) {
      console.error("Error updating announcement:", error);
      toast.error("Failed to update announcement");
      throw error;
    }
  }, [user, isSuperAdmin, fetchAnnouncements]);

  // Delete announcement
  const deleteAnnouncement = useCallback(async (id: string) => {
    if (!user || !isSuperAdmin) {
      toast.error("Unauthorized");
      return;
    }

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      await fetchAnnouncements();
      toast.success("Announcement deleted");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
      throw error;
    }
  }, [user, isSuperAdmin, fetchAnnouncements]);

  // Check if announcement is read
  const isRead = useCallback((announcementId: string) => {
    return reads.some(r => r.announcement_id === announcementId);
  }, [reads]);

  return {
    announcements,
    unreadAnnouncements,
    unreadCount,
    isLoading,
    userAudienceLevels,
    isSuperAdmin,
    markAsRead,
    markAllAsRead,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    getAnnouncementsByAudience,
    getUnreadByAudience,
    isRead,
    refetch: fetchAnnouncements,
  };
}
