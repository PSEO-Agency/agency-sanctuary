import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WordPressConnection {
  id: string;
  subaccount_id: string;
  name: string;
  base_url: string;
  api_key: string;
  status: 'connected' | 'disconnected' | 'error';
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export function useWordPressConnections(subaccountId: string | undefined) {
  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!subaccountId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('wordpress_connections')
        .select('*')
        .eq('subaccount_id', subaccountId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setConnections((data as WordPressConnection[]) || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching WordPress connections:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [subaccountId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const createConnection = async (data: {
    name: string;
    base_url: string;
    api_key: string;
  }) => {
    if (!subaccountId) throw new Error('No subaccount ID');

    const { data: newConn, error: createError } = await supabase
      .from('wordpress_connections')
      .insert({
        subaccount_id: subaccountId,
        name: data.name,
        base_url: data.base_url,
        api_key: data.api_key,
        status: 'disconnected',
      })
      .select()
      .single();

    if (createError) throw createError;

    // Run handshake
    const { data: handshakeResult, error: handshakeError } = await supabase.functions.invoke(
      'wordpress-handshake',
      {
        body: {
          connectionId: newConn.id,
          baseUrl: data.base_url,
          apiKey: data.api_key,
        },
      }
    );

    if (handshakeError) {
      console.error('Handshake error:', handshakeError);
    }

    await fetchConnections();
    return { connection: newConn, handshakeResult };
  };

  const testConnection = async (connectionId: string) => {
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection) throw new Error('Connection not found');

    const { data, error } = await supabase.functions.invoke('wordpress-handshake', {
      body: {
        connectionId: connection.id,
        baseUrl: connection.base_url,
        apiKey: connection.api_key,
      },
    });

    if (error) throw error;

    await fetchConnections();
    return data;
  };

  const updateConnection = async (
    connectionId: string,
    data: Partial<{ name: string; base_url: string; api_key: string }>
  ) => {
    const { error: updateError } = await supabase
      .from('wordpress_connections')
      .update({
        ...data,
        status: 'disconnected', // Reset status when updating
        last_error: null,
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;

    // Get updated connection details
    const connection = connections.find((c) => c.id === connectionId);
    const baseUrl = data.base_url || connection?.base_url;
    const apiKey = data.api_key || connection?.api_key;

    if (baseUrl && apiKey) {
      // Re-run handshake
      await supabase.functions.invoke('wordpress-handshake', {
        body: {
          connectionId,
          baseUrl,
          apiKey,
        },
      });
    }

    await fetchConnections();
  };

  const deleteConnection = async (connectionId: string) => {
    const { error: deleteError } = await supabase
      .from('wordpress_connections')
      .delete()
      .eq('id', connectionId);

    if (deleteError) throw deleteError;
    await fetchConnections();
  };

  const disconnectConnection = async (connectionId: string) => {
    const { error: updateError } = await supabase
      .from('wordpress_connections')
      .update({
        status: 'disconnected',
        last_error: null,
      })
      .eq('id', connectionId);

    if (updateError) throw updateError;
    await fetchConnections();
  };

  const getConnectedConnections = () => {
    return connections.filter((c) => c.status === 'connected');
  };

  return {
    connections,
    loading,
    error,
    fetchConnections,
    createConnection,
    testConnection,
    updateConnection,
    deleteConnection,
    disconnectConnection,
    getConnectedConnections,
  };
}
