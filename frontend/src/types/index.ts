// Type definitions for Payment Ops System

export type TransactionStatus = 'success' | 'failed' | 'pending';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'upi' | 'net_banking' | 'wallet';
export type ActionType = 'switch_gateway' | 'increase_retry' | 'block_merchant' | 'reduce_load' | 'no_action';
export type AgentSource = 'student' | 'teacher';

export interface Transaction {
    id: string;
    amount: number;
    currency: string;
    merchant_id: string;
    bank_name: string;
    payment_method: PaymentMethod;
    status: TransactionStatus;
    error_code: string | null;
    latency_ms: number;
    timestamp: string;
}

export interface Decision {
    action: ActionType;
    reasoning: string;
    confidence_score: number;
    agent_source: AgentSource;
    timestamp: string;
}

export interface AgentArgument {
    agent_name: string;
    stance: string;
    argument: string;
    suggested_action: ActionType;
}

export interface CouncilDebate {
    risk_argument: AgentArgument;
    growth_argument: AgentArgument;
    manager_synthesis: string;
    final_decision: Decision;
    duration_ms: number;
}

export interface SystemMetrics {
    total_transactions: number;
    successful_transactions: number;
    failed_transactions: number;
    success_rate: number;
    student_decisions: number;
    teacher_decisions: number;
    student_confidence: number;
    chaos_active: boolean;
    chaos_bank: string | null;
}

export interface WebSocketMessage {
    type: 'transaction' | 'decision' | 'metrics' | 'council_debate';
    data: Transaction | Decision | SystemMetrics | CouncilDebate | { decision: Decision; transaction_id: string; brain: string } | { [key: string]: any };
    timestamp: string;
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'transaction' | 'decision' | 'council';
    brain?: AgentSource;
    action?: ActionType;
    confidence?: number;
    bankName?: string;
    status?: TransactionStatus;
    amount?: number;
    message: string;
}
