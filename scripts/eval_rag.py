"""RAG Evaluation Script — measures retrieval quality on a curated question set.

Computes standard IR metrics (Hit Rate, MRR, Precision@k) by matching
retrieved chunks against expected product keywords. No LLM judge needed —
relevance is determined by whether a chunk's content mentions the expected
product name.

Usage:
    python scripts/eval_rag.py               # Evaluate with default k=8
    python scripts/eval_rag.py --k 4         # Evaluate top-4
    python scripts/eval_rag.py --k 4 8 12    # Evaluate multiple k values
    python scripts/eval_rag.py --verbose     # Show per-question details
"""

import json
import sys
from pathlib import Path

# Add backend to Python path so we can import the app package
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from app.config import settings
from app.core.vector_store import get_vector_store


# ── Dataset loading ────────────────────────────────────────────

def load_eval_dataset(path: Path) -> list[dict]:
    """Load the evaluation question set from JSON."""
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("Eval dataset must be a JSON array")
    if not data:
        raise ValueError("Eval dataset is empty")

    required = {"question", "expected_filename"}
    for i, item in enumerate(data):
        missing = required - set(item.keys())
        if missing:
            raise ValueError(f"Item {i} is missing required fields: {missing}")

    return data


# ── Relevance judgment ─────────────────────────────────────────

def is_relevant(doc, expected_filename: str) -> bool:
    """Check if a retrieved chunk is relevant to the question.

    Relevance is determined by document filename — every chunk inherits
    the filename of its source document in metadata.  This is robust to
    chunk boundaries: a specs-only chunk from oxford-shirt.csv still
    matches because it carries the filename, even though it doesn't
    contain the word "oxford".
    """
    chunk_filename = doc.metadata.get("filename", "").lower()
    return expected_filename.lower() in chunk_filename


# ── Retrieval ──────────────────────────────────────────────────

def retrieve_at_k(question: str, k: int) -> list:
    """Retrieve top-k chunks using the production MMR retriever.

    Uses the same vector store, embeddings, and MMR parameters as the
    production RAG pipeline so evaluation results reflect real behaviour.
    """
    vector_store = get_vector_store()
    return vector_store.max_marginal_relevance_search(
        question,
        k=k,
        fetch_k=settings.retrieval_fetch_k,
        lambda_mult=settings.retrieval_lambda_mult,
    )


# ── Per-question evaluation ────────────────────────────────────

def evaluate_single(question: str, expected_filename: str, k: int) -> dict:
    """Run retrieval for one question and return metrics."""
    docs = retrieve_at_k(question, k)

    relevance = [is_relevant(doc, expected_filename) for doc in docs]
    first_relevant_rank = next(
        (i + 1 for i, r in enumerate(relevance) if r), None
    )

    # Collect unique source filenames for diversity measurement
    sources = [doc.metadata.get("filename", "?") for doc in docs]
    unique_sources = list(dict.fromkeys(sources))  # order-preserving dedup

    return {
        "question": question,
        "expected_filename": expected_filename,
        "num_retrieved": len(docs),
        "num_relevant": sum(relevance),
        "first_relevant_rank": first_relevant_rank,
        "unique_sources": unique_sources,
        "source_count": len(unique_sources),
    }


# ── Aggregate metrics ──────────────────────────────────────────

def compute_metrics(per_question: list[dict], k: int) -> dict:
    """Compute aggregate retrieval metrics from per-question results."""
    n = len(per_question)
    if n == 0:
        return {}

    hit_count = sum(1 for r in per_question if r["num_relevant"] > 0)
    mrr_values = [
        1.0 / r["first_relevant_rank"] if r["first_relevant_rank"] else 0.0
        for r in per_question
    ]
    precision_values = [
        r["num_relevant"] / max(r["num_retrieved"], 1) for r in per_question
    ]
    total_relevant = sum(r["num_relevant"] for r in per_question)
    total_retrieved = sum(r["num_retrieved"] for r in per_question)
    avg_source_diversity = sum(r["source_count"] for r in per_question) / n

    return {
        "k": k,
        "num_questions": n,
        "hit_rate": hit_count / n if n > 0 else 0,
        "mrr": sum(mrr_values) / n if n > 0 else 0,
        "precision": total_relevant / max(total_retrieved, 1),
        "avg_precision": sum(precision_values) / n if n > 0 else 0,
        "avg_source_diversity": avg_source_diversity,
        "total_relevant_chunks": total_relevant,
        "total_retrieved_chunks": total_retrieved,
        "missed_questions": [
            r["question"] for r in per_question if r["num_relevant"] == 0
        ],
    }


