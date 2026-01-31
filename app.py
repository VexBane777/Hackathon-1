import os, asyncio, random, time
from datetime import datetime, timedelta
from typing import TypedDict, List, Dict, Any
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from groq import Groq
from langgraph.graph import StateGraph, END
from faker import Faker
import chromadb
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "gsk_yourkey")  # Fallback for demo
client = Groq(api_key=GROQ_API_KEY)
faker = Faker()

# Constants for revenue calculations
AVG_CART_VALUE = 45.0
PAYMENTS_PER_MIN = 50
ACTION_COST = 0.02  # Cost of API call

class PaymentSimulator:
    def __init__(self):
        self.issuers = ["visa_eu", "visa_us", "mastercard", "amex", "paypal"]
        self.baseline_failure = {"visa_eu": 0.03, "visa_us": 0.02, "mastercard": 0.04, "amex": 0.05, "paypal": 0.06}
        self.active_scenario = None
        self.scenario_end = None
    
    async def stream(self):
        while True:
            # Apply scenario degradation if active
            failure_rates = self.baseline_failure.copy()
            if self.active_scenario == "visa_eu_spike":
                failure_rates["visa_eu"] = 0.42
            elif self.active_scenario == "amex_retry_storm":
                failure_rates["amex"] = 0.38
            elif self.active_scenario == "paypal_latency":
                failure_rates["paypal"] = 0.35
            
            # Generate payment
            issuer = random.choice(self.issuers)
            amount = random.uniform(10, 500)
            status = "failed" if random.random() < failure_rates[issuer] else "success"
            error = random.choice(["timeout", "declined", "network"]) if status == "failed" else None
            
            yield {
                "timestamp": datetime.now(),
                "amount": round(amount, 2),
                "issuer": issuer,
                "status": status,
                "error_code": error,
                "latency_ms": random.randint(50, 2500) if issuer != "paypal" or self.active_scenario != "paypal_latency" else random.randint(2000, 4000)
            }
            await asyncio.sleep(1.0)  # 1 payment every 1 second (was 10 payments/sec)
            
    def trigger_scenario(self, scenario: str):
        self.active_scenario = scenario
        self.scenario_end = datetime.now() + timedelta(seconds=120)  # Auto-reset after 2 min
    
    def reset_scenario(self):
        if self.scenario_end and datetime.now() > self.scenario_end:
            self.active_scenario = None

class AgentState(TypedDict):
    payments: List[Dict]
    failure_patterns: Dict[str, Dict[str, float]]  # issuer → error → failure_rate
    hypothesis: str
    confidence: float
    proposed_action: Dict[str, Any] | None
    requires_approval: bool
    last_action_time: float | None
    counterfactual_metrics: Dict[str, float] | None
    revenue_metrics: Dict[str, float] | None
    war_room_debate: Dict[str, str] | None

class Action(BaseModel):
    type: str = Field(..., description="reroute | retry_adjust | pause_path")
    target: str = Field(..., description="issuer or payment path")
    to_value: str | int | None = Field(None, description="new value (e.g., backup PSP)")
    confidence: float = Field(..., ge=0, le=1)
    avg_amount: float = Field(..., ge=0)
    
    @property
    def requires_human_approval(self) -> bool:
        return self.confidence < 0.85 or self.avg_amount >= 100.0

# ChromaDB setup for memory (embedded)
chroma_client = chromadb.PersistentClient(path="./chroma_data")  # Use persistent client with local path

# Check if collection exists, if not create it
try:
    collection = chroma_client.get_collection(name="payment_actions")
except:
    collection = chroma_client.create_collection(name="payment_actions", metadata={"hnsw:space": "cosine"})

def observe_node(state: AgentState):
    recent = state["payments"][-100:] if len(state["payments"]) > 100 else state["payments"]
    patterns = {}
    
    for issuer in set(p["issuer"] for p in recent):
        issuer_payments = [p for p in recent if p["issuer"] == issuer]
        failure_rate = len([p for p in issuer_payments if p["status"] == "failed"]) / len(issuer_payments)
        error_dist = {}
        for error in set(p["error_code"] for p in issuer_payments if p["error_code"]):
            error_dist[error] = len([p for p in issuer_payments if p["error_code"] == error]) / len(issuer_payments)
        patterns[issuer] = {"failure_rate": failure_rate, "errors": error_dist}
    
    return {"failure_patterns": patterns}

