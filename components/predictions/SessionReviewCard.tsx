"use client";

import React, { useEffect, useState } from 'react';
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
          const dataArray = Array.isArray(response) ? response : (response.data || []);
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
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Session Review</h2>
          <p className="text-sm text-slate-500 mt-1">ID: {sessionId}</p>
        </div>
        <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full border border-amber-100">
          Pending Approval
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-72 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 font-medium">Fetching session data over MQTT...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-72 bg-red-50 text-red-600 rounded-xl border border-red-100 p-6 text-center">
          <div>
            <svg className="w-10 h-10 mx-auto mb-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-red-700">Error Loading Session</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sessionData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="elapsed_time" 
                  tickFormatter={(val) => `${val}s`} 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}°C`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(val) => `Time: ${val}s`}
                  formatter={(val: number) => [`${val.toFixed(1)}°C`, 'Water Temp']}
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

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 text-white font-medium py-2.5 px-6 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
