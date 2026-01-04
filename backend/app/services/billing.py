import razorpay
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class BillingService:
    def __init__(self):
        self.client = None
        if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            self.client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        else:
            logger.warning("Razorpay keys not found. Billing service running in mock mode.")

    def create_subscription(self, plan_id: str, customer_id: str = None) -> dict:
        if not self.client:
            return {"id": "sub_mock_123", "status": "created", "mock": True}
        
        try:
            # Create Subscription
            # Note: In real flows, you might need to create a Customer first if not exists
            subscription = self.client.subscription.create({
                "plan_id": plan_id,
                "customer_notify": 1,
                "total_count": 12, # 1 Year (monthly)
                "quantity": 1,
                "notes": {"key1": "value3", "key2": "value2"}
            })
            return subscription
        except Exception as e:
            logger.error(f"Razorpay Subscription Error: {e}")
            raise e

    def verify_payment_signature(self, payment_id: str, order_id: str, signature: str) -> bool:
        if not self.client:
            return True
        
        try:
            self.client.utility.verify_payment_signature({
                'razorpay_order_id': order_id,
                'razorpay_payment_id': payment_id,
                'razorpay_signature': signature
            })
            return True
        except razorpay.errors.SignatureVerificationError:
            return False

billing_service = BillingService()
