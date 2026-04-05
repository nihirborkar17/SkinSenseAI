"""
rag_pipeline.py — RAG chatbot for skin condition Q&A.
Retrieves from ChromaDB then generates answers via OpenAI or Anthropic.
Stays locked to the detected condition. Never recommends medicines.
"""

import os
from dataclasses import dataclass, field
from typing import Generator, Optional

from knowledge_base import KnowledgeBase


# ── System prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are DermAssist, a skin health education assistant built into a skin condition analysis app.

The patient has just had their skin image analysed by an AI model. Your role is to help them understand their detected condition using peer-reviewed dermatology literature.

STRICT RULES:
1. Only answer questions related to the patient's detected skin condition.
2. Base every answer on the retrieved knowledge base passages provided to you.
3. You MAY discuss: causes, symptoms, risk factors, general treatment approaches, lifestyle changes, ingredients commonly found in skincare products for this condition, and when to see a doctor.
4. You MUST NEVER: recommend specific medicines, drugs, or prescriptions by name. Never say "take X" or "use X medication".
5. If asked about medication, explain general treatment categories (e.g. "topical retinoids are commonly used") but never name specific brands or prescribe.
6. Always end answers about treatment with: "Please consult a qualified dermatologist before starting any treatment."
7. If a question is unrelated to dermatology or the detected condition, politely redirect.
8. Be factual, clear, and compassionate. Patients may be anxious about their results.
"""

SUGGESTED_QUESTIONS = {
    "MEL": [
        "What is melanoma and how serious is it?",
        "What are the warning signs of melanoma?",
        "What causes melanoma?",
        "What does the ABCDE rule mean?",
        "What are the treatment options for melanoma?",
    ],
    "NV": [
        "What is a melanocytic nevus?",
        "When should I be concerned about a mole?",
        "Can a mole turn into melanoma?",
        "How often should I get a skin check?",
    ],
    "BCC": [
        "What is basal cell carcinoma?",
        "How serious is basal cell carcinoma?",
        "What causes basal cell carcinoma?",
        "What are the treatment options for BCC?",
    ],
    "AK": [
        "What is actinic keratosis?",
        "Is actinic keratosis cancerous?",
        "What causes actinic keratosis?",
        "How can I prevent new actinic keratoses?",
    ],
    "BKL": [
        "What is benign keratosis?",
        "Is benign keratosis dangerous?",
        "What is the difference between seborrheic keratosis and skin cancer?",
        "Can benign keratosis be removed?",
    ],
    "DF": [
        "What is a dermatofibroma?",
        "What causes dermatofibromas?",
        "Do dermatofibromas need to be removed?",
        "Can dermatofibromas become cancerous?",
    ],
    "VASC": [
        "What type of vascular lesion might this be?",
        "Are vascular lesions dangerous?",
        "What causes vascular skin lesions?",
        "What treatments are available for vascular lesions?",

    ],
}


# ── Chat session ───────────────────────────────────────────────────────────────
@dataclass
class ChatSession:
    condition_code: str
    condition_full: str
    confidence:     float
    severity_label: str
    history:        list = field(default_factory=list)
    max_turns:      int  = 8

    def add(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        max_msgs = self.max_turns * 2
        if len(self.history) > max_msgs:
            self.history = self.history[-max_msgs:]

    def build_messages(self, context_block: str, user_query: str) -> list:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]

        if not self.history:
            intro = (
                f"The patient's skin image has been analysed.\n"
                f"Detected condition: {self.condition_full} ({self.condition_code})\n"
                f"Confidence: {self.confidence:.1f}% | Severity: {self.severity_label}\n\n"
                f"Retrieved knowledge base passages:\n{context_block}"
            )
            messages.append({"role": "user",      "content": intro})
            messages.append({"role": "assistant", "content": (
                f"Understood. I have the patient's diagnosis: "
                f"{self.condition_full} with {self.confidence:.1f}% confidence "
                f"({self.severity_label} severity). "
                f"I'm ready to answer questions about this condition. How can I help?"
            )})

        for msg in self.history:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                if msg["content"].strip():
                    messages.append(msg)

        messages.append({"role": "user", "content": (
            f"[Retrieved context]\n{context_block}\n\n"
            f"[Patient question]\n{user_query}"
        )})
        return messages


# ── LLM backends ───────────────────────────────────────────────────────────────
class OpenAIBackend:
    def __init__(self, model: str = "llama3", api_key: str = None):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key or os.environ["OPENAI_API_KEY"])
        self.model  = model

    def complete(self, messages: list, max_tokens: int = 800,
                 stream: bool = False):
        if stream:
            return self._stream(messages, max_tokens)
        r = self.client.chat.completions.create(
            model=self.model, messages=messages,
            max_tokens=max_tokens, temperature=0.3,
        )
        return r.choices[0].message.content

    def _stream(self, messages, max_tokens) -> Generator:
        for chunk in self.client.chat.completions.create(
            model=self.model, messages=messages,
            max_tokens=max_tokens, temperature=0.3, stream=True,
        ):
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta


class AnthropicBackend:
    def __init__(self, model: str = "claude-opus-4-6", api_key: str = None):
        import anthropic
        self.client = anthropic.Anthropic(
            api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self.model  = model

    def complete(self, messages: list, max_tokens: int = 800,
                 stream: bool = False):
        system   = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msgs = [m for m in messages if m["role"] != "system"]
        if stream:
            return self._stream(system, user_msgs, max_tokens)
        r = self.client.messages.create(
            model=self.model, system=system,
            messages=user_msgs, max_tokens=max_tokens,
        )
        return r.content[0].text

    def _stream(self, system, user_msgs, max_tokens) -> Generator:
        with self.client.messages.stream(
            model=self.model, system=system,
            messages=user_msgs, max_tokens=max_tokens,
        ) as s:
            for text in s.text_stream:
                yield text

######################ADDED########################
class OllamaBackend:
    def __init__(self, model: str = "phi3"):
        import ollama
        self.model = model

    def complete(self, messages: list, max_tokens: int = 800, stream: bool = False):
        import ollama

        clean_messages = []
        for msg in messages:
            if isinstance(msg, dict) and "role" in msg and "content" in msg:
                # Only add if content si not empty
                if msg["content"].strip():
                    clean_messages.append({
                            "role": msg["role"],
                            "content": msg["content"]
                        })

        if not clean_messages:
            raise ValueError("No valid messages to send")

        if stream: 
            return self._stream(clean_messages)

        try: 
            response = ollama.chat(
                    model=self.model,
                    messages=clean_messages
                    )

            return response["message"]["content"]
        except Exception as e:
            raise RuntimeError(f"Ollama chat failed: {e}")

    def _stream(self, messages):
        import ollama

        try: 
            stream = ollama.chat(
                    model=self.model,
                    messages=messages,
                    stream=True
                    )

            for chunk in stream:
                if "message" in chunk and "content" in chunk["message"]:
                    yield chunk["message"]["content"]
        except Exception as e:
            raise RuntimeError(f"Ollama stream failed: {e}")


def build_llm_backend(provider: str, model: str = None):
    provider = provider.lower()

    if provider == "anthropic":
        return AnthropicBackend(model=model or "claude-opus-4-6")

    elif provider == "ollama":
        return OllamaBackend(model=model or "phi3")

    else:
        return OpenAIBackend(model=model or "gpt-4o")

# ── RAG pipeline ───────────────────────────────────────────────────────────────
class DermRAGPipeline:
    """
    Orchestrates retrieval + generation for skin condition Q&A.

    Usage:
        pipeline = DermRAGPipeline(kb=KnowledgeBase(...), llm_backend=OpenAIBackend())
        session  = pipeline.create_session("MEL", 94.2, "Critical")
        answer   = pipeline.chat(session, "What causes melanoma?")
    """

    def __init__(self, kb: KnowledgeBase, llm_backend, top_k: int = 5):
        self.kb   = kb
        self.llm  = llm_backend
        self.top_k = top_k

        from core.dataset import CLASS_INFO
        self.class_info = CLASS_INFO

    def create_session(self, condition_code: str, confidence: float,
                       severity_label: str) -> ChatSession:
        info = self.class_info.get(condition_code.upper(), {})
        return ChatSession(
            condition_code=condition_code.upper(),
            condition_full=info.get("full", condition_code),
            confidence=confidence,
            severity_label=severity_label,
        )

    def _build_context(self, chunks: list) -> str:
        if not chunks:
            return "No specific reference material found for this query."
        parts = []
        for i, c in enumerate(chunks, 1):
            parts.append(
                f"[{i}] Source: {c['source']} (relevance: {c['relevance_score']:.2f})\n"
                f"{c['text']}"
            )
        return "\n\n---\n\n".join(parts)

    def chat(self, session: ChatSession, user_query: str,
             stream: bool = False, max_tokens: int = 800):
        chunks   = self.kb.retrieve(user_query, session.condition_code, self.top_k)
        context  = self._build_context(chunks)
        messages = session.build_messages(context, user_query)

        if stream:
            return self._stream_and_record(session, user_query, messages, max_tokens)

        answer = self.llm.complete(messages, max_tokens=max_tokens, stream=False)
        session.add("user",      user_query)
        session.add("assistant", answer)
        return answer

    def _stream_and_record(self, session, user_query, messages,
                            max_tokens) -> Generator:
        full = []
        for token in self.llm.complete(messages, max_tokens=max_tokens, stream=True):
            full.append(token)
            yield token
        session.add("user",      user_query)
        session.add("assistant", "".join(full))

    def reset_session(self, session: ChatSession):
        session.history.clear()

    def get_suggested_questions(self, condition_code: str) -> list:
        return SUGGESTED_QUESTIONS.get(condition_code.upper(), [
            "What is this skin condition?",
            "What are the treatment options?",
            "When should I see a doctor?",
        ])