def reason_node(state: AgentState):
    patterns = state["failure_patterns"]
    
    # Qwen via Groq for reasoning (optimized prompt)
    prompt = f"""Analyze payment failure patterns. Be concise.
    
    Patterns: {patterns}
    
    Output format (JSON only):
    {{"hypothesis": "1-sentence root cause", "confidence": 0.0-1.0, "key_evidence": "most significant pattern"}}"""
    
    try:
        response = client.chat.completions.create(
            model="qwen2-72b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150
        )
        import json
        result = json.loads(response.choices[0].message.content)
        return {
            "hypothesis": result["hypothesis"],
            "confidence": min(0.95, float(result["confidence"])),  # Cap at 95% for safety
            "key_evidence": result["key_evidence"]
        }
    except:
        # Fallback reasoning (no LLM dependency for demo)
        for issuer, data in patterns.items():
            if data["failure_rate"] > 0.35:
                return {
                    "hypothesis": f"{issuer} experiencing severe degradation",
                    "confidence": 0.88,
                    "key_evidence": f"{issuer} failure rate {data['failure_rate']:.0%}"
                }
        return {"hypothesis": "Normal operation", "confidence": 0.92, "key_evidence": "Stable failure rates"}

def decide_node(state: AgentState):
    if state["confidence"] < 0.7 or state["hypothesis"] == "Normal operation":
        return {"proposed_action": None, "requires_approval": False}
    
    # Extract degraded issuer
    degraded_issuer = None
    for issuer, data in state["failure_patterns"].items():
        if data["failure_rate"] > 0.35:
            degraded_issuer = issuer
            break
    
    if not degraded_issuer:
        return {"proposed_action": None, "requires_approval": False}
    
    # Calculate avg amount for last 50 payments of this issuer
    recent_payments = [p for p in state["payments"][-50:] if p["issuer"] == degraded_issuer]
    avg_amount = sum(p["amount"] for p in recent_payments) / len(recent_payments) if recent_payments else 50.0
    
    # Propose action
    action = Action(
        type="reroute",
        target=degraded_issuer,
        to_value="stripe_backup" if degraded_issuer.startswith("visa") else "adyen_backup",
        confidence=state["confidence"],
        avg_amount=avg_amount
    )
    
    # Check memory for similar past actions
    past_actions = collection.query(
        query_texts=[f"{degraded_issuer} degradation"],
        n_results=3
    )
    
    return {
        "proposed_action": {
            "type": action.type,
            "target": action.target,
            "to_value": action.to_value,
            "confidence": action.confidence,
            "avg_amount": action.avg_amount,
            "requires_approval": action.requires_human_approval,
            "past_results": past_actions["documents"][0] if past_actions["documents"] else []
        },
        "requires_approval": action.requires_human_approval
    }

def act_node(state: AgentState):
    if not state.get("proposed_action") or not st.session_state.get("action_approved", False):
        return state
    
    action = state["proposed_action"]
    # SIMULATE action execution (in real system would update routing rules)
    st.session_state.last_action = {
        "timestamp": time.time(),
        "action": action,
        "pre_success_rate": st.session_state.get("current_success_rate", 0.95)
    }
    
    # Store in memory for learning
    collection.add(
        documents=[f"Rerouted {action['target']} to {action['to_value']} during degradation"],
        metadatas=[{"success_uplift": 0.07, "timestamp": time.time()}],  # Simulated 7% uplift
        ids=[f"action_{int(time.time())}"]
    )
    
    return state

