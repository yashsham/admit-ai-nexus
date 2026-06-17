
import asyncio
import sys
import os
import unittest
from unittest.mock import MagicMock, AsyncMock, patch

# Add backend to pass
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.api.v1.endpoints import campaigns
from app.services import llm_generation

class TestAsyncCampaignExecution(unittest.IsolatedAsyncioTestCase):

    @patch("app.api.v1.endpoints.campaigns.supabase")
    @patch("app.api.v1.endpoints.campaigns.tools")
    @patch("app.services.llm_generation.get_llm_with_fallback")
    async def test_run_campaign_async_success(self, mock_get_llm, mock_tools, mock_supabase):
        print("\n--- Testing Async Campaign Execution ---")
        
        # 1. Mock LLM (Async)
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = MagicMock(content="SUBJECT: Async Subject\nBODY: Async Body Content")
        mock_get_llm.return_value = mock_llm
        
        # 2. Mock Supabase Data
        # Campaigns Select
        mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
            "id": "test_campaign", 
            "channels": ["email"],
            "metadata": {"ai_prompt": "Test Prompt"}
        }
        
        # Candidates Select (Recipients)
        mock_supabase.table.return_value.select.return_value.cs.return_value.execute.return_value.data = [
            {"name": "Student1", "email": "s1@example.com", "college": "TestU"}
        ]
        
        # 3. Mock Tools
        mock_tools.get_verified_link.return_value = "http://verified.com"
        mock_tools.send_email.return_value = "sent"

        # 4. Run Execution
        await campaigns.run_campaign_execution("test_campaign")
        
        # 5. Assertions
        mock_llm.ainvoke.assert_called_once()
        print("SUCCESS: LLM.ainvoke called successfully.")
        
        mock_tools.send_email.assert_called_once()
        print("SUCCESS: Email tool called successfully.")
        
        # Verify Supabase logic
        # Should have updated status to active, then completed
        self.assertTrue(mock_supabase.table.return_value.update.called)
        print("SUCCESS: Supabase updates occurred.")

if __name__ == "__main__":
    unittest.main()
