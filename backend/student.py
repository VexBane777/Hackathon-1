"""
Online Learning Student Model for Payment Operations System.
Implements incremental learning using River library.
"""

from typing import Tuple, Dict, List, Optional
from collections import deque
import pickle
import os

from river import tree, preprocessing, compose
from river.base import Classifier

from models import Transaction, Decision, ActionType, AgentSource


class OnlineLearner:
    """
    Online learning model that learns from the LLM Council's decisions.
    
    Uses River's HoeffdingTreeClassifier for incremental learning.
    The model observes transaction features and learns to predict
    the appropriate action based on the Council's decisions.
    """
    
    # Feature encoding maps
    BANK_MAP = {"HDFC": 0, "ICICI": 1, "SBI": 2, "Axis": 3, "Kotak": 4, 
                "Yes Bank": 5, "PNB": 6, "BOB": 7}
    METHOD_MAP = {"credit_card": 0, "debit_card": 1, "upi": 2, 
                  "net_banking": 3, "wallet": 4}
    ERROR_MAP = {"E001_TIMEOUT": 0, "E002_INSUFFICIENT_FUNDS": 1, 
                 "E003_BANK_DECLINED": 2, "E004_NETWORK_ERROR": 3,
                 "E005_FRAUD_SUSPECTED": 4, "E006_LIMIT_EXCEEDED": 5}
    ACTION_MAP = {
        ActionType.SWITCH_GATEWAY: 0,
        ActionType.INCREASE_RETRY: 1,
        ActionType.BLOCK_MERCHANT: 2,
        ActionType.REDUCE_LOAD: 3,
        ActionType.NO_ACTION: 4
    }
    REVERSE_ACTION_MAP = {v: k for k, v in ACTION_MAP.items()}
    
    def __init__(self, confidence_threshold: float = 0.90):
        """
        Initialize the online learner.
        
        Args:
            confidence_threshold: Minimum confidence to make autonomous decisions
        """
        self.confidence_threshold = confidence_threshold
        
        # Pipeline: preprocessing + classifier
        self.model = compose.Pipeline(
            preprocessing.StandardScaler(),
            tree.HoeffdingTreeClassifier(
                grace_period=50,
                delta=0.01,  # Confidence threshold for splitting (formerly split_confidence)
                leaf_prediction='mc'  # majority class
            )
        )
        
        # Track learning history
        self.samples_seen = 0
        self.correct_predictions = 0
        self.confidence_history: deque = deque(maxlen=100)
        self.recent_decisions: deque = deque(maxlen=50)
        
    def _extract_features(self, transaction: Transaction) -> Dict[str, float]:
        """Extract numerical features from a transaction."""
        return {
            'amount': transaction.amount,
            'amount_log': max(1, transaction.amount) ** 0.5,  # sqrt transform
            'bank': self.BANK_MAP.get(transaction.bank_name, 7),
            'method': self.METHOD_MAP.get(transaction.payment_method.value, 4),
            'error': self.ERROR_MAP.get(transaction.error_code, 5) if transaction.error_code else -1,
            'latency': transaction.latency_ms,
            'is_high_value': 1 if transaction.amount > 10000 else 0,
            'is_timeout': 1 if transaction.error_code == "E001_TIMEOUT" else 0,
            'is_fraud_suspect': 1 if transaction.error_code == "E005_FRAUD_SUSPECTED" else 0,
        }
    
    def predict(self, transaction: Transaction) -> Tuple[ActionType, float]:
        """
        Predict the action for a transaction.
        
        Args:
            transaction: Transaction to analyze
            
        Returns:
            Tuple of (predicted ActionType, confidence score)
        """
        features = self._extract_features(transaction)
        
        # Get prediction probabilities
        try:
            probas = self.model.predict_proba_one(features)
            
            if not probas:
                # Model hasn't learned enough yet
                return ActionType.NO_ACTION, 0.0
            
            # Get the class with highest probability
            best_class = max(probas, key=probas.get)
            confidence = probas[best_class]
            
            action = self.REVERSE_ACTION_MAP.get(best_class, ActionType.NO_ACTION)
            
            # Track confidence
            self.confidence_history.append(confidence)
            
            return action, confidence
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return ActionType.NO_ACTION, 0.0
    
    def learn(self, transaction: Transaction, council_decision: Decision) -> None:
        """
        Learn from a Council decision.
        
        Args:
            transaction: The transaction that was analyzed
            council_decision: The decision made by the Council
        """
        features = self._extract_features(transaction)
        label = self.ACTION_MAP.get(council_decision.action, 4)
        
        # Check if our prediction would have been correct
        predicted_action, confidence = self.predict(transaction)
        if predicted_action == council_decision.action:
            self.correct_predictions += 1
        
        # Update the model
        self.model.learn_one(features, label)
        self.samples_seen += 1
        
        # Track for analysis
        self.recent_decisions.append({
            'transaction_id': transaction.id,
            'council_action': council_decision.action.value,
            'student_would_predict': predicted_action.value,
            'confidence': confidence
        })
    
    def get_average_confidence(self) -> float:
        """Get rolling average confidence score."""
        if not self.confidence_history:
            return 0.0
        return sum(self.confidence_history) / len(self.confidence_history)
    
    def get_accuracy(self) -> float:
        """Get prediction accuracy vs Council decisions."""
        if self.samples_seen == 0:
            return 0.0
        return self.correct_predictions / self.samples_seen
    
    def is_confident(self, transaction: Transaction) -> Tuple[bool, ActionType, float]:
        """
        Check if model is confident enough to make autonomous decision.
        
        Args:
            transaction: Transaction to check
            
        Returns:
            Tuple of (is_confident, predicted_action, confidence)
        """
        action, confidence = self.predict(transaction)
        is_confident = (
            confidence >= self.confidence_threshold and 
            self.samples_seen >= 20  # Minimum training samples
        )
        return is_confident, action, confidence
    
    def get_stats(self) -> Dict:
        """Get model statistics."""
        return {
            'samples_seen': self.samples_seen,
            'accuracy': self.get_accuracy(),
            'average_confidence': self.get_average_confidence(),
            'confidence_threshold': self.confidence_threshold,
            'is_ready': self.samples_seen >= 20,
            'recent_decisions': list(self.recent_decisions)[-5:]
        }
    
    def save(self, filepath: str) -> None:
        """Save model to disk."""
        with open(filepath, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'samples_seen': self.samples_seen,
                'correct_predictions': self.correct_predictions,
                'confidence_history': list(self.confidence_history)
            }, f)
    
    def load(self, filepath: str) -> bool:
        """Load model from disk."""
        if not os.path.exists(filepath):
            return False
        try:
            with open(filepath, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.samples_seen = data['samples_seen']
                self.correct_predictions = data['correct_predictions']
                self.confidence_history = deque(data['confidence_history'], maxlen=100)
            return True
        except Exception as e:
            print(f"Failed to load model: {e}")
            return False


class StudentDecisionMaker:
    """
    High-level interface for the Student model that returns Decision objects.
    """
    
    def __init__(self, learner: OnlineLearner):
        self.learner = learner
    
    def make_decision(self, transaction: Transaction) -> Optional[Decision]:
        """
        Attempt to make a decision autonomously.
        
        Returns None if not confident enough.
        """
        is_confident, action, confidence = self.learner.is_confident(transaction)
        
        if not is_confident:
            return None
        
        return Decision(
            action=action,
            reasoning=f"Student model prediction based on {self.learner.samples_seen} training samples",
            confidence_score=confidence,
            agent_source=AgentSource.STUDENT
        )


if __name__ == "__main__":
    from simulator import TransactionSimulator
    from models import ActionType, AgentSource
    
    print("Testing Online Learner...")
    
    # Create simulator and learner
    sim = TransactionSimulator()
    learner = OnlineLearner(confidence_threshold=0.7)
    
    print("\n1. Initial state (no training):")
    txn = sim.generate_transaction()
    action, conf = learner.predict(txn)
    print(f"   Prediction: {action.value}, Confidence: {conf:.2%}")
    
    print("\n2. Training with 50 mock Council decisions...")
    for i in range(50):
        txn = sim.generate_transaction()
        # Mock council decision based on transaction properties
        if txn.error_code == "E005_FRAUD_SUSPECTED":
            mock_action = ActionType.BLOCK_MERCHANT
        elif txn.error_code == "E001_TIMEOUT":
            mock_action = ActionType.SWITCH_GATEWAY
        else:
            mock_action = ActionType.INCREASE_RETRY
        
        mock_decision = Decision(
            action=mock_action,
            reasoning="Mock council decision",
            confidence_score=0.85,
            agent_source=AgentSource.TEACHER
        )
        learner.learn(txn, mock_decision)
    
    print(f"   Samples seen: {learner.samples_seen}")
    print(f"   Accuracy: {learner.get_accuracy():.2%}")
    print(f"   Avg confidence: {learner.get_average_confidence():.2%}")
    
    print("\n3. Testing predictions after training:")
    for _ in range(5):
        txn = sim.generate_transaction()
        action, conf = learner.predict(txn)
        print(f"   {txn.bank_name} - {txn.error_code or 'success'}: "
              f"{action.value} ({conf:.2%})")
