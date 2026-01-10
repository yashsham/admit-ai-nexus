try:
    from phi.model.huggingface import HuggingFaceChat
    print("✅ phi.model.huggingface.HuggingFaceChat found")
except ImportError:
    print("❌ phi.model.huggingface.HuggingFaceChat NOT found")

try:
    from phi.model.huggingface import HuggingFace
    print("✅ phi.model.huggingface.HuggingFace found")
except ImportError:
    print("❌ phi.model.huggingface.HuggingFace NOT found")
