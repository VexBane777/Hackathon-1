import { useState } from 'react';
import { RotateCcw, AlertTriangle, Terminal, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = 'http://localhost:8000';
const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'BOB'];

interface SimulationControlProps {
    isChaosActive: boolean;
    chaosBank: string | null;
}

export function SimulationControl({ isChaosActive, chaosBank }: SimulationControlProps) {
    const [selectedBank, setSelectedBank] = useState('HDFC');
    const [failureRate, setFailureRate] = useState([0.8]);
    const [isLoading, setIsLoading] = useState(false);

    const injectChaos = async (bankOverride?: string, rateOverride?: number) => {
        const bank = bankOverride || selectedBank;
        const rate = rateOverride !== undefined ? rateOverride : failureRate[0];

        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/chaos/${bank}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ failure_rate: rate }),
            });
        } catch (error) {
            console.error('Simulation injection failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetSimulation = async () => {
        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/chaos/reset`, { method: 'POST' });
        } catch (error) {
            console.error('Simulation reset failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-black border border-zinc-800 rounded-none">
            <CardHeader className="py-3 border-b border-zinc-800">
                <CardTitle className="text-sm font-mono tracking-wider flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    SIMULATION CONTROL
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">

                {isChaosActive && (
                    <div className="p-3 bg-zinc-900 border border-zinc-700 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-white" />
                            <span className="text-xs font-mono text-white">
                                active_outage: <span className="font-bold">{chaosBank}</span>
                            </span>
                        </div>
                        <Badge variant="outline" className="border-white text-white text-[10px] rounded-none">
                            RUNNING
                        </Badge>
                    </div>
                )}

                {/* Bank Target */}
                <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Target System</label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                        <SelectTrigger className="h-9 bg-black border-zinc-700 rounded-none font-mono text-xs focus:ring-0 focus:ring-offset-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-zinc-800 rounded-none">
                            {BANKS.map(bank => (
                                <SelectItem key={bank} value={bank} className="font-mono text-xs focus:bg-zinc-900 focus:text-white cursor-pointer">
                                    {bank}_CORE_SYSTEM
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Failure Rate Slider */}
                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-500 uppercase tracking-widest">Error Probability</span>
                        <span className="text-white">{(failureRate[0] * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                        value={failureRate}
                        onValueChange={setFailureRate}
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="py-1 cursor-pointer"
                    />
                </div>

                {/* Execution Controls */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                        onClick={() => injectChaos()}
                        disabled={isLoading}
                        className="bg-white text-black hover:bg-zinc-200 rounded-none font-mono text-xs h-10 border border-transparent"
                    >
                        {isLoading ? "INITIALIZING..." : (
                            <>
                                <Play className="w-3 h-3 mr-2" />
                                EXECUTE
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={resetSimulation}
                        disabled={isLoading || !isChaosActive}
                        className="bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-none font-mono text-xs h-10"
                    >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        RESET
                    </Button>
                </div>

                {/* Presets */}
                <div className="pt-4 border-t border-zinc-900">
                    <p className="text-[10px] font-mono text-zinc-600 mb-2 uppercase tracking-widest">Quick Scenarios</p>
                    <div className="flex flex-wrap gap-2">
                        {['HDFC', 'SBI', 'ICICI'].map(bank => (
                            <button
                                key={bank}
                                onClick={() => {
                                    setSelectedBank(bank);
                                    setFailureRate([0.9]);
                                    injectChaos(bank, 0.9);
                                }}
                                className="px-2 py-1 text-[10px] font-mono border border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-white transition-colors"
                            >
                                {bank}_FAIL
                            </button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
