"""
knowledge_base.py — Ingests dermatology PDFs into ChromaDB.
Place PDFs in: data/knowledge_base/<CONDITION_CODE>/
Example:        data/knowledge_base/MEL/melanoma_paper.pdf

Usage:
    python knowledge_base.py --kb_dir data/knowledge_base
"""

import os
import json
import hashlib
import argparse
from pathlib import Path

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter

COLLECTION_NAME = "dermatology_kb"
EMBED_MODEL     = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE      = 500 * 4
CHUNK_OVERLAP   = 75  * 4
CONDITION_CODES = ["MEL", "NV", "BCC", "AK", "BKL", "DF", "VASC"]


def load_pdf(path: str) -> str:
    try:
        import fitz
        doc  = fitz.open(path)
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text
    except ImportError:
        raise ImportError("pip install pymupdf")


def load_text(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def load_document(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext == ".pdf":
        return load_pdf(path)
    elif ext in {".txt", ".md"}:
        return load_text(path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def chunk_text(text: str, condition_code: str, source_path: str) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks    = splitter.split_text(text)
    source_id = hashlib.md5(source_path.encode()).hexdigest()[:8]
    return [
        {
            "id":          f"{condition_code}_{source_id}_{i}",
            "text":        chunk.strip(),
            "condition":   condition_code.upper(),
            "source":      Path(source_path).name,
            "chunk_index": i,
        }
        for i, chunk in enumerate(chunks)
        if len(chunk.strip()) > 100
    ]


class KnowledgeBase:

    def __init__(self, persist_dir="data/chromadb", embed_model=EMBED_MODEL,
                 collection_name=COLLECTION_NAME):
        self.embedder   = SentenceTransformer(embed_model)
        self.client     = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        print(f"  [KB] Loaded — {self.collection.count()} chunks in store")

    def ingest_file(self, file_path: str, condition_code: str):
        print(f"  Ingesting {Path(file_path).name} → {condition_code}")
        text   = load_document(file_path)
        chunks = chunk_text(text, condition_code.upper(), file_path)
        if not chunks:
            print(f"    No usable chunks")
            return
        ids        = [c["id"]   for c in chunks]
        texts      = [c["text"] for c in chunks]
        metadatas  = [{"condition": c["condition"], "source": c["source"],
                       "chunk_index": c["chunk_index"]} for c in chunks]
        embeddings = self.embedder.encode(texts, batch_size=64,
                                          show_progress_bar=False).tolist()
        for start in range(0, len(ids), 500):
            self.collection.upsert(
                ids=ids[start:start+500],
                documents=texts[start:start+500],
                embeddings=embeddings[start:start+500],
                metadatas=metadatas[start:start+500],
            )
        print(f"    Added {len(chunks)} chunks")

    def ingest_directory(self, base_dir: str):
        base = Path(base_dir)
        for condition_dir in sorted(base.iterdir()):
            if not condition_dir.is_dir():
                continue
            code = condition_dir.name.upper()
            if code not in CONDITION_CODES:
                print(f"  Skipping unknown folder: {condition_dir.name}")
                continue
            files = (list(condition_dir.glob("*.pdf")) +
                     list(condition_dir.glob("*.txt")) +
                     list(condition_dir.glob("*.md")))
            if not files:
                print(f"  No files in {condition_dir}")
                continue
            for fpath in files:
                try:
                    self.ingest_file(str(fpath), code)
                except Exception as e:
                    print(f"  ERROR {fpath.name}: {e}")

    def retrieve(self, query: str, condition_code: str, top_k: int = 5) -> list:
        total = self.collection.count()
        if total == 0:
            return []
        q_emb   = self.embedder.encode([query]).tolist()
        results = self.collection.query(
            query_embeddings=q_emb,
            n_results=min(top_k, total),
            where={"condition": {"$eq": condition_code.upper()}},
            include=["documents", "metadatas", "distances"],
        )
        chunks = []
        if results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                chunks.append({
                    "text":            doc,
                    "source":          meta.get("source", "Unknown"),
                    "condition":       meta.get("condition"),
                    "relevance_score": round(1 - dist, 3),
                })
        chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
        return chunks[:top_k]

    def get_stats(self) -> dict:
        total = self.collection.count()
        try:
            all_meta      = self.collection.get(include=["metadatas"])["metadatas"]
            per_condition = {}
            for m in all_meta:
                c = m.get("condition", "unknown")
                per_condition[c] = per_condition.get(c, 0) + 1
        except Exception:
            per_condition = {}
        return {"total_chunks": total, "per_condition": per_condition}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--kb_dir",      default="data/knowledge_base")
    parser.add_argument("--persist_dir", default="data/chromadb")
    args = parser.parse_args()
    kb   = KnowledgeBase(persist_dir=args.persist_dir)
    kb.ingest_directory(args.kb_dir)
    stats = kb.get_stats()
    print(f"\nKB ready: {stats['total_chunks']} chunks")
    print(json.dumps(stats["per_condition"], indent=2))