# Production AI Architecture Guide

> "Toy AI apps chat. Production AI apps work."

This document outlines the architecture, decision frameworks, and "5 Pillars of Trust" implemented in this repository.

## 1. The 5 Pillars of Production AI

We have implemented the following layers to ensure reliability, safety, and observability:

### 1️⃣ Prompt Versioning (`app.ai.prompts.registry`)
- **Philosophy**: Prompts are code, not config.
- **Implementation**: 
    - Prompts are defined in structured YAML files (`templates/`).
    - Accessed via `PromptRegistry.get_prompt(id, version="v1.2")`.
    - Strict Input/Output schemas enforce consistency.

### 2️⃣ Latency Metrics (`app.observability.metrics`)
- **Philosophy**: Speed is a feature.
- **Implementation**:
    - `@metrics.measure` decorator tracks P50/P99 latency.
    - Tracks **TTFT** (Time To First Token) separately from total duration.
    - Logs specific tool execution times to identify bottlenecks.

### 3️⃣ Token Cost Tracking (`app.observability.cost_tracking`)
- **Philosophy**: Monitor burn rate per feature/user.
- **Implementation**:
    - Tracks Input vs Output tokens (different costs).
    - Aggregates cost per `user_id` and `model_name`.
    - Foundational for "Freemium" tiers and Budget Guardrails.

### 4️⃣ Human-in-the-Loop (HITL) (`app.ai.pipelines.hitl`)
- **Philosophy**: AI assists, Humans approve.
- **Implementation**:
    - **Confidence Trigger**: If AI confidence < 0.8, force human review.
    - **Review Workflow**: AI generates -> DB "Pending" state -> Human API Call -> "Approved" -> Final Action.

### 5️⃣ Audit Logs (`app.observability.logging`)
- **Philosophy**: Explainability is non-negotiable.
- **Implementation**:
    - Structured JSON logs with `trace_id` for full request lifecycle.
    - Dedicated `AuditLogger` for compliance events (e.g., "Prompt v1.2 used", "PII Redacted").

---

## 2. Framework & Tool Selection

### LangChain vs LlamaIndex
| Framework | Best For | Our Choice |
| :--- | :--- | :--- |
| **LangChain** | General purpose agents, complex chains, tool usage. | **Primary** (for Agent Orchestration) |
| **LlamaIndex** | RAG (Retrieval Augmented Generation), Data ingestion. | **Secondary** (for Knowledge Base Retrieval) |

**Recommendation**: Use LangChain for the "Brain" (decisions) and LlamaIndex for the "Memory" (data fetching).

### Vector Databases
| DB | Type | Best For |
| :--- | :--- | :--- |
| **Pinecone** | Cloud Native | Speed, Scalability, Managed Service. |
| **Weaviate** | Hybrid Search | Complex filtering + keyword search. |
| **Chroma** | Local / Embedded | Dev/Test, simple use cases. |
| **pgvector** | Postgres Extension | **Winner**. Keeps data & vectors together. |

**Our Choice**: **pgvector** (via Supabase). Allows relational queries + vector similarity in one transaction.

---

## 3. Model Selection Strategy (`ModelRouter`)
We use a **Tiered Routing** system to balance cost vs intelligence.

1.  **Tier 1 (Cheap/Fast)**: `Llama 3 8B`, `Haiku`.
    - Use for: Summarization, Classification, Simple Extraction.
2.  **Tier 2 (Balanced)**: `Llama 3 70B`, `Gemini Flash`.
    - Use for: Content writing, RAG synthesis.
3.  **Tier 3 (Premium)**: `GPT-4o`, `Claude 3.5 Sonnet`.
    - Use for: Complex reasoning, Coding, "Final Polish".

**Routing Logic**:
```python
if request.complexity == "high":
    use("gpt-4o")
else:
    use("llama-3-8b")
```

---

## 4. Pipeline Architecture
The `AIPipeline` orchestrates the flow:

1.  **Input Guard**: Sanitizes PII (`<EMAIL_REDACTED>`) and checks for Jailbreaks.
2.  **Prompt Render**: Loads verified template version.
3.  **Routing**: Selects model based on complexity.
4.  **Inference**: Calls LLM (with Fallbacks).
5.  **Output Guard**: Validates JSON Schema.
6.  **HITL**: Pauses if confidence is low.
7.  **Audit**: Logs everything.

Use this architecture for all new AI features.
