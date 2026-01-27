import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureStage {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string | null;
  stage_id: string | null;
  position: number;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeatureBoard() {
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["feature-stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as FeatureStage[];
    },
  });

  const { data: features = [], isLoading: featuresLoading } = useQuery({
    queryKey: ["feature-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as FeatureRequest[];
    },
  });

  const createFeature = useMutation({
    mutationFn: async (feature: Partial<FeatureRequest>) => {
      const { data: user } = await supabase.auth.getUser();
      const maxPosition = features
        .filter((f) => f.stage_id === feature.stage_id)
        .reduce((max, f) => Math.max(max, f.position), -1);

      const { data, error } = await supabase
        .from("feature_requests")
        .insert({
          title: feature.title!,
          stage_id: feature.stage_id,
          position: maxPosition + 1,
          priority: feature.priority || "medium",
          deadline: feature.deadline,
          description: feature.description,
          created_by: user?.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  const updateFeature = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<FeatureRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("feature_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feature_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  const moveFeature = useMutation({
    mutationFn: async ({
      featureId,
      targetStageId,
      targetPosition,
    }: {
      featureId: string;
      targetStageId: string;
      targetPosition?: number;
    }) => {
      const position =
        targetPosition ??
        features.filter((f) => f.stage_id === targetStageId).length;

      const { data, error } = await supabase
        .from("feature_requests")
        .update({ stage_id: targetStageId, position })
        .eq("id", featureId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  // Stage mutations
  const createStage = useMutation({
    mutationFn: async (stage: Partial<FeatureStage>) => {
      const maxPosition = stages.reduce((max, s) => Math.max(max, s.position), -1);
      const { data, error } = await supabase
        .from("feature_stages")
        .insert({
          name: stage.name!,
          color: stage.color || "#e2e8f0",
          position: maxPosition + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-stages"] });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<FeatureStage> & { id: string }) => {
      const { data, error } = await supabase
        .from("feature_stages")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-stages"] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("feature_stages")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-stages"] });
      queryClient.invalidateQueries({ queryKey: ["feature-requests"] });
    },
  });

  return {
    stages,
    features,
    isLoading: stagesLoading || featuresLoading,
    createFeature,
    updateFeature,
    deleteFeature,
    moveFeature,
    createStage,
    updateStage,
    deleteStage,
  };
}
