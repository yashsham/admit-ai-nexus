import sys
try:
    import phi
    print(f"Phi version: {getattr(phi, '__version__', 'unknown')}")
    print(f"Phi file: {phi.__file__}")
    print("Content of phi:")
    print(dir(phi))
    
    try:
        from phi.agent import Agent
        print("SUCCESS: from phi.agent import Agent")
    except ImportError as e:
        print(f"FAILURE importing Agent: {e}")
        
except ImportError:
    print("Phi not installed")
