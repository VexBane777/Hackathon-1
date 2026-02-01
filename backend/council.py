"""
LLM Council for Payment Operations System.
Implements a multi-agent debate system using Groq API.
"""

import os
import json
import time
from typing import List, Optional
from dotenv import load_dotenv
from groq import Groq

from models import (
    Transaction, Decision, ActionType, AgentSource,
    AgentArgument, CouncilDebate
)

load_dotenv()


class LLMCouncil:
    """
    Multi-agent LLM Council that debates payment operation decisions.
    
    Three agents participate:
    - Risk Agent: Paranoid, prefers blocking suspicious activity
    - Growth Agent: Revenue-focused, wants to retry and recover
    - Manager Agent: Synthesizes both views for final decision
    """

    RISK_AGENT_PROMPT = """You are the RISK AGENT in a payment operations council.
Your personality: Paranoid, security-focused, hates fraud.
Your priority: Protect the system from fraud and abuse at all costs.
You would rather block a legitimate transaction than let a fraudulent one through.

Analyze the failed transactions and argue for the most CONSERVATIVE action.
Consider: fraud patterns, unusual amounts, bank reliability, error patterns.

Respond in JSON format:
{
    "stance": "conservative/moderate/aggressive",
    "argument": "Your reasoning in 2-3 sentences",
    "suggested_action": "switch_gateway|increase_retry|block_merchant|reduce_load|no_action"
}"""

    GROWTH_AGENT_PROMPT = """You are the GROWTH AGENT in a payment operations council.
Your personality: Revenue-obsessed, hates lost sales, aggressive optimizer.
Your priority: Maximize successful transactions and revenue recovery.
Every failed transaction is lost money that must be recovered.

Analyze the failed transactions and argue for the most AGGRESSIVE recovery action.
Consider: revenue impact, retry success probability, customer experience.

Respond in JSON format:
{
    "stance": "conservative/moderate/aggressive",
    "argument": "Your reasoning in 2-3 sentences",
    "suggested_action": "switch_gateway|increase_retry|block_merchant|reduce_load|no_action"
}"""

    MANAGER_AGENT_PROMPT = """You are the MANAGER AGENT in a payment operations council.
You must synthesize the arguments from the Risk Agent and Growth Agent.
Make a balanced decision that optimizes for both security AND revenue.

Risk Agent's position:
{risk_argument}

Growth Agent's position:
{growth_argument}

Failed transaction context:
- Total failed: {failed_count}
- Common error: {common_error}
- Affected banks: {affected_banks}
- Total amount at risk: ₹{total_amount}

Make the FINAL decision. Respond in JSON format:
{
    "synthesis": "Your balanced reasoning in 2-3 sentences",
    "final_action": "switch_gateway|increase_retry|block_merchant|reduce_load|no_action",
    "confidence": 0.0-1.0
}"""

    def __init__(self, model: str = "llama3-70b-8192"):
        """
        Initialize the LLM Council.
        
        Args:
            model: Groq model to use for inference
        """
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=api_key)
        self.model = model
        
    def _call_agent(self, system_prompt: str, context: str) -> dict:
        """Make a single agent call to Groq."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": context}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"Agent call failed: {e}")
            return {
                "stance": "moderate",
                "argument": "Unable to analyze due to API error",
                "suggested_action": "no_action"
            }
    
    def _prepare_context(self, failed_transactions: List[Transaction]) -> str:
        """Prepare transaction context for agents."""
        if not failed_transactions:
            return "No failed transactions to analyze."
        
        context_lines = ["Failed Transaction Analysis:"]
        for i, txn in enumerate(failed_transactions[:10], 1):  # Limit to 10 for context
            context_lines.append(
                f"{i}. Bank: {txn.bank_name}, Amount: ₹{txn.amount}, "
                f"Error: {txn.error_code}, Method: {txn.payment_method.value}"
            )
        
        # Summary stats
        total_amount = sum(t.amount for t in failed_transactions)
        banks = set(t.bank_name for t in failed_transactions)
        errors = [t.error_code for t in failed_transactions if t.error_code]
        common_error = max(set(errors), key=errors.count) if errors else "Unknown"
        
        context_lines.append(f"\nSummary: {len(failed_transactions)} failures, "
                           f"₹{total_amount:.2f} at risk, Banks: {', '.join(banks)}")
        
        return "\n".join(context_lines)
    
    def debate(self, failed_transactions: List[Transaction]) -> CouncilDebate:
        """
        Run a full council debate on the failed transactions.
        
        Args:
            failed_transactions: List of failed Transaction objects
            
        Returns:
            CouncilDebate with all agent arguments and final decision
        """
        start_time = time.time()
        context = self._prepare_context(failed_transactions)
        
        # Get Risk Agent's view
        risk_response = self._call_agent(self.RISK_AGENT_PROMPT, context)
        risk_arg = AgentArgument(
            agent_name="Risk Agent",
            stance=risk_response.get("stance", "moderate"),
            argument=risk_response.get("argument", "No argument provided"),
            suggested_action=ActionType(risk_response.get("suggested_action", "no_action"))
        )
        
        # Get Growth Agent's view
        growth_response = self._call_agent(self.GROWTH_AGENT_PROMPT, context)
        growth_arg = AgentArgument(
            agent_name="Growth Agent",
            stance=growth_response.get("stance", "moderate"),
            argument=growth_response.get("argument", "No argument provided"),
            suggested_action=ActionType(growth_response.get("suggested_action", "no_action"))
        )
        
        # Manager synthesizes
        total_amount = sum(t.amount for t in failed_transactions)
        banks = set(t.bank_name for t in failed_transactions)
        errors = [t.error_code for t in failed_transactions if t.error_code]
        common_error = max(set(errors), key=errors.count) if errors else "Unknown"
        
        manager_prompt = self.MANAGER_AGENT_PROMPT.format(
            risk_argument=f"{risk_arg.stance}: {risk_arg.argument}",
            growth_argument=f"{growth_arg.stance}: {growth_arg.argument}",
            failed_count=len(failed_transactions),
            common_error=common_error,
            affected_banks=", ".join(banks),
            total_amount=total_amount
        )
        
        manager_response = self._call_agent(manager_prompt, context)
        
        # Build final decision
        final_decision = Decision(
            action=ActionType(manager_response.get("final_action", "no_action")),
            reasoning=manager_response.get("synthesis", "No synthesis provided"),
            confidence_score=float(manager_response.get("confidence", 0.5)),
            agent_source=AgentSource.TEACHER
        )
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        return CouncilDebate(
            risk_argument=risk_arg,
            growth_argument=growth_arg,
            manager_synthesis=manager_response.get("synthesis", ""),
            final_decision=final_decision,
            debate_duration_ms=duration_ms
        )


class MockCouncil:
    """Mock council for testing without API calls."""
    
    def debate(self, failed_transactions: List[Transaction]) -> CouncilDebate:
        """Return a mock debate result."""
        import random
        
        actions = list(ActionType)
        selected_action = random.choice(actions)
        
        return CouncilDebate(
            risk_argument=AgentArgument(
                agent_name="Risk Agent",
                stance="conservative",
                argument="High failure rate detected. Recommend blocking to prevent fraud.",
                suggested_action=ActionType.BLOCK_MERCHANT
            ),
            growth_argument=AgentArgument(
                agent_name="Growth Agent",
                stance="aggressive",
                argument="Revenue at risk! We must retry these transactions immediately.",
                suggested_action=ActionType.INCREASE_RETRY
            ),
            manager_synthesis="Balanced approach: switch gateway to recover revenue while monitoring for fraud.",
            final_decision=Decision(
                action=selected_action,
                reasoning="Synthesized decision based on risk-reward analysis",
                confidence_score=random.uniform(0.6, 0.95),
                agent_source=AgentSource.TEACHER
            ),
            debate_duration_ms=random.randint(500, 2000)
        )


def get_council(use_mock: bool = False) -> LLMCouncil | MockCouncil:
    """Factory function to get appropriate council implementation."""
    if use_mock or not os.getenv("GROQ_API_KEY"):
        print("⚠️  Using MockCouncil (no GROQ_API_KEY found)")
        return MockCouncil()
    return LLMCouncil()


if __name__ == "__main__":
    from simulator import TransactionSimulator
    
    # Test with mock council
    sim = TransactionSimulator()
    sim.inject_chaos("HDFC", 0.9)
    
    failed = [t for t in sim.generate_batch(20) if t.status.value == "failed"]
    print(f"Testing council with {len(failed)} failed transactions...")
    
    council = get_council(use_mock=True)
    debate = council.debate(failed)
    
    print(f"\n🔴 Risk Agent ({debate.risk_argument.stance}):")
    print(f"   {debate.risk_argument.argument}")
    print(f"   Suggests: {debate.risk_argument.suggested_action.value}")
    
    print(f"\n🟢 Growth Agent ({debate.growth_argument.stance}):")
    print(f"   {debate.growth_argument.argument}")
    print(f"   Suggests: {debate.growth_argument.suggested_action.value}")
    
    print(f"\n🔵 Manager Decision:")
    print(f"   {debate.manager_synthesis}")
    print(f"   Action: {debate.final_decision.action.value}")
    print(f"   Confidence: {debate.final_decision.confidence_score:.2%}")
