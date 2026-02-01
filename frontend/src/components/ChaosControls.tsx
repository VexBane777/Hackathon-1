import { useState } from 'react';
import { Flame, RotateCcw, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const API_BASE = 'http://localhost:8000';
const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak', 'Yes Bank', 'PNB', 'BOB'];

interface ChaosControlsProps {
    isChaosActive: boolean;
    chaosBank: string | null;
}

export function ChaosControls({ isChaosActive, chaosBank }: ChaosControlsProps) {
    const [selectedBank, setSelectedBank] = useState('HDFC');
    const [failureRate, setFailureRate] = useState([0.8]);
    const [isLoading, setIsLoading] = useState(false);

    const injectChaos = async () => {
        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/chaos/${selectedBank}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ failure_rate: failureRate[0] }),
            });
        } catch (error) {
            console.error('Chaos injection failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetChaos = async () => {
        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/chaos/reset`, { method: 'POST' });
        } catch (error) {
            console.error('Chaos reset failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-card/50 backdrop-blur">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Chaos Controls
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {isChaosActive && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
                        <span className="text-sm">
                            <strong className="text-destructive">{chaosBank}</strong> outage active
                        </span>
                    </div>
                )}

                {/* Bank Selection */}
                <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Target Bank</label>
                    <Select value={selectedBank} onValueChange={setSelectedBank}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {BANKS.map(bank => (
                                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Failure Rate */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Failure Rate</span>
                        <Badge variant="destructive" className="text-xs">
                            {(failureRate[0] * 100).toFixed(0)}%
                        </Badge>
                    </div>
                    <Slider
                        value={failureRate}
                        onValueChange={setFailureRate}
                        min={0.1}
                        max={1}
                        step={0.1}
                        className="py-2"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <Button
                        onClick={injectChaos}
                        disabled={isLoading}
                        className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Flame className="w-4 h-4 mr-1.5" />
                                Trigger
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={resetChaos}
                        disabled={isLoading || !isChaosActive}
                    >
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
                    <div className="flex flex-wrap gap-1.5">
                        {['HDFC', 'SBI', 'ICICI'].map(bank => (
                            <Button
                                key={bank}
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                    setSelectedBank(bank);
                                    setFailureRate([0.9]);
                                    setTimeout(injectChaos, 50);
                                }}
                            >
                                💥 {bank}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
