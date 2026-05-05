#!/usr/bin/env python3
"""
CreatorVault Quality Standards Engine — Scoring CLI
Usage:
  python3 score.py                  # Interactive evaluation wizard
  python3 score.py --history        # Print all past results
  python3 score.py --report         # Print a full quality report
  python3 score.py --module vaultx  # Filter history by module
"""

import json
import os
import sys
import argparse
from datetime import datetime

RESULTS_FILE = os.path.join(os.path.dirname(__file__), "results.json")

# ─── Rubric Definitions ────────────────────────────────────────────────────────

DIMENSIONS = {
    "FT": {
        "name": "Functional Truth",
        "question": "Does it actually work end-to-end? (No mock data, no dead ends, DB writes persist)",
    },
    "OQ": {
        "name": "Output Quality",
        "question": "Does the result look premium, not demo-like? (Modern UI, polished output, no watermarks)",
    },
    "CV": {
        "name": "Creator Value",
        "question": "Does it improve monetization, workflow, or speed? (Solves a real problem, drives revenue)",
    },
    "RE": {
        "name": "Reliability",
        "question": "Does it work repeatedly? (Handles edge cases, no silent failures, no race conditions)",
    },
    "UX": {
        "name": "UX Confidence",
        "question": "Does it feel trustworthy and polished? (Loading states, error handling, micro-interactions)",
    },
}

SCORE_LABELS = {
    0: "Broken",
    1: "Barely runs",
    2: "Demo-level (AUTO-FAIL)",
    3: "Functional, acceptable",
    4: "Premium",
    5: "World-class",
}

MODULES = [
    "vaultx-studio",
    "vaultx-editor",
    "vaultx-analytics",
    "clone-engine",
    "clone-gallery",
    "telegram-automation",
    "whatsapp-automation",
    "monetization-checkout",
    "monetization-ppv",
    "monetization-subscriptions",
    "monetization-tips",
    "admin-command-hub",
    "admin-analytics",
    "music-ai",
    "viral-optimizer",
    "recruitment-dashboard",
    "thumbnail-generator",
    "script-director",
    "design-department",
    "other",
]

# ─── Pass/Fail Logic ───────────────────────────────────────────────────────────

def evaluate(scores: dict) -> dict:
    """Apply the CreatorVault pass/fail logic to a set of scores."""
    values = list(scores.values())
    average = sum(values) / len(values)
    min_score = min(values)
    
    # Auto-fail triggers
    auto_fail_reasons = []
    if min_score < 3:
        failing_dims = [DIMENSIONS[k]["name"] for k, v in scores.items() if v < 3]
        auto_fail_reasons.append(f"Score below 3 in: {', '.join(failing_dims)}")
    
    passed = average >= 4.0 and min_score >= 3 and len(auto_fail_reasons) == 0
    
    return {
        "average": round(average, 2),
        "min_score": min_score,
        "passed": passed,
        "auto_fail_reasons": auto_fail_reasons,
        "grade": get_grade(average, passed),
    }

def get_grade(average: float, passed: bool) -> str:
    if not passed:
        return "FAIL"
    if average >= 4.8:
        return "S — World-Class"
    if average >= 4.5:
        return "A — Premium"
    if average >= 4.0:
        return "B — Passes Standard"
    return "FAIL"

# ─── Storage ───────────────────────────────────────────────────────────────────

def load_results() -> list:
    if not os.path.exists(RESULTS_FILE):
        return []
    with open(RESULTS_FILE, "r") as f:
        return json.load(f)

