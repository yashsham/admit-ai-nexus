import redis
import sys

try:
    r = redis.Redis(host='localhost', port=6379, db=0, socket_timeout=3)
    r.ping()
    print("Redis is RUNNING")
except Exception as e:
    print(f"Redis is DOWN: {e}")
    sys.exit(1)
