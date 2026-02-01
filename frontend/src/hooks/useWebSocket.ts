import { useState, useEffect, useCallback, useRef } from 'react';
import type { Transaction, Decision, SystemMetrics, CouncilDebate, WebSocketMessage, LogEntry, AgentSource } from '../types';

// Hardcoded fallback for production to ensure it works even if Env Var fails
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const WS_URL = IS_LOCAL
    ? 'ws://localhost:8000/ws'
    : 'wss://hackathon-3zry.onrender.com/ws';
const RECONNECT_DELAY = 3000;

export interface UseWebSocketReturn {
    isConnected: boolean;
    metrics: SystemMetrics;
    logs: LogEntry[];
    currentDebate: CouncilDebate | null;
    recentTransactions: Transaction[];
    successRateHistory: { time: string; rate: number }[];
    connect: () => void;
    disconnect: () => void;
}

const defaultMetrics: SystemMetrics = {
    total_transactions: 0,
    successful_transactions: 0,
    failed_transactions: 0,
    success_rate: 1,
    student_decisions: 0,
    teacher_decisions: 0,
    student_confidence: 0,
    chaos_active: false,
    chaos_bank: null,
};

export function useWebSocket(): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<SystemMetrics>(defaultMetrics);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [currentDebate, setCurrentDebate] = useState<CouncilDebate | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [successRateHistory, setSuccessRateHistory] = useState<{ time: string; rate: number }[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
        const newLog: LogEntry = {
            ...entry,
            id: Math.random().toString(36).slice(2, 9),
            timestamp: new Date(),
        };
        setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100 logs
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            switch (message.type) {
                case 'transaction': {
                    const txn = message.data as Transaction;
                    setRecentTransactions(prev => [txn, ...prev].slice(0, 50));
                    addLog({
                        type: 'transaction',
                        bankName: txn.bank_name,
                        status: txn.status,
                        amount: txn.amount,
                        message: `${txn.bank_name} | ${txn.payment_method} | ₹${txn.amount.toLocaleString()} | ${txn.status.toUpperCase()}${txn.error_code ? ` (${txn.error_code})` : ''}`,
                    });
                    break;
                }

                case 'decision': {
                    const data = message.data as { decision: Decision; transaction_id: string; brain: string };
                    addLog({
                        type: 'decision',
                        brain: data.brain as AgentSource,
                        action: data.decision.action,
                        confidence: data.decision.confidence_score,
                        message: `[${data.brain.toUpperCase()}] ${data.decision.action.replace('_', ' ').toUpperCase()} (${(data.decision.confidence_score * 100).toFixed(0)}%)`,
                    });
                    break;
                }

                case 'metrics': {
                    const newMetrics = message.data as SystemMetrics;
                    setMetrics(newMetrics);

                    // Add to history for chart
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    setSuccessRateHistory(prev => {
                        const updated = [...prev, { time: timeStr, rate: newMetrics.success_rate * 100 }];
                        return updated.slice(-60); // Keep last 60 data points
                    });
                    break;
                }

                case 'council_debate': {
                    const debate = message.data as CouncilDebate;
                    setCurrentDebate(debate);
                    addLog({
                        type: 'council',
                        message: `🎭 Council Debate: ${debate.final_decision.action.replace('_', ' ').toUpperCase()} (${debate.duration_ms}ms)`,
                    });
                    // Clear debate after 10 seconds
                    setTimeout(() => setCurrentDebate(null), 10000);
                    break;
                }
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }, [addLog]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            wsRef.current = new WebSocket(WS_URL);

            wsRef.current.onopen = () => {
                setIsConnected(true);
                addLog({ type: 'decision', message: '🟢 Connected to Payment Ops Server' });
            };

            wsRef.current.onclose = () => {
                setIsConnected(false);
                addLog({ type: 'decision', message: '🔴 Disconnected from server' });

                // Auto-reconnect
                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connect();
                }, RECONNECT_DELAY);
            };

            wsRef.current.onerror = () => {
                console.error('WebSocket error');
            };

            wsRef.current.onmessage = handleMessage;

        } catch (error) {
            console.error('Failed to connect:', error);
        }
    }, [handleMessage, addLog]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        wsRef.current?.close();
        setIsConnected(false);
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        metrics,
        logs,
        currentDebate,
        recentTransactions,
        successRateHistory,
        connect,
        disconnect,
    };
}
