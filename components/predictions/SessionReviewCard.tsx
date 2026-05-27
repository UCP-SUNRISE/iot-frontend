"use client";

import { useEffect, useState } from 'react';
import { useMqtt } from '@/contexts/MqttContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DataPoint {
  elapsed_time: number;
  water_temp: number;
  [key: string]: unknown;
}

interface SessionReviewCardProps {
  sessionId: string;
}

export function SessionReviewCard({ sessionId }: SessionReviewCardProps) {
  const { makeRpcCall } = useMqtt();
  const [sessionData, setSessionData] = useState<DataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await makeRpcCall(
          'sunrise/db/request/session',
          'sunrise/db/response/session',
          { sessionId }
        );

        if (mounted) {
          // Fallback logic in case data is nested inside a property
          const dataArray = Array.isArray(response) ? response : ((response as any)?.data || []);
          setSessionData(dataArray as DataPoint[]);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch session data');
          setIsLoading(false);
        }
      }
    };

    fetchSession();
    return () => { mounted = false; };
  }, [sessionId, makeRpcCall]);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await makeRpcCall(
        'sunrise/ml/approve/request',
        'sunrise/ml/approve/response',
        { sessionId }
      );
      toast.success('Session approved for Kinetics Training');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve session');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-card text-card-foreground shadow-xl rounded-2xl p-6 border border-border flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-bold">Session Review</h2>
          <p className="text-sm text-muted-foreground mt-1">ID: {sessionId}</p>
        </div>
        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-semibold rounded-full border border-amber-500/20">
          Pending Approval
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-72 bg-muted/30 rounded-xl border border-dashed border-border">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Fetching session data over MQTT...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-72 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 p-6 text-center">
          <div>
            <svg className="w-10 h-10 mx-auto mb-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold">Error Loading Session</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="elapsed_time"
                  tickFormatter={(val) => `${val}s`}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}°C`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--card)',
                    color: 'var(--card-foreground)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                  }}
                  labelFormatter={(val) => `Time: ${val}s`}
                  formatter={(val: any) => [`${Number(val).toFixed(1)}°C`, 'Water Temp']}
                />
                <Line
                  type="monotone"
                  dataKey="water_temp"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center justify-center bg-primary hover:bg-primary/90 focus:ring-4 focus:ring-ring/20 text-primary-foreground font-medium py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Approve for Kinetics Training
            </button>
          </div>
        </>
      )}
    </div>
  );
}
