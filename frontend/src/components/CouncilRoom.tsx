import { useEffect, useState } from 'react';
import { Shield, TrendingUp, User, Scale, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CouncilDebate } from '../types';

interface CouncilRoomProps {
    debate: CouncilDebate | null;
}

export function CouncilRoom({ debate }: CouncilRoomProps) {
    const [activeAgent, setActiveAgent] = useState<'risk' | 'growth' | 'manager' | null>(null);

    useEffect(() => {
        if (debate) {
            // Simulate sequential thinking visualization
            setActiveAgent('risk');
            setTimeout(() => setActiveAgent('growth'), 800);
            setTimeout(() => setActiveAgent('manager'), 1600);
        } else {
            setActiveAgent(null);
        }
    }, [debate]);

    if (!debate) {
        return (
            <Card className="bg-black border border-zinc-800 rounded-none h-full bg-grid-zinc-900/20">
                <CardHeader className="py-3 border-b border-zinc-800">
                    <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                        <Scale className="w-4 h-4" />
                        COUNCIL CHAMBER
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-[300px] text-zinc-600 font-mono">
                    <Eye className="w-8 h-8 mb-4 opacity-50" />
                    <p className="text-xs uppercase tracking-widest text-center">
                        System Monitoring<br />
                        Waiting for Escalation
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-black border border-zinc-800 rounded-none h-full animate-in fade-in duration-300">
            <CardHeader className="py-3 border-b border-zinc-800 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    ACTIVE DELIBERATION
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px] rounded-none border-white text-white">
                    {debate.duration_ms}ms
                </Badge>
            </CardHeader>

            <CardContent className="p-0 font-mono">
                <div className="divide-y divide-zinc-800">
                    {/* Risk Agent */}
                    <AgentResponse
                        icon={<Shield className="w-3 h-3" />}
                        name="RISK_AGENT"
                        content={debate.risk_argument}
                        isActive={activeAgent === 'risk'}
                        isVisible={true}
                    />

                    {/* Growth Agent */}
                    <AgentResponse
                        icon={<TrendingUp className="w-3 h-3" />}
                        name="GROWTH_AGENT"
                        content={debate.growth_argument}
                        isActive={activeAgent === 'growth'}
                        isVisible={activeAgent !== 'risk'}
                    />

                    {/* Manager Synthesis */}
                    <div className={`p-4 bg-zinc-900/30 transition-all duration-500 ${activeAgent === 'manager' ? 'opacity-100' : 'opacity-50 blur-[2px]'}`}>
                        <div className="flex items-center gap-2 mb-2 text-white">
                            <User className="w-3 h-3" />
                            <span className="text-xs font-bold tracking-wider">MANAGER_SYNTHESIS</span>
                            <ChevronRight className="w-3 h-3 ml-auto text-zinc-500" />
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed mb-3 pl-5 border-l border-zinc-700">
                            "{debate.manager_synthesis}"
                        </p>
                        <div className="flex items-center justify-between pl-5">
                            <span className="text-[10px] text-zinc-500 uppercase">FINAL DECISION</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400">CONFIDENCE: {(debate.final_decision.confidence_score * 100).toFixed(0)}%</span>
                                <Badge className="bg-white text-black hover:bg-zinc-200 rounded-none text-[10px]">
                                    {debate.final_decision.action.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AgentResponse({ icon, name, content, isActive, isVisible }: any) {
    if (!isVisible) return null;

    return (
        <div className={`p-4 transition-all duration-500 ${isActive ? 'bg-zinc-900/50' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                    {icon}
                    <span className="text-xs font-bold tracking-wider">{name}</span>
                </div>
                <Badge variant="outline" className={`text-[10px] rounded-none border-zinc-700 ${isActive ? 'text-white' : 'text-zinc-600'}`}>
                    {content.stance.toUpperCase()}
                </Badge>
            </div>
            <p className="text-xs text-zinc-500 pl-5 border-l border-zinc-800 leading-relaxed">
                {content.argument}
            </p>
        </div>
    );
}
