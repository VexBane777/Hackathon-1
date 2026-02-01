import { useWebSocket } from './hooks/useWebSocket';
import { Dashboard, CouncilRoom, SimulationControl } from './components';
import { Brain, Command } from 'lucide-react';

function App() {
  const {
    isConnected,
    metrics,
    logs,
    currentDebate,
    successRateHistory,
  } = useWebSocket();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white text-black">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-mono font-bold tracking-tight">
                PAYMENT_OPS_AI
              </h1>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                Knowledge Distillation Protocol v1.0
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Command className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-500">MODE:</span>
              <span className="text-white">AUTONOMOUS_LEARNING</span>
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">STUDENT_IQ:</span>
              <span className="text-white">{(metrics.student_confidence * 100).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden">
        {/* Left: Mission Control (Dashboard) */}
        <div className="flex-[2] min-w-0 flex flex-col gap-6">
          <Dashboard
            isConnected={isConnected}
            metrics={metrics}
            logs={logs}
            successRateHistory={successRateHistory}
          />
        </div>

        {/* Right: Intelligence Center */}
        <div className="flex-1 min-w-[350px] flex flex-col gap-6">
          <CouncilRoom debate={currentDebate} />
          <SimulationControl
            isChaosActive={metrics.chaos_active}
            chaosBank={metrics.chaos_bank}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-3 px-6 text-center">
        <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
          System: Groq Llama3-70b (Teacher) • River HoeffdingTree (Student)
        </p>
      </footer>
    </div>
  );
}

export default App;
