"""
FastAPI Application for Payment Operations System.
Orchestrates the Teacher-Student architecture with WebSocket real-time updates.
"""

import asyncio
import json
from typing import List, Set
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    Transaction, Decision, ActionType, AgentSource,
    SystemMetrics, WebSocketMessage, TransactionStatus
)
from simulator import TransactionSimulator
from council import get_council, LLMCouncil, MockCouncil
from student import OnlineLearner, StudentDecisionMaker


# ============== Configuration ==============

class AppConfig:
    TRANSACTION_INTERVAL_MS = 500  # Generate transaction every 500ms
    FAILURE_THRESHOLD = 5  # Failures before triggering Council
    STUDENT_CONFIDENCE_THRESHOLD = 0.90
    USE_MOCK_COUNCIL = False  # Set True for testing without Groq API


# ============== Global State ==============

class AppState:
    def __init__(self):
        self.simulator = TransactionSimulator(base_failure_rate=0.05)
        self.council = get_council(use_mock=AppConfig.USE_MOCK_COUNCIL)
        self.learner = OnlineLearner(confidence_threshold=AppConfig.STUDENT_CONFIDENCE_THRESHOLD)
        self.student_maker = StudentDecisionMaker(self.learner)
        
        self.metrics = SystemMetrics()
        self.recent_failures: List[Transaction] = []
        self.is_running = False
        self.connected_clients: Set[WebSocket] = set()


state = AppState()


# ============== Lifespan ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    print("🚀 Payment Ops System starting...")
    print(f"   Council: {'Mock' if isinstance(state.council, MockCouncil) else 'Groq LLM'}")
    print(f"   Student confidence threshold: {AppConfig.STUDENT_CONFIDENCE_THRESHOLD:.0%}")
    yield
    print("👋 Payment Ops System shutting down...")
    state.is_running = False


# ============== FastAPI App ==============

