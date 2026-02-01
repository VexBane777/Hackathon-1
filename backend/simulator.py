"""
Transaction Simulator for Payment Operations System.
Generates realistic mock payment transactions with chaos injection capability.
"""

import random
from typing import Generator, Dict, Optional
from models import Transaction, TransactionStatus, PaymentMethod


class TransactionSimulator:
    """Generates random payment transactions with configurable chaos injection."""

    BANKS = ["HDFC", "ICICI", "SBI", "Axis", "Kotak", "Yes Bank", "PNB", "BOB"]
    MERCHANTS = ["Amazon", "Flipkart", "Swiggy", "Zomato", "Uber", "Ola", "BigBasket", "Myntra"]
    ERROR_CODES = ["E001_TIMEOUT", "E002_INSUFFICIENT_FUNDS", "E003_BANK_DECLINED", 
                   "E004_NETWORK_ERROR", "E005_FRAUD_SUSPECTED", "E006_LIMIT_EXCEEDED"]
    
    def __init__(self, base_failure_rate: float = 0.05):
        """
        Initialize the simulator.
        
        Args:
            base_failure_rate: Base probability of transaction failure (0-1)
        """
        self.base_failure_rate = base_failure_rate
        self.chaos_config: Dict[str, float] = {}  # bank_name -> failure_rate
        
    def inject_chaos(self, bank_name: str, failure_rate: float) -> None:
        """
        Inject chaos for a specific bank.
        
        Args:
            bank_name: Name of the bank to affect
            failure_rate: Failure rate to apply (0-1)
        """
        self.chaos_config[bank_name] = min(max(failure_rate, 0), 1)
        
    def remove_chaos(self, bank_name: Optional[str] = None) -> None:
        """
        Remove chaos injection.
        
        Args:
            bank_name: Specific bank to remove chaos from, or None to clear all
        """
        if bank_name:
            self.chaos_config.pop(bank_name, None)
        else:
            self.chaos_config.clear()
            
    def get_chaos_status(self) -> Dict[str, float]:
        """Get current chaos configuration."""
        return self.chaos_config.copy()
    
    def _get_failure_rate(self, bank_name: str) -> float:
        """Get effective failure rate for a bank."""
        return self.chaos_config.get(bank_name, self.base_failure_rate)
    
    def _generate_amount(self) -> float:
        """Generate realistic transaction amount."""
        # Mix of small and large transactions
        if random.random() < 0.7:
            # Small transactions (majority)
            return round(random.uniform(50, 2000), 2)
        else:
            # Larger transactions
            return round(random.uniform(2000, 50000), 2)
    
    def _generate_latency(self, is_failed: bool) -> int:
        """Generate realistic latency in milliseconds."""
        if is_failed:
            # Failed transactions often have higher latency (timeouts)
            return random.randint(500, 5000)
        else:
            # Successful transactions are usually faster
            return random.randint(50, 500)
    
    def generate_transaction(self) -> Transaction:
        """Generate a single random transaction."""
        bank_name = random.choice(self.BANKS)
        failure_rate = self._get_failure_rate(bank_name)
        
        is_failed = random.random() < failure_rate
        status = TransactionStatus.FAILED if is_failed else TransactionStatus.SUCCESS
        error_code = random.choice(self.ERROR_CODES) if is_failed else None
        
        return Transaction(
            amount=self._generate_amount(),
            currency="INR",
            merchant_id=random.choice(self.MERCHANTS),
            bank_name=bank_name,
            payment_method=random.choice(list(PaymentMethod)),
            status=status,
            error_code=error_code,
            latency_ms=self._generate_latency(is_failed)
        )
    
    def stream_transactions(self, count: Optional[int] = None) -> Generator[Transaction, None, None]:
        """
        Generate a stream of transactions.
        
        Args:
            count: Number of transactions to generate, or None for infinite stream
            
        Yields:
            Transaction objects
        """
        generated = 0
        while count is None or generated < count:
            yield self.generate_transaction()
            generated += 1
            
    def generate_batch(self, size: int = 10) -> list[Transaction]:
        """Generate a batch of transactions."""
        return [self.generate_transaction() for _ in range(size)]


# Convenience function for quick testing
def create_test_simulator() -> TransactionSimulator:
    """Create a simulator with some chaos pre-configured for testing."""
    sim = TransactionSimulator(base_failure_rate=0.03)
    return sim


if __name__ == "__main__":
    # Quick test
    sim = TransactionSimulator()
    print("Generating 5 normal transactions:")
    for txn in sim.stream_transactions(5):
        print(f"  {txn.bank_name}: {txn.status.value} - ₹{txn.amount}")
    
    print("\nInjecting chaos for HDFC (80% failure rate):")
    sim.inject_chaos("HDFC", 0.8)
    for txn in sim.stream_transactions(5):
        print(f"  {txn.bank_name}: {txn.status.value} - ₹{txn.amount}")
