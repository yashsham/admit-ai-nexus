from typing import Dict, Any, Optional
import yaml
import os
import logging
from pydantic import BaseModel

logger = logging.getLogger("prompt_registry")

class PromptConfig(BaseModel):
    id: str
    version: str
    description: str
    owner: str
    system_prompt: str
    user_prompt_template: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

class PromptRegistry:
    """
    Manages versioned prompts.
    Loads from YAML files in `templates/` directory.
    Access Pattern: get_prompt("campaign_email", "v1.0")
    """
    def __init__(self, templates_dir: str = "app/ai/prompts/templates"):
        self.templates_dir = templates_dir
        self.prompts: Dict[str, Dict[str, PromptConfig]] = {} # {id: {version: config}}
        self._load_prompts()
    
    def _load_prompts(self):
        """
        Scans templates directory and loads all .yaml prompt definitions.
        """
        base_path = os.path.join(os.getcwd(), self.templates_dir)
        if not os.path.exists(base_path):
             logger.warning(f"Prompt templates directory not found: {base_path}")
             return

        for filename in os.listdir(base_path):
            if filename.endswith(".yaml") or filename.endswith(".yml"):
                try:
                    with open(os.path.join(base_path, filename), "r") as f:
                        data = yaml.safe_load(f)
                        # Support multiple versions in one file or single file per prompt?
                        # Let's assume file structure: 
                        # prompts:
                        #   - id: ...
                        #     version: ...
                        
                        configs = data.get("prompts", [])
                        for config_data in configs:
                            prompt = PromptConfig(**config_data)
                            if prompt.id not in self.prompts:
                                self.prompts[prompt.id] = {}
                            self.prompts[prompt.id][prompt.version] = prompt
                            
                except Exception as e:
                    logger.error(f"Failed to load prompt file {filename}: {e}")

    def get_prompt(self, prompt_id: str, version: str = "latest") -> Optional[PromptConfig]:
        """
        Retrieve a specific prompt version.
        If version is 'latest', returns the highest semantic version (lexicographically for now).
        """
        if prompt_id not in self.prompts:
            return None
        
        versions = self.prompts[prompt_id]
        if not versions:
            return None
            
        if version == "latest":
            # Simple string sort for now: v1.1 > v1.0
            latest_ver = sorted(versions.keys())[-1]
            return versions[latest_ver]
        
        return versions.get(version)
    
    def render(self, prompt_id: str, context: Dict[str, Any], version: str = "latest") -> Dict[str, str]:
        """
        Returns a formatted system and user prompt ready for the LLM.
        """
        config = self.get_prompt(prompt_id, version)
        if not config:
            raise ValueError(f"Prompt {prompt_id}:{version} not found")
            
        # Basic validation of context inputs against schema (simplified)
        missing_keys = [k for k in config.input_schema.keys() if k not in context]
        if missing_keys:
             raise ValueError(f"Missing required context keys for {prompt_id}: {missing_keys}")

        try:
             user_content = config.user_prompt_template.format(**context)
             return {
                 "system": config.system_prompt,
                 "user": user_content,
                 "version": config.version
             }
        except KeyError as e:
             raise ValueError(f"Context missing key needed for formatting: {e}")

prompt_registry = PromptRegistry()
