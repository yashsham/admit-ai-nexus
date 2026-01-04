from slowapi import Limiter
from slowapi.util import get_remote_address

# Configure Limiter
# Uses MemoryStorage by default, which is fine for individual instances.
# For production cluster, should use RedisStorage.
limiter = Limiter(key_func=get_remote_address)