def simulate_counterfactual(payments: List[Dict], action: Dict[str, Any]) -> Dict[str, float]:
    """
    Simulate the impact of an action on the last 100 payments
    """
    recent_payments = payments[-100:] if len(payments) > 100 else payments

    # Calculate current success rate
    current_success_rate = len([p for p in recent_payments if p["status"] == "success"]) / len(recent_payments) if recent_payments else 0.95

    # Simulate the effect of the action
    # For reroute action, assume it improves success rate for the affected issuer
    if action["type"] == "reroute":
        affected_issuer = action["target"]
        # Find payments from the affected issuer
        issuer_payments = [p for p in recent_payments if p["issuer"] == affected_issuer]

        if issuer_payments:
            # Estimate improvement based on current failure rate of this issuer
            issuer_failures = len([p for p in issuer_payments if p["status"] == "failed"])
            current_issuer_failure_rate = issuer_failures / len(issuer_payments)

            # Assume the action reduces failure rate by 70% of current failure rate
            projected_improvement = current_issuer_failure_rate * 0.7
            projected_new_issuer_success_rate = min(1.0, (len(issuer_payments) - issuer_failures) / len(issuer_payments) + projected_improvement)

            # Calculate new overall success rate
            unaffected_payments = [p for p in recent_payments if p["issuer"] != affected_issuer]
            unaffected_successes = len([p for p in unaffected_payments if p["status"] == "success"])

            projected_affected_successes = len(issuer_payments) * projected_new_issuer_success_rate
            projected_total_successes = unaffected_successes + projected_affected_successes
            projected_success_rate = projected_total_successes / len(recent_payments)
        else:
            projected_success_rate = current_success_rate
    else:
        projected_success_rate = current_success_rate

    # Calculate uplift percentage
    uplift_pct = ((projected_success_rate - current_success_rate) / current_success_rate * 100) if current_success_rate > 0 else 0

    # Calculate revenue impact per minute
    # Assuming 50 payments per minute
    current_revenue_loss_per_min = (1 - current_success_rate) * PAYMENTS_PER_MIN * AVG_CART_VALUE
    projected_revenue_loss_per_min = (1 - projected_success_rate) * PAYMENTS_PER_MIN * AVG_CART_VALUE
    revenue_impact_per_min = current_revenue_loss_per_min - projected_revenue_loss_per_min

    return {
        "current_success_rate": current_success_rate,
        "projected_success_rate": projected_success_rate,
        "uplift_pct": uplift_pct,
        "revenue_impact_per_min": revenue_impact_per_min
    }

def calculate_revenue_metrics(payments: List[Dict], last_action=None) -> Dict[str, float]:
    """
    Calculate revenue metrics based on payment data
    """
    recent_payments = payments[-200:] if len(payments) > 200 else payments

    # Calculate current lost revenue per minute
    current_failure_rate = len([p for p in recent_payments if p["status"] == "failed"]) / len(recent_payments) if recent_payments else 0.05
    current_lost_revenue_per_min = current_failure_rate * PAYMENTS_PER_MIN * AVG_CART_VALUE

    # Calculate recovered revenue since last action
    recovered_since_last_action = 0.0
    if last_action:
        # This would be calculated based on actual performance after action
        # For demo purposes, we'll estimate based on success rate improvement
        if len(recent_payments) > 50:  # Need enough data to compare
            pre_action_payments = recent_payments[:50]  # Before action
            post_action_payments = recent_payments[50:]  # After action
            pre_action_success_rate = len([p for p in pre_action_payments if p["status"] == "success"]) / len(pre_action_payments) if pre_action_payments else 0.95
            post_action_success_rate = len([p for p in post_action_payments if p["status"] == "success"]) / len(post_action_payments) if post_action_payments else 0.95

            pre_action_lost_revenue = (1 - pre_action_success_rate) * PAYMENTS_PER_MIN * AVG_CART_VALUE
            post_action_lost_revenue = (1 - post_action_success_rate) * PAYMENTS_PER_MIN * AVG_CART_VALUE
            recovered_since_last_action = (pre_action_lost_revenue - post_action_lost_revenue) * 5  # 5 minutes since action

    # Calculate total recovered revenue
    total_recovered = getattr(st.session_state, 'total_recovered', 0.0) + recovered_since_last_action

    # Calculate ROI
    action_count = getattr(st.session_state, 'action_count', 0)
    total_action_cost = action_count * ACTION_COST
    roi = (total_recovered / total_action_cost) if total_action_cost > 0 else 0

    return {
        "current_lost_revenue_per_min": current_lost_revenue_per_min,
        "recovered_since_last_action": recovered_since_last_action,
        "total_recovered": total_recovered,
        "roi": roi
    }

