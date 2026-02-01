"""
Pydantic models for Payment Operations System.
Defines Transaction, Decision, and CouncilDebate schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum
from datetime import datetime
import uuid


class TransactionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    UPI = "upi"
    NET_BANKING = "net_banking"
    WALLET = "wallet"


class ActionType(str, Enum):
    SWITCH_GATEWAY = "switch_gateway"
    INCREASE_RETRY = "increase_retry"
    BLOCK_MERCHANT = "block_merchant"
    REDUCE_LOAD = "reduce_load"
    NO_ACTION = "no_action"


class AgentSource(str, Enum):
    STUDENT = "student"
    TEACHER = "teacher"


class Transaction(BaseModel):
    """Represents a payment transaction."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float = Field(..., gt=0, description="Transaction amount")
    currency: str = Field(default="INR", description="Currency code")
    merchant_id: str = Field(..., description="Merchant identifier")
    bank_name: str = Field(..., description="Bank processing the transaction")
    payment_method: PaymentMethod = Field(..., description="Payment method used")
    status: TransactionStatus = Field(..., description="Transaction status")
    error_code: Optional[str] = Field(None, description="Error code if failed")
    latency_ms: int = Field(..., ge=0, description="Processing latency in milliseconds")
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Decision(BaseModel):
    """Represents a decision made by either Student or Teacher."""
    action: ActionType = Field(..., description="Action to take")
    reasoning: str = Field(..., description="Explanation for the decision")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence 0-1")
    agent_source: AgentSource = Field(..., description="Who made the decision")
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AgentArgument(BaseModel):
    """An agent's argument during council debate."""
    agent_name: str
    stance: str
    argument: str
    suggested_action: ActionType


class CouncilDebate(BaseModel):
    """Represents the full debate from the LLM Council."""
    risk_argument: AgentArgument
    growth_argument: AgentArgument
    manager_synthesis: str
    final_decision: Decision
    debate_duration_ms: int


class SystemMetrics(BaseModel):
    """Real-time system metrics for the dashboard."""
    total_transactions: int = 0
    successful_transactions: int = 0
    failed_transactions: int = 0
    success_rate: float = 0.0
    student_decisions: int = 0
    teacher_decisions: int = 0
    student_confidence: float = 0.0
    chaos_active: bool = False
    chaos_bank: Optional[str] = None


class WebSocketMessage(BaseModel):
    """Message format for WebSocket communication."""
    type: Literal["transaction", "decision", "metrics", "council_debate"]
    data: dict
    timestamp: datetime = Field(default_factory=datetime.now)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
