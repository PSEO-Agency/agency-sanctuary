import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface SetupProgressProps {
  subaccountId: string;
  subaccountName: string;
  onSetupComplete: () => void;
}

type SetupStatus = 'checking' | 'in_progress' | 'retrying' | 'completed' | 'failed';

const POLL_INTERVAL = 5000; // 5 seconds
const AUTO_RETRY_DELAY = 30000; // 30 seconds before auto-retry
const MAX_RETRIES = 3;

export function SetupProgress({ subaccountId, subaccountName, onSetupComplete }: SetupProgressProps) {
  const [status, setStatus] = useState<SetupStatus>('checking');
  const [progress, setProgress] = useState(10);
  const [retryCount, setRetryCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Check if airtable_base_id exists
  const checkSetupStatus = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('subaccounts')
        .select('airtable_base_id')
        .eq('id', subaccountId)
        .single();

      if (error) {
        console.error('Error checking setup status:', error);
        return false;
      }

      if (data?.airtable_base_id) {
        setStatus('completed');
        setProgress(100);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in checkSetupStatus:', err);
      return false;
    }
  }, [subaccountId]);

  // Trigger the setup function
  const triggerSetup = useCallback(async () => {
    try {
      console.log(`Triggering setup for subaccount: ${subaccountId}`);
      setStatus('in_progress');
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('setup-subaccount-airtable', {
        body: { 
          subaccountId, 
          subaccountName 
        }
      });

      if (error) {
        console.error('Setup function error:', error);
        throw error;
      }

      if (data?.success && data?.baseId) {
        console.log('Setup completed successfully:', data);
        setStatus('completed');
        setProgress(100);
        return true;
      }

      // Setup was called but baseId not returned - keep polling
      console.log('Setup function called, waiting for completion...');
      return false;
    } catch (err) {
      console.error('Error triggering setup:', err);
      return false;
    }
  }, [subaccountId, subaccountName]);

  // Manual retry handler
  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    setStatus('retrying');
    setProgress(20);
    
    const success = await triggerSetup();
    if (!success) {
      // Will continue polling
      setStatus('in_progress');
    }
  }, [triggerSetup]);

  // Main polling effect
  useEffect(() => {
    let isMounted = true;

    const startPolling = async () => {
      // Initial check
      const isComplete = await checkSetupStatus();
      if (isComplete) {
        toast.success('Setup complete!');
        onSetupComplete();
        return;
      }

      // Start polling
      setStatus('in_progress');
      pollIntervalRef.current = setInterval(async () => {
        if (!isMounted) return;

        const complete = await checkSetupStatus();
        if (complete) {
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
          toast.success('Your workspace is ready!');
          onSetupComplete();
        }

        // Update elapsed time
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, POLL_INTERVAL);

      // Auto-retry after delay if still not complete
      retryTimeoutRef.current = setTimeout(async () => {
        if (!isMounted) return;
        
        const stillIncomplete = !(await checkSetupStatus());
        if (stillIncomplete && retryCount < MAX_RETRIES) {
          console.log('Auto-retrying setup...');
          setRetryCount(prev => prev + 1);
          setStatus('retrying');
          await triggerSetup();
          setStatus('in_progress');
        }
      }, AUTO_RETRY_DELAY);
    };

    startPolling();

    // Cleanup
    return () => {
      isMounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [checkSetupStatus, onSetupComplete, triggerSetup, retryCount]);

  // Animate progress bar
  useEffect(() => {
    if (status === 'in_progress' || status === 'retrying') {
      const interval = setInterval(() => {
        setProgress(prev => {
          // Slowly increment but never reach 100
          if (prev < 90) return prev + Math.random() * 5;
          return prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking setup status...';
      case 'in_progress':
        if (elapsedTime > 60) {
          return 'Still working on it... This is taking longer than usual.';
        }
        return 'Setting up your workspace...';
      case 'retrying':
        return `Retrying setup (attempt ${retryCount + 1}/${MAX_RETRIES})...`;
      case 'completed':
        return 'Setup complete!';
      case 'failed':
        return 'Setup failed. Please try again.';
      default:
        return 'Processing...';
    }
  };

  const getSubMessage = () => {
    switch (status) {
      case 'in_progress':
        return 'This usually takes about 1-2 minutes';
      case 'retrying':
        return 'We\'re retrying the setup automatically';
      case 'failed':
        return 'Click the button below to retry manually';
      default:
        return null;
    }
  };

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-lg font-medium">Your workspace is ready!</p>
        <p className="text-sm text-muted-foreground mt-1">Refreshing...</p>
      </div>
    );
  }

  if (status === 'failed' && retryCount >= MAX_RETRIES) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium text-destructive">Setup failed</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          We couldn't complete the setup after multiple attempts.
        </p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          If this persists, please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/30">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg font-medium">{getStatusMessage()}</p>
      {getSubMessage() && (
        <p className="text-sm text-muted-foreground mt-1">{getSubMessage()}</p>
      )}
      
      <div className="w-64 mt-6">
        <Progress value={progress} className="h-2" />
      </div>
      
      <p className="text-xs text-muted-foreground mt-3">
        {status === 'in_progress' && 'Creating your Airtable workspace...'}
        {status === 'retrying' && 'Reconnecting to setup service...'}
        {status === 'checking' && 'Verifying configuration...'}
      </p>

      {elapsedTime > 45 && status !== 'retrying' && retryCount < MAX_RETRIES && (
        <Button 
          onClick={handleRetry} 
          variant="ghost" 
          size="sm" 
          className="mt-4"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry Now
        </Button>
      )}
    </div>
  );
}