def run_war_room_debate(patterns: Dict, action: Dict[str, Any]) -> Dict[str, str]:
    """
    Simulate a debate between three specialized agents
    """
    # Detective Agent: Analyzes root cause
    detective_prompt = f"""
    Analyze payment failure patterns and identify root cause.
    Patterns: {patterns}

    Respond in format:
    Detective: "[Root cause analysis]"
    """

    # Risk Officer: Evaluates downside risk
    risk_prompt = f"""
    Evaluate the financial risk of this action.
    Action: {action}
    Current failure patterns: {patterns}

    Respond in format:
    Risk Officer: "[Risk assessment with dollar amount]"
    """

    # Economist: Calculates upside potential
    econ_prompt = f"""
    Calculate the economic benefit of this action.
    Action: {action}
    Current failure patterns: {patterns}

    Respond in format:
    Economist: "[Economic benefit with dollar amount]"
    """

    try:
        # Try to get responses from Groq
        detective_response = client.chat.completions.create(
            model="qwen2-72b-instruct",
            messages=[{"role": "user", "content": detective_prompt}],
            temperature=0.3,
            max_tokens=100
        )
        detective_analysis = detective_response.choices[0].message.content

        risk_response = client.chat.completions.create(
            model="qwen2-72b-instruct",
            messages=[{"role": "user", "content": risk_prompt}],
            temperature=0.3,
            max_tokens=100
        )
        risk_analysis = risk_response.choices[0].message.content

        econ_response = client.chat.completions.create(
            model="qwen2-72b-instruct",
            messages=[{"role": "user", "content": econ_prompt}],
            temperature=0.3,
            max_tokens=100
        )
        econ_analysis = econ_response.choices[0].message.content

        return {
            "detective": detective_analysis,
            "risk_officer": risk_analysis,
            "economist": econ_analysis
        }
    except:
        # Fallback reasoning when Groq fails
        # Find the issuer with highest failure rate
        worst_issuer = ""
        worst_rate = 0
        for issuer, data in patterns.items():
            if data["failure_rate"] > worst_rate:
                worst_rate = data["failure_rate"]
                worst_issuer = issuer

        return {
            "detective": f"Detective: Root cause = {worst_issuer} failure rate at {worst_rate:.1%}",
            "risk_officer": f"Risk Officer: Downside exposure: ${(worst_rate * PAYMENTS_PER_MIN * AVG_CART_VALUE):.0f}/min if no action",
            "economist": f"Economist: Upside: ${abs(worst_rate * PAYMENTS_PER_MIN * AVG_CART_VALUE * 0.7):.0f}/min saved if successful"
        }

def learn_node(state: AgentState):
    # Simulate outcome evaluation (in real system would measure actual success rate change)
    if (hasattr(st.session_state, 'last_action') and
        st.session_state.last_action is not None and
        time.time() - st.session_state.last_action["timestamp"] > 10):
        # Assume 7% uplift for demo
        uplift = 0.07
        st.session_state.total_recovered = getattr(st.session_state, 'total_recovered', 0) + (uplift * PAYMENTS_PER_MIN * AVG_CART_VALUE)  # 50 payments * $45 avg * uplift
        st.session_state.action_count = getattr(st.session_state, 'action_count', 0) + 1

    return state

