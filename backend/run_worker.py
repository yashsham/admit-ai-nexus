import sys
import os
import asyncio
from arq import run_worker
from app.workers.main import WorkerSettings

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

if __name__ == '__main__':
    print("Starting ARQ Worker...")
    asyncio.run(run_worker(WorkerSettings))
