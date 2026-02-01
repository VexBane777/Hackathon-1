import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Brain, Zap, TrendingUp, Terminal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SystemMetrics, LogEntry } from '../types';

interface DashboardProps {
    isConnected: boolean;
    metrics: SystemMetrics;
    logs: LogEntry[];
    successRateHistory: { time: string; rate: number }[];
}

export function Dashboard({ isConnected, metrics, logs, successRateHistory }: DashboardProps) {
    // Monochrome status logic
    const isHealthy = metrics.success_rate > 0.9 && !metrics.chaos_active;
    const statusText = metrics.chaos_active
        ? `SIMULATION: ${metrics.chaos_bank} OUTAGE`
        : (metrics.success_rate > 0.9 ? 'SYSTEM OPTIMAL' : 'HIGH FAILURE RATE');

    return (
        <div className="flex flex-col h-full gap-4 p-0">
            {/* Top Status Bar */}
            <Card className="border-b-0 border-x-0 border-t-0 bg-transparent rounded-none">
                <CardContent className="flex items-center justify-between py-2 px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 ${isHealthy ? 'bg-white' : 'bg-transparent border border-white animate-pulse'}`} />
                            <span className="font-mono text-sm tracking-wider">{statusText}</span>
                        </div>
                        {metrics.chaos_active && (
                            <Badge variant="outline" className="bg-white text-black font-mono rounded-none">
                                STRESS TEST ACTIVE
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                        <span>UPTIME: {isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                        <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-zinc-500' : 'bg-red-500'}`} />
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="SUCCESS RATE"
                    value={`${(metrics.success_rate * 100).toFixed(1)}%`}
                    subValue="ROLLING AVG"
                    icon={<Activity className="w-4 h-4" />}
                />

                <MetricCard
                    label="STUDENT AUTONOMY"
                    value={`${(metrics.student_confidence * 100).toFixed(0)}%`}
                    subValue={`${metrics.student_decisions} DECISIONS`}
                    icon={<Brain className="w-4 h-4" />}
                >
                    <Progress value={metrics.student_confidence * 100} className="h-1 mt-3 bg-zinc-900" />
                </MetricCard>

                <MetricCard
                    label="TEACHER INTERVENTION"
                    value={metrics.teacher_decisions.toString()}
                    subValue="ESCALATIONS"
                    icon={<Zap className="w-4 h-4" />}
                />

                <MetricCard
                    label="THROUGHPUT"
                    value={metrics.total_transactions.toString()}
                    subValue={`${metrics.failed_transactions} FAILED`}
                    icon={<TrendingUp className="w-4 h-4" />}
                />
            </div>

            {/* Main Visualization Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                {/* Performance Graph */}
                <Card className="lg:col-span-2 bg-black border border-zinc-800 rounded-none">
                    <CardHeader className="py-3 border-b border-zinc-800">
                        <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            SYSTEM PERFORMANCE
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={successRateHistory}>
                                <defs>
                                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="time"
                                    stroke="#525252"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={30}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    stroke="#525252"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#000',
                                        border: '1px solid #333',
                                        borderRadius: '0px',
                                        color: '#fff',
                                        fontFamily: 'monospace'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="rate"
                                    stroke="#fff"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorRate)"
                                    animationDuration={500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Live System Log */}
                <Card className="bg-black border border-zinc-800 rounded-none flex flex-col min-h-0">
                    <CardHeader className="py-3 border-b border-zinc-800">
                        <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                            <Terminal className="w-4 h-4" />
                            SYSTEM LOG
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden font-mono text-xs">
                        <div className="h-full overflow-y-auto p-3 space-y-1">
                            {logs.length === 0 ? (
                                <div className="text-zinc-600 text-center py-10">
                                    AWAITING DATA STREAM...
                                </div>
                            ) : (
                                logs.slice(0, 50).map(log => (
                                    <LogItem key={log.id} log={log} />
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ label, value, subValue, icon, children }: any) {
    return (
        <Card className="bg-black border border-zinc-800 rounded-none">
            <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">{label}</span>
                    <span className="text-zinc-500">{icon}</span>
                </div>
                <div className="text-2xl font-mono font-bold text-white tracking-tight">{value}</div>
                <div className="text-[10px] font-mono text-zinc-600 mt-1 uppercase">{subValue}</div>
                {children}
            </CardContent>
        </Card>
    );
}

function LogItem({ log }: { log: LogEntry }) {
    const timeStr = log.timestamp.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const isTeacher = log.brain === 'teacher' || log.type === 'council';

    return (
        <div className="flex items-start gap-3 py-1 text-zinc-400 font-mono hover:bg-zinc-900/50 px-1 transition-colors">
            <span className="text-zinc-600 shrink-0">{timeStr}</span>
            <div className="flex-1 truncate">
                {log.type === 'decision' && (
                    <span className={`mr-2 uppercase text-[10px] px-1 border ${log.brain === 'student' ? 'border-zinc-700 text-zinc-500' : 'border-white text-white'
                        }`}>
                        {log.brain}
                    </span>
                )}
                <span className={isTeacher ? 'text-white' : ''}>
                    {log.message.replace(/^(.*?) \| /, '')}
                </span>
            </div>
        </div>
    );
}