def main():
    st.set_page_config(layout="wide", page_title="PayPulse Agent")
    st.title("🚀 PayPulse: Agentic Payment Operations")

    # Initialize session state
    if "simulator" not in st.session_state:
        st.session_state.simulator = PaymentSimulator()
        st.session_state.payments = []
        st.session_state.current_success_rate = 0.95
        st.session_state.total_recovered = 0.0
        st.session_state.action_count = 0
        st.session_state.action_approved = False
        st.session_state.last_action = None

    # Calculate revenue metrics
    revenue_metrics = calculate_revenue_metrics(st.session_state.payments, st.session_state.last_action)

    # Display main revenue dashboard - single column showing total saved
    st.subheader(f"💸 Total Revenue Recovered: ${revenue_metrics['total_recovered']:,.0f} (ROI: {revenue_metrics['roi']:.0f}x)")

    # Sidebar controls
    with st.sidebar:
        st.header("🤖 War Room Agents")
        detective_placeholder = st.empty()
        risk_placeholder = st.empty()
        economist_placeholder = st.empty()

        st.markdown("---")
        st.header("🎛️ Control Panel")
        scenario = st.selectbox("Trigger Failure Scenario",
                               ["Normal Operation", "Visa EU Spike (42% failures)", "Amex Retry Storm", "PayPal Latency"])
        if scenario != "Normal Operation":
            mapping = {
                "Visa EU Spike (42% failures)": "visa_eu_spike",
                "Amex Retry Storm": "amex_retry_storm",
                "PayPal Latency": "paypal_latency"
            }
            st.session_state.simulator.trigger_scenario(mapping[scenario])
            st.success(f"🔥 {scenario} activated! Watch agent respond...")

        st.markdown("---")
        st.subheader("Guardrails")
        st.markdown("✅ Auto-approve: <$100 payments + >85% confidence")
        st.markdown("🛑 Human approval: ≥$100 OR confidence <85%")
        st.markdown("↩️ 60-sec rollback window after any action")

    # Main dashboard columns
    col1, col2 = st.columns([2, 1])

    # Left column: Live chart + payment stream
    with col1:
        # Success rate chart (animated)
        chart_placeholder = st.empty()
        stream_placeholder = st.empty()

        # Right column: Agent reasoning + actions
        with col2:
            st.subheader("🧠 Agent Reasoning")
            confidence_placeholder = st.empty()
            hypothesis_placeholder = st.empty()
            evidence_placeholder = st.empty()

            st.markdown("---")
            st.subheader("⚡ Proposed Action")
            action_placeholder = st.empty()
            # Placeholder for counterfactual metrics
            counterfactual_placeholder = st.container()
            approval_placeholder = st.empty()
    
    # Start async simulation loop
    async def run_simulation():
        payment_gen = st.session_state.simulator.stream()
        
        # Build LangGraph workflow ONCE
        if "workflow" not in st.session_state:
            workflow = StateGraph(AgentState)
            workflow.add_node("observe", observe_node)
            workflow.add_node("reason", reason_node)
            workflow.add_node("decide", decide_node)
            workflow.add_node("act", act_node)
            workflow.add_node("learn", learn_node)
            workflow.set_entry_point("observe")
            workflow.add_edge("observe", "reason")
            workflow.add_edge("reason", "decide")
            workflow.add_edge("decide", "act")
            workflow.add_edge("act", "learn")
            workflow.add_edge("learn", END)
            st.session_state.workflow = workflow.compile()
        
        # Main loop
        while True:
            # Get next payment
            payment = await payment_gen.__anext__()
            st.session_state.payments.append(payment)
            
            # Update success rate (sliding window)
            recent = st.session_state.payments[-200:] if len(st.session_state.payments) > 200 else st.session_state.payments
            success_rate = len([p for p in recent if p["status"] == "success"]) / len(recent) if recent else 0.95
            st.session_state.current_success_rate = success_rate
            
            # Run agent every 5 payments (since we're now processing 1 per second)
            if len(st.session_state.payments) % 5 == 0:
                state = {
                    "payments": st.session_state.payments,
                    "failure_patterns": {},
                    "hypothesis": "",
                    "confidence": 0.0,
                    "proposed_action": None,
                    "requires_approval": False,
                    "last_action_time": None,
                    "counterfactual_metrics": None,
                    "revenue_metrics": None,
                    "war_room_debate": None
                }
                result = st.session_state.workflow.invoke(state)

                # Update UI elements
                confidence_placeholder.progress(result["confidence"], f"Confidence: {result['confidence']:.0%}")
                hypothesis_placeholder.info(f"**Hypothesis:** {result['hypothesis']}")
                evidence_placeholder.caption(f"🔍 Key evidence: {result.get('key_evidence', 'N/A')}")

                if result.get("proposed_action"):
                    action = result["proposed_action"]
                    action_text = f"🔄 Reroute **{action['target']}** → `{action['to_value']}`"
                    action_placeholder.warning(action_text)

                    # Show past results from memory
                    if action.get("past_results"):
                        for past in action["past_results"][:2]:
                            st.caption(f"💡 Past result: {past}")

                    # Calculate and display counterfactual metrics
                    if action.get("type") and len(st.session_state.payments) >= 10:
                        counterfactual_metrics = simulate_counterfactual(st.session_state.payments, action)

                        # Update the counterfactual placeholder
                        with counterfactual_placeholder:
                            col_cf1, col_cf2 = st.columns(2)
                            with col_cf1:
                                st.metric(
                                    label="Projected Success",
                                    value=f"{counterfactual_metrics['projected_success_rate']:.1%}",
                                    delta=f"{counterfactual_metrics['uplift_pct']:+.1f}%"
                                )
                            with col_cf2:
                                st.metric(
                                    label="💰 Revenue Saved",
                                    value=f"${counterfactual_metrics['revenue_impact_per_min']:.0f}/min"
                                )

                    # Run war room debate
                    war_room_debate = run_war_room_debate(result["failure_patterns"], result["proposed_action"] or {})
                    detective_placeholder.write(f"🕵️ {war_room_debate['detective']}")
                    risk_placeholder.write(f"🛡️ {war_room_debate['risk_officer']}")
                    economist_placeholder.write(f"📊 {war_room_debate['economist']}")

                    # Approval controls
                    if action["requires_approval"]:
                        if approval_placeholder.button("✅ APPROVE ACTION (Human Required)", type="primary", key=f"approve_btn_{len(st.session_state.payments)}"):
                            st.session_state.action_approved = True
                            st.rerun()
                    else:
                        approval_placeholder.success("✅ AUTO-APPROVED (within guardrails)")
                        st.session_state.action_approved = True
                
                # Handle rollback window
                if st.session_state.last_action and time.time() - st.session_state.last_action["timestamp"] < 60:
                    if st.button("↩️ ROLLBACK LAST ACTION (60s window)", key=f"rollback_btn_{len(st.session_state.payments)}"):
                        st.session_state.last_action = None
                        st.session_state.action_approved = False
                        st.success("Action rolled back!")
            
            # Update chart every 5 payments (since we're now processing 1 per second)
            if len(st.session_state.payments) % 5 == 0:
                df = pd.DataFrame(st.session_state.payments[-100:])
                if not df.empty:
                    # Calculate success rate in windows
                    df_success = df[df["status"]=="success"].copy()
                    if not df_success.empty:
                        # Create bins for grouping
                        df_success['bin'] = df_success.index // 10
                        success_counts = df_success.groupby('bin').size()

                        # Create x values for the plot
                        x_values = list(range(len(success_counts)))
                        y_values = success_counts.values / 10  # Divide by 10 to get rate

                        fig = go.Figure()
                        fig.add_trace(go.Scatter(
                            x=x_values,
                            y=y_values,
                            mode='lines+markers',
                            name='Success Rate',
                            line=dict(color='#00C853', width=3)
                        ))
                    else:
                        # If no successes, create empty plot with zeros
                        fig = go.Figure()
                        fig.add_trace(go.Scatter(
                            x=[0],
                            y=[0],
                            mode='lines+markers',
                            name='Success Rate',
                            line=dict(color='#00C853', width=3)
                        ))
                else:
                    # If df is empty, create empty plot
                    fig = go.Figure()
                    fig.add_trace(go.Scatter(
                        x=[0],
                        y=[0],
                        mode='lines+markers',
                        name='Success Rate',
                        line=dict(color='#00C853', width=3)
                    ))

                fig.update_layout(
                    title='Live Payment Success Rate (10-sec windows)',
                    yaxis_range=[0.0, 1.0],
                    height=300,
                    margin=dict(l=0, r=0, t=30, b=0)
                )
                chart_placeholder.plotly_chart(fig, use_container_width=True, key=f"success_rate_chart_{len(st.session_state.payments)}")
            
            # Update payment stream table
            stream_df = pd.DataFrame(st.session_state.payments[-20:][::-1])
            stream_placeholder.dataframe(
                stream_df[["timestamp", "issuer", "amount", "status", "error_code"]].head(10),
                height=300,
                use_container_width=True
            )

            # Auto-reset scenarios
            st.session_state.simulator.reset_scenario()
            await asyncio.sleep(0.05)  # Prevent UI lock
    
    # Run async loop
    asyncio.run(run_simulation())

if __name__ == "__main__":
    main()
