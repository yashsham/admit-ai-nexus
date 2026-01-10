import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.core.llm_factory import get_llm_with_fallback
from langchain_core.messages import HumanMessage

class TestLLMFallback(unittest.TestCase):
    
    @patch('app.core.llm_factory.ChatGroq')
    @patch('app.core.llm_factory.ChatGoogleGenerativeAI')
    @patch('app.core.config.settings')
    def test_fallback_initialization(self, mock_settings, mock_gemini, mock_groq):
        print("\n--- Model Initialization Test ---")
        mock_settings.GROQ_API_KEY = "fake_groq_key"
        mock_settings.GOOGLE_API_KEY = "fake_google_key"
        
        # Test creation
        llm = get_llm_with_fallback()
        print(f"LLM Object Created: {llm}")
        
        # Verify both models were initialized
        mock_groq.assert_called_once()
        mock_gemini.assert_called_once()
        print("SUCCESS: Both Groq (Primary) and Gemini (Fallback) initialized.")

    @patch('app.core.llm_factory.ChatGroq')
    @patch('app.core.llm_factory.ChatGoogleGenerativeAI')
    @patch('app.core.config.settings')
    def test_single_model_fallback(self, mock_settings, mock_gemini, mock_groq):
        print("\n--- Missing Google Key Test ---")
        mock_settings.GROQ_API_KEY = "fake_groq_key"
        mock_settings.GOOGLE_API_KEY = "" # No Google Key
        
        # Test creation
        llm = get_llm_with_fallback()
        
        mock_groq.assert_called_once()
        mock_gemini.assert_not_called()
        print("SUCCESS: Only Groq initialized when Google Key is missing.")

if __name__ == '__main__':
    try:
        unittest.main()
    except SystemExit:
        pass