app = FastAPI(
    title="Payment Ops AI System",
    description="Teacher-Student architecture for intelligent payment operations",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== WebSocket Manager ==============

async def broadcast(message: WebSocketMessage):
    """Broadcast message to all connected WebSocket clients."""
    if not state.connected_clients:
        return
    
    data = json.dumps(message.model_dump(), default=str)
    disconnected = set()
    
    for client in state.connected_clients:
        try:
            await client.send_text(data)
        except Exception:
            disconnected.add(client)
    
    state.connected_clients -= disconnected


async def emit_transaction(txn: Transaction):
    """Emit a transaction event."""
    await broadcast(WebSocketMessage(
        type="transaction",
        data=txn.model_dump()
    ))


async def emit_decision(decision: Decision, transaction: Transaction):
    """Emit a decision event."""
    await broadcast(WebSocketMessage(
        type="decision",
        data={
            "decision": decision.model_dump(),
            "transaction_id": transaction.id,
            "brain": decision.agent_source.value
        }
    ))


async def emit_metrics():
    """Emit current metrics."""
    await broadcast(WebSocketMessage(
        type="metrics",
        data=state.metrics.model_dump()
    ))


async def emit_council_debate(debate):
    """Emit council debate for visualization."""
    await broadcast(WebSocketMessage(
        type="council_debate",
        data={
            "risk_argument": debate.risk_argument.model_dump(),
            "growth_argument": debate.growth_argument.model_dump(),
            "manager_synthesis": debate.manager_synthesis,
            "final_decision": debate.final_decision.model_dump(),
            "duration_ms": debate.debate_duration_ms
        }
    ))


# ============== Main Processing Loop ==============

async def process_transaction(txn: Transaction):
    """Process a single transaction through the Teacher-Student pipeline."""
    
    # Update metrics
    state.metrics.total_transactions += 1
    if txn.status == TransactionStatus.SUCCESS:
        state.metrics.successful_transactions += 1
    else:
        state.metrics.failed_transactions += 1
        state.recent_failures.append(txn)
    
    # Calculate success rate
    if state.metrics.total_transactions > 0:
        state.metrics.success_rate = (
            state.metrics.successful_transactions / state.metrics.total_transactions
        )
    
    # Emit transaction
    await emit_transaction(txn)
    
    # Only make decisions on failures
    if txn.status != TransactionStatus.FAILED:
        await emit_metrics()
        return
    
    # Check if Student is confident enough
    is_confident, predicted_action, confidence = state.learner.is_confident(txn)
    state.metrics.student_confidence = confidence
    
    if is_confident:
        # FAST PATH: Student makes the decision
        decision = Decision(
            action=predicted_action,
            reasoning=f"Student model confident ({confidence:.1%}) based on {state.learner.samples_seen} samples",
            confidence_score=confidence,
            agent_source=AgentSource.STUDENT
        )
        state.metrics.student_decisions += 1
        await emit_decision(decision, txn)
        
    elif len(state.recent_failures) >= AppConfig.FAILURE_THRESHOLD:
        # SLOW PATH: Council deliberation
        debate = state.council.debate(state.recent_failures)
        await emit_council_debate(debate)
        
        decision = debate.final_decision
        state.metrics.teacher_decisions += 1
        await emit_decision(decision, txn)
        
        # Train the Student on all recent failures
        for failed_txn in state.recent_failures:
            state.learner.learn(failed_txn, decision)
        
        # Clear failure buffer
        state.recent_failures = []
    
    await emit_metrics()


async def transaction_loop():
    """Main loop that generates and processes transactions."""
    state.is_running = True
    
    while state.is_running:
        txn = state.simulator.generate_transaction()
        await process_transaction(txn)
        await asyncio.sleep(AppConfig.TRANSACTION_INTERVAL_MS / 1000)


# ============== WebSocket Endpoint ==============

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time dashboard updates."""
    await websocket.accept()
    state.connected_clients.add(websocket)
    print(f"📡 Client connected. Total: {len(state.connected_clients)}")
    
    # Send current metrics on connect
    await websocket.send_text(json.dumps(
        WebSocketMessage(type="metrics", data=state.metrics.model_dump()).model_dump(),
        default=str
    ))
    
    # Start transaction loop if first client
    if len(state.connected_clients) == 1:
        asyncio.create_task(transaction_loop())
    
    try:
        while True:
            # Keep connection alive, handle any incoming messages
            data = await websocket.receive_text()
            # Could handle client commands here
            
    except WebSocketDisconnect:
        state.connected_clients.discard(websocket)
        print(f"📡 Client disconnected. Total: {len(state.connected_clients)}")
        
        # Stop loop if no clients
        if len(state.connected_clients) == 0:
            state.is_running = False


# ============== REST Endpoints ==============

class ChaosRequest(BaseModel):
    failure_rate: float = 0.8


@app.post("/chaos/{bank_name}")
async def inject_chaos(bank_name: str, request: ChaosRequest):
    """Inject chaos for a specific bank."""
    valid_banks = ["HDFC", "ICICI", "SBI", "Axis", "Kotak", "Yes Bank", "PNB", "BOB"]
    
    if bank_name not in valid_banks:
        raise HTTPException(status_code=400, detail=f"Invalid bank. Choose from: {valid_banks}")
    
    state.simulator.inject_chaos(bank_name, request.failure_rate)
    state.metrics.chaos_active = True
    state.metrics.chaos_bank = bank_name
    
    await emit_metrics()
    
    return {"status": "chaos_injected", "bank": bank_name, "failure_rate": request.failure_rate}


@app.post("/chaos/reset")
async def reset_chaos():
    """Remove all chaos injection."""
    state.simulator.remove_chaos()
    state.metrics.chaos_active = False
    state.metrics.chaos_bank = None
    
    await emit_metrics()
    
    return {"status": "chaos_removed"}


@app.get("/metrics")
async def get_metrics():
    """Get current system metrics."""
    return state.metrics.model_dump()


@app.get("/student/stats")
async def get_student_stats():
    """Get Student model statistics."""
    return state.learner.get_stats()


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "clients_connected": len(state.connected_clients),
        "is_running": state.is_running
    }


# ============== Run ==============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