# ── Main ───────────────────────────────────────────────────────

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Evaluate RAG retrieval quality on a curated question set"
    )
    parser.add_argument(
        "--k", type=int, nargs="+", default=[8],
        help="Number of chunks to retrieve per query (default: 8)",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Show per-question details including sources found",
    )
    parser.add_argument(
        "--dataset", type=str,
        default=str(PROJECT_ROOT / "scripts" / "eval_questions.json"),
        help="Path to eval dataset JSON",
    )
    args = parser.parse_args()

    # ── Pre-flight checks ──────────────────────────────────

    if not settings.bailian_api_key:
        print("ERROR: BAILIAN_API_KEY is not set in .env")
        print("The evaluation script needs the Bailian API to embed queries.")
        print("Copy .env.example to .env and fill in your API key.")
        sys.exit(1)

    dataset_path = Path(args.dataset)
    if not dataset_path.exists():
        print(f"ERROR: Dataset not found at {dataset_path}")
        sys.exit(1)

    questions = load_eval_dataset(dataset_path)
    print(f"Loaded {len(questions)} evaluation questions\n")

    # ── Check vector store ─────────────────────────────────

    try:
        vector_store = get_vector_store()
        count = vector_store._collection.count()
        if count == 0:
            print("ERROR: Vector store is empty — no chunks to retrieve.")
            print("  Upload documents before running evaluation.")
            print("  Hint: use the admin UI at /admin/knowledge-base")
            print("  or seed with: python scripts/seed_admin.py")
            sys.exit(1)
        print(f"Vector store: {count} chunks available\n")
    except Exception as e:
        print(f"WARNING: Could not verify vector store ({e})\n")

    # ── Evaluate at each k ─────────────────────────────────

    all_metrics = []

    for k in sorted(args.k):
        print(f"{'=' * 60}")
        print(f"Evaluating retrieval @{k}")
        print(f"{'=' * 60}")

        per_question: list[dict] = []
        errors = 0

        for i, q in enumerate(questions, 1):
            try:
                result = evaluate_single(
                    q["question"], q["expected_filename"], k
                )
                per_question.append(result)

                if args.verbose:
                    status = "✓" if result["num_relevant"] > 0 else "✗"
                    rank = (
                        f"rank {result['first_relevant_rank']}"
                        if result["first_relevant_rank"]
                        else "no match"
                    )
                    sources = ", ".join(result["unique_sources"])
                    print(
                        f"  [{status}] Q{i}: {q['question'][:72]}..."
                        f"\n       {result['num_relevant']}/{k} relevant, {rank}"
                        f"\n       sources: {sources}"
                    )
            except Exception as exc:
                errors += 1
                print(f"  [ERR] Q{i}: {q['question'][:60]}... — {exc}")

        metrics = compute_metrics(per_question, k)
        all_metrics.append(metrics)

        print(f"\n{chr(0x2500) * 60}")
        print(f"Results @{k}")
        print(f"{chr(0x2500) * 60}")
        print(
            f"  Hit Rate:              {metrics['hit_rate']:.1%}  "
            f"({int(metrics['hit_rate'] * metrics['num_questions'])}/"
            f"{metrics['num_questions']} questions had >=1 relevant chunk)"
        )
        print(
            f"  MRR:                   {metrics['mrr']:.3f}  "
            f"(mean reciprocal rank of 1st relevant chunk)"
        )
        print(
            f"  Precision@{k}:          {metrics['precision']:.1%}  "
            f"({metrics['total_relevant_chunks']}/"
            f"{metrics['total_retrieved_chunks']} chunks relevant)"
        )
        print(
            f"  Avg Source Diversity:  {metrics['avg_source_diversity']:.1f}  "
            f"(unique sources per query, out of {k})"
        )
        if errors:
            print(f"  Errors:                {errors}")
        if metrics["missed_questions"]:
            print(f"\n  Questions with zero relevant chunks:")
            for missed in metrics["missed_questions"]:
                print(f"    - {missed[:80]}...")
        print()

    # ── Summary ────────────────────────────────────────────

    print(f"{'=' * 60}")
    print("Interpretation Guide")
    print(f"{'=' * 60}")
    print(f"  Evaluated {len(questions)} questions across 7 product categories.")
    print(f"  Relevance: chunk source filename matches expected product file.")
    print()
    print("  Hit Rate >= 80%   : retrieval reliably finds the right product")
    print("  Hit Rate < 50%    : chunking or embedding may need tuning")
    print("  MRR close to 1.0  : first relevant chunk appears near position 1")
    print("  MRR < 0.3         : relevant chunks are buried deep in results")
    print("  High Precision    : MMR diversity is effective, few irrelevant chunks")
    print("  Low Precision     : too many chunks from wrong products")
    print("  High Diversity    : results draw from multiple products (good for")
    print("                      comparison questions; may hurt focused lookups)")
    print()
    print("  Note: This measures retrieval only — not answer generation quality.")
    print("  For answer quality, consider adding RAGAS (ragas.io) metrics such")
    print("  as faithfulness and answer relevancy, which require LLM judges.")


if __name__ == "__main__":
    main()
