# LLM Smart Routing Research - Best Approaches

**Date:** 2026-01-31  
**Topic:** Cost-effective LLM routing strategies for Haiku/Sonnet/Opus  
**Status:** Research complete

## Summary

Smart routing between LLM tiers (cheap/mid/expensive) is a well-researched problem with proven solutions. The best approaches use **learned routers** that predict query complexity from training data, achieving 85% cost reduction while maintaining 95% GPT-4 performance.

---

## Top Approaches (Ranked)

### 1. **RouteLLM (RECOMMENDED)** ⭐
**Source:** UC Berkeley LMSYS (https://github.com/lm-sys/RouteLLM)

**How it works:**
- Trains ML models on preference data (which queries needed GPT-4 vs worked fine with cheaper models)
- Four router types available: Matrix Factorization (MF), BERT classifier, Similarity-Weighted ranking, LLM-based
- MF router is best: lightweight + very accurate
- Returns a "strong model win rate" - if > threshold, route to expensive model

**Performance:**
- 85% cost reduction at 95% GPT-4 quality
- 40% cheaper than commercial offerings (like Martian)
- Generalizes well across model pairs (trained on GPT-4/Mixtral, works for others)

**Implementation:**
```python
from routellm.controller import Controller

client = Controller(
    routers=["mf"],  # matrix factorization
    strong_model="gpt-4",
    weak_model="mixtral-8x7b",
)

# Calibrate threshold for 50% GPT-4 usage
# threshold = 0.11593

response = client.chat.completions.create(
    model="router-mf-0.11593",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Pros:**
- Battle-tested (from ChatbotArena team)
- Drop-in replacement for OpenAI client
- Pre-trained models ready to use
- Threshold calibration based on your desired cost/quality tradeoff

**Cons:**
- Requires OpenAI API key for embeddings (for MF router)
- Trained on specific model pairs (though generalizes)

---

### 2. **LiteLLM Router**
**Source:** BerriAI (https://github.com/BerriAI/litellm)

**Routing strategies:**
- **Weighted shuffle** (default, best for prod) - picks based on RPM/TPM limits
- **Latency-based** - route to fastest model
- **Cost-based** - route to cheapest available
- **Least-busy** - route to model with most capacity
- **Rate-limit aware** - avoid rate-limited deployments

**How it works:**
- Load balancing + retry/fallback logic
- Priority ordering (try Sonnet first, fallback to Opus if needed)
- Cooldowns for failing deployments
- Redis for distributed state

**Implementation:**
```python
from litellm import Router

model_list = [
    {
        "model_name": "gpt-3.5",
        "litellm_params": {
            "model": "haiku",
            "rpm": 1000,
            "order": 1  # try first
        }
    },
    {
        "model_name": "gpt-3.5",
        "litellm_params": {
            "model": "sonnet",
            "rpm": 500,
            "order": 2  # fallback
        }
    }
]

router = Router(
    model_list=model_list,
    routing_strategy="simple-shuffle",
    num_retries=3
)
```

**Pros:**
- Production-grade reliability (retries, cooldowns, fallbacks)
- Supports 100+ LLM providers
- Very fast (8ms p95 latency at 1k RPS)
- No ML training required

**Cons:**
- Not intelligence-based (doesn't analyze query complexity)
- More focused on reliability than cost optimization

---

### 3. **Heuristic-Based Routing** (Simple DIY)

**Rule-based approach:**
```python
def route_query(message: str) -> str:
    # Length check
    if len(message) < 50:
        return "haiku"
    
    # Keyword detection
    complex_keywords = ["explain", "analyze", "write code", "debug", 
                        "compare", "evaluate", "design", "architect"]
    if any(kw in message.lower() for kw in complex_keywords):
        return "opus"
    
    # Code detection
    if "```" in message or "def " in message:
        return "sonnet"
    
    # Default
    return "sonnet"
```

**Pros:**
- Zero setup, instant deployment
- Transparent logic
- No external dependencies

**Cons:**
- Brittle (easy to fool with edge cases)
- Hard to tune for accuracy
- Doesn't learn from usage

---

### 4. **Cascade Approach** (Two-Pass)

**How it works:**
1. Send query to Haiku with a meta-prompt: "Is this query complex? Answer yes/no"
2. Based on response, route to Sonnet or Opus

**Implementation:**
```python
async def smart_route(query: str) -> str:
    # Step 1: Ask Haiku to classify
    classification = await haiku.complete(
        f"Is this a complex query requiring deep reasoning? "
        f"Answer only 'yes' or 'no'. Query: {query}"
    )
    
    # Step 2: Route based on classification
    if "yes" in classification.lower():
        return await opus.complete(query)
    else:
        return await sonnet.complete(query)
```

**Cost analysis:**
- Classification call: ~$0.0001 per query (negligible)
- Saves money when Haiku correctly identifies simple queries

**Pros:**
- Very accurate (uses LLM intelligence to classify)
- Self-improving (Haiku gets better at classification)
- Minimal latency overhead (~100-200ms)

**Cons:**
- Extra API call
- Slight latency increase
- Classification prompt needs tuning

---

## Industry Examples

**OpenAI's approach (speculative):**
- Likely uses learned router similar to RouteLLM
- Routes between GPT-4, GPT-4 Turbo, GPT-3.5 based on query
- Not publicly documented

**Anthropic's Claude models:**
- No official routing system
- Users manually select Haiku/Sonnet/Opus

**Martian (commercial):**
- Charges for routing as a service
- RouteLLM benchmarks show it's 40% more expensive than open-source routers

---

## Recommendation for Your Setup

**Phase 1: Manual (NOW)**
- Use `/model haiku|sonnet|opus` for explicit control
- Learn your usage patterns over 1-2 weeks

**Phase 2: Heuristic Rules (WEEK 2)**
- Implement simple keyword + length rules
- Track accuracy, iterate

**Phase 3: RouteLLM Integration (WEEK 3-4)**
- Integrate RouteLLM's MF router
- Calibrate threshold based on your queries
- Target: 50% Sonnet, 30% Haiku, 20% Opus

**Expected Results:**
- 70-80% cost reduction vs all-Opus
- 90-95% quality maintained
- Pays for itself in < 1 week at moderate usage

---

## Key Metrics to Track

```
For each query, log:
- Model used (haiku/sonnet/opus)
- Query length (chars)
- Response quality (user feedback)
- Cost ($)
- Latency (ms)

Calculate:
- Cost per query by model
- Quality score by model
- Routing accuracy (was correct model chosen?)
```

---

## References

1. **RouteLLM Paper:** https://arxiv.org/abs/2406.18665
2. **RouteLLM GitHub:** https://github.com/lm-sys/RouteLLM
3. **LiteLLM Docs:** https://docs.litellm.ai/docs/routing
4. **Chatbot Arena Data:** https://huggingface.co/datasets/lmsys/lmsys-arena-human-preference-55k

---

## Next Steps

1. ✅ Set up model aliases (done)
2. Track manual usage for 1 week
3. Build simple heuristic router
4. Evaluate RouteLLM integration
5. Deploy smart routing in production
