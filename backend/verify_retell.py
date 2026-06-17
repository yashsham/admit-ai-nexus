
import sys
import os
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.abspath('d:/admitnexus/admit-ai-nexus/backend'))

def test_retell_service():
    # Mock settings before importing RetellService
    with patch('app.core.config.settings') as mock_settings:
        mock_settings.RETELL_API_KEY = "test_key"
        mock_settings.RETELL_AGENT_ID = "test_agent"
        
        # Now import the service
        from app.services.retell_service import RetellService
        service = RetellService()
        
        # Mock requests.post
        with patch('requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.json.return_value = {"call_id": "call_123"}
            mock_response.status_code = 200
            
            # Setup the side effect
            mock_post.return_value = mock_response
            
            result = service.trigger_outbound_call(
                phone_number="+1234567890",
                candidate_name="Test User",
                context="This is a test context",
                document_content="Test document content"
            )
            
            print(f"Result: {result}")
            assert result["success"] == True
            assert result["call_id"] == "call_123"
            
            # Verify call parameters
            args, kwargs = mock_post.call_args
            data = kwargs["json"]
            assert data["to_number"] == "+1234567890"
            assert data["retell_llm_dynamic_variables"]["customer_name"] == "Test User"
            assert data["retell_llm_dynamic_variables"]["call_context"] == "This is a test context"
            assert data["retell_llm_dynamic_variables"]["document_content"] == "Test document content"
            
            print("RetellService verification PASSED!")

if __name__ == "__main__":
    try:
        test_retell_service()
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Verification FAILED: {e}")
        sys.exit(1)
