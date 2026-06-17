import time
import functools
import logging
from typing import Callable, Any
from contextvars import ContextVar

# Context var to track request start time for TTFT if needed
request_start_time = ContextVar("request_start_time", default=0.0)

logger = logging.getLogger("metrics")

class LatencyMonitor:
    """
    Monitor and log latency metrics for critical AI components.
    Tracks:
    - Total Latency (e2e)
    - Time to First Token (TTFT) - if applicable via streaming callbacks
    - Tool Execution Time
    """
    
    @staticmethod
    def measure(metric_name: str):
        """
        Decorator to measure execution time of a function.
        Logs: {metric_name}_latency_ms
        """
        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            async def wrapper(*args, **kwargs) -> Any:
                start_time = time.perf_counter()
                try:
                    result = await func(*args, **kwargs)
                    return result
                finally:
                    end_time = time.perf_counter()
                    duration_ms = (end_time - start_time) * 1000
                    
                    # Log structured metric
                    logger.info(
                        "Metric Recorded",
                        extra={
                            "metric_type": "latency",
                            "metric_name": metric_name,
                            "value_ms": duration_ms,
                            "function": func.__name__
                        }
                    )
            return wrapper
        return decorator

    @staticmethod
    def record_ttft(start_time: float):
        """
        Record Time-To-First-Token.
        Call this when the first chunk is received in a stream.
        """
        end_time = time.perf_counter()
        duration_ms = (end_time - start_time) * 1000
        
        logger.info(
            "Metric Recorded",
            extra={
                "metric_type": "latency",
                "metric_name": "ai_ttft",
                "value_ms": duration_ms
            }
        )

metrics = LatencyMonitor()