def save_result(result: dict):
    results = load_results()
    results.append(result)
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n  ✓ Result saved to results.json (#{len(results)} total evaluations)")

# ─── Display Helpers ───────────────────────────────────────────────────────────

def print_separator(char="─", width=60):
    print(char * width)

def print_score_row(key: str, score: int):
    bar = "█" * score + "░" * (5 - score)
    label = SCORE_LABELS[score]
    color = "\033[91m" if score < 3 else ("\033[93m" if score == 3 else "\033[92m")
    reset = "\033[0m"
    print(f"  {DIMENSIONS[key]['name']:<20} [{bar}] {color}{score}/5{reset}  {label}")

def print_result_summary(result: dict):
    print_separator("═")
    status_color = "\033[92m" if result["verdict"]["passed"] else "\033[91m"
    reset = "\033[0m"
    print(f"  MODULE:   {result['module']}")
    print(f"  FEATURE:  {result['feature']}")
    print(f"  DATE:     {result['timestamp'][:10]}")
    print(f"  EVALUATOR:{result['evaluator']}")
    print_separator()
    for key, score in result["scores"].items():
        print_score_row(key, score)
    print_separator()
    avg = result["verdict"]["average"]
    grade = result["verdict"]["grade"]
    status = f"{status_color}{'✅ PASS' if result['verdict']['passed'] else '❌ FAIL'}{reset}"
    print(f"  AVERAGE:  {avg}/5.0   GRADE: {grade}   {status}")
    if result["verdict"]["auto_fail_reasons"]:
        print(f"\033[91m  AUTO-FAIL: {'; '.join(result['verdict']['auto_fail_reasons'])}\033[0m")
    if result.get("notes"):
        print(f"\n  NOTES: {result['notes']}")
    print_separator("═")

# ─── Interactive Wizard ────────────────────────────────────────────────────────

def run_wizard():
    print("\n" + "═" * 60)
    print("  CREATORVAULT QUALITY STANDARDS ENGINE")
    print("  Evaluation Wizard")
    print("═" * 60)

    # Module selection
    print("\nModules:")
    for i, m in enumerate(MODULES):
        print(f"  {i+1:2}. {m}")
    while True:
        try:
            idx = int(input("\nSelect module number: ")) - 1
            if 0 <= idx < len(MODULES):
                module = MODULES[idx]
                break
        except (ValueError, KeyboardInterrupt):
            pass
        print("  Invalid. Enter a number from the list.")

    feature = input(f"\nFeature name (e.g., 'Video Export', 'PPV Checkout'): ").strip()
    evaluator = input("Your name or 'manus': ").strip() or "manus"

    # Scoring
    print(f"\n{'─'*60}")
    print("  SCORING  (enter 0–5 for each dimension)")
    print(f"{'─'*60}")
    for label, desc in SCORE_LABELS.items():
        print(f"  {label} = {desc}")
    print(f"{'─'*60}\n")

    scores = {}
    for key, dim in DIMENSIONS.items():
        print(f"  [{key}] {dim['name']}")
        print(f"       {dim['question']}")
        while True:
            try:
                score = int(input(f"       Score (0-5): "))
                if 0 <= score <= 5:
                    scores[key] = score
                    break
            except (ValueError, KeyboardInterrupt):
                pass
            print("       Invalid. Enter 0-5.")
        print()

    notes = input("Notes (optional, press Enter to skip): ").strip()

    # Verdict
    verdict = evaluate(scores)

    result = {
        "module": module,
        "feature": feature,
        "evaluator": evaluator,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "scores": scores,
        "verdict": verdict,
        "notes": notes,
    }

    print("\n" + "─" * 60)
    print("  EVALUATION RESULT")
    print_result_summary(result)

    save = input("\nSave this result? (y/n): ").strip().lower()
    if save == "y":
        save_result(result)

# ─── History & Report ─────────────────────────────────────────────────────────

def print_history(module_filter: str = None):
    results = load_results()
    if not results:
        print("No results found. Run an evaluation first.")
        return

    filtered = [r for r in results if not module_filter or r["module"] == module_filter]
    if not filtered:
        print(f"No results for module: {module_filter}")
        return

    print(f"\n{'═'*60}")
    print(f"  EVALUATION HISTORY  ({len(filtered)} records)")
    print(f"{'═'*60}")
    for r in filtered:
        status = "✅ PASS" if r["verdict"]["passed"] else "❌ FAIL"
        print(f"  {r['timestamp'][:10]}  {r['module']:<30} {r['feature']:<25} {r['verdict']['average']}/5.0  {status}")
    print(f"{'═'*60}")

def print_report():
    results = load_results()
    if not results:
        print("No results found.")
        return

    total = len(results)
    passed = sum(1 for r in results if r["verdict"]["passed"])
    failed = total - passed
    avg_overall = sum(r["verdict"]["average"] for r in results) / total

    # Per-module breakdown
    modules_seen = {}
    for r in results:
        m = r["module"]
        if m not in modules_seen:
            modules_seen[m] = {"total": 0, "passed": 0, "scores": []}
        modules_seen[m]["total"] += 1
        modules_seen[m]["passed"] += int(r["verdict"]["passed"])
        modules_seen[m]["scores"].append(r["verdict"]["average"])

    print(f"\n{'═'*60}")
    print("  CREATORVAULT QUALITY REPORT")
    print(f"{'═'*60}")
    print(f"  Total Evaluations : {total}")
    print(f"  Passed            : {passed} ({round(passed/total*100)}%)")
    print(f"  Failed            : {failed} ({round(failed/total*100)}%)")
    print(f"  Overall Average   : {round(avg_overall, 2)}/5.0")
    print(f"{'─'*60}")
    print(f"  {'Module':<30} {'Evals':>5} {'Pass%':>6} {'Avg':>6}")
    print(f"{'─'*60}")
    for m, data in sorted(modules_seen.items()):
        pass_pct = round(data["passed"] / data["total"] * 100)
        avg = round(sum(data["scores"]) / len(data["scores"]), 2)
        print(f"  {m:<30} {data['total']:>5} {pass_pct:>5}% {avg:>6}")
    print(f"{'═'*60}")

# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="CreatorVault Quality Standards Engine")
    parser.add_argument("--history", action="store_true", help="Print evaluation history")
    parser.add_argument("--report", action="store_true", help="Print quality report")
    parser.add_argument("--module", type=str, help="Filter history by module name")
    args = parser.parse_args()

    if args.history or args.module:
        print_history(args.module)
    elif args.report:
        print_report()
    else:
        run_wizard()

if __name__ == "__main__":
    main()
