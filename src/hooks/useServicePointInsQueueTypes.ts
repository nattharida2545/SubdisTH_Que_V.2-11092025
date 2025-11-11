import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createLogger } from "@/utils/logger";

const logger = createLogger("useServicePointInsQueueTypes");

export interface ServicePointInsQueueType {
  id: string;
  service_point_ins_id: string;
  queue_ins_type_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface UseServicePointInsQueueTypesReturn {
  mappings: ServicePointInsQueueType[];
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  fetchMappings: () => Promise<void>;
  addMapping: (
    servicePointInsId: string,
    queueInsTypeId: string
  ) => Promise<ServicePointInsQueueType | null>;
  removeMapping: (id: string) => Promise<boolean>;
}

export const useServicePointInsQueueTypes = (
  servicePointInsId?: string
): UseServicePointInsQueueTypesReturn => {
  const [mappings, setMappings] = useState<ServicePointInsQueueType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMappings = async () => {
    // Don't fetch if no service point is selected
    if (!servicePointInsId) {
      setMappings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("service_point_queue_ins_types")
        .select("*")
        .eq("service_point_ins_id", servicePointInsId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setMappings(data || []);
      logger.debug(
        `Fetched ${data?.length || 0} INS queue type mappings for service point ${servicePointInsId}`
      );
    } catch (err: any) {
      logger.error("Error fetching INS service point queue type mappings:", err);
      setError(
        err.message || "Failed to fetch INS service point queue type mappings"
      );
      setMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const addMapping = async (
    servicePointInsId: string,
    queueInsTypeId: string
  ): Promise<ServicePointInsQueueType | null> => {
    try {
      const { data, error: insertError } = await supabase
        .from("service_point_queue_ins_types")
        .insert({
          service_point_ins_id: servicePointInsId,
          queue_ins_type_id: queueInsTypeId,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      setMappings((prev) => [...prev, data]);
      toast.success("เชื่อมโยงประเภทคิวตรวจกับจุดบริการเรียบร้อยแล้ว");
      logger.debug("Successfully added INS queue type mapping:", data);
      return data;
    } catch (err: any) {
      logger.error("Error adding INS service point queue type mapping:", err);
      toast.error("ไม่สามารถเชื่อมโยงประเภทคิวตรวจกับจุดบริการได้");
      return null;
    }
  };

  const removeMapping = async (id: string): Promise<boolean> => {
    try {
      setDeletingId(id);

      // Optimistically remove from local state
      setMappings((prev) => {
        const updated = prev.filter((mapping) => mapping.id !== id);
        logger.debug(
          `Optimistically removed INS mapping ${id} from local state, remaining: ${updated.length}`
        );
        return updated;
      });

      const { error: deleteError } = await supabase
        .from("service_point_queue_ins_types")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success("ยกเลิกการเชื่อมโยงประเภทคิวตรวจเรียบร้อยแล้ว");
      logger.debug(`Successfully deleted INS mapping with id: ${id}`);
      return true;
    } catch (err: any) {
      logger.error("Error removing INS service point queue type mapping:", err);

      // Restore the item to local state if deletion failed
      if (servicePointInsId) {
        await fetchMappings();
      }

      toast.error(
        `ไม่สามารถยกเลิกการเชื่อมโยงประเภทคิวตรวจได้: ${err.message}`
      );
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, [servicePointInsId]);

  return {
    mappings,
    loading,
    error,
    deletingId,
    fetchMappings,
    addMapping,
    removeMapping,
  };
};
