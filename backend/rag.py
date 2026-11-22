"""
RAG (Retrieval-Augmented Generation) pipeline for ZaiqaBox Karachi.
Retrieves top relevant knowledge chunks using rank_bm25 over verified client facts.
"""

import os
import re
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi


def simple_tokenize(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric tokens."""
    return re.findall(r"\b\w+\b", text.lower())


class KnowledgeBase:
    def __init__(self, knowledge_dir: str = "knowledge"):
        self.knowledge_dir = knowledge_dir
        self.chunks: List[Dict[str, Any]] = []
        self.bm25 = None
        self.load_knowledge()

    def load_knowledge(self):
        """Loads and chunks markdown files in knowledge directory."""
        self.chunks = []
        if not os.path.exists(self.knowledge_dir):
            print(f"[RAG] Knowledge directory '{self.knowledge_dir}' not found.")
            return

        for filename in sorted(os.listdir(self.knowledge_dir)):
            if not filename.endswith(".md"):
                continue

            filepath = os.path.join(self.knowledge_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                # Split on markdown headings (## or ###)
                sections = re.split(r"(?m)^(?=##+ )", content)
                for sec in sections:
                    clean_sec = sec.strip()
                    if not clean_sec:
                        continue

                    # Extract section heading if available
                    lines = clean_sec.splitlines()
                    heading = lines[0].lstrip("#").strip() if lines else filename
                    
                    self.chunks.append({
                        "source": filename,
                        "heading": heading,
                        "content": clean_sec,
                        "tokens": simple_tokenize(clean_sec)
                    })
            except Exception as e:
                print(f"[RAG] Error reading {filename}: {e}")

        # Index with BM25
        if self.chunks:
            tokenized_corpus = [c["tokens"] for c in self.chunks]
            self.bm25 = BM25Okapi(tokenized_corpus)
            print(f"[RAG] Indexed {len(self.chunks)} knowledge chunks from {self.knowledge_dir}")
        else:
            print("[RAG] No chunks indexed.")

    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves top_k chunks matching query.
        Returns list of dicts with source, heading, content, score.
        """
        if not self.bm25 or not self.chunks:
            return []

        query_tokens = simple_tokenize(query)
        if not query_tokens:
            return self.chunks[:top_k]

        scores = self.bm25.get_scores(query_tokens)
        
        # Rank by score descending
        ranked_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        results = []
        for idx in ranked_indices[:top_k]:
            chunk_data = self.chunks[idx].copy()
            chunk_data["score"] = float(scores[idx])
            results.append(chunk_data)

        # Fallback check: if top score is 0, include key chunks (e.g. plans, delivery, faq)
        if results and results[0]["score"] == 0:
            return self.chunks[:top_k]

        return results


# Global singleton instance
rag_engine = KnowledgeBase()
