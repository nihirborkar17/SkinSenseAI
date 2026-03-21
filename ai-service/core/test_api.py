"""
test_api.py — Send an image to the running API and print the result.
Usage:
    python test_api.py --image path/to/skin_image.jpg
"""

import argparse
import json
import requests

API_URL = "http://127.0.0.1:8000"

def test_analyze(image_path: str):
    print(f"\nSending: {image_path}")
    print("="*50)

    with open(image_path, "rb") as f:
        response = requests.post(
            f"{API_URL}/api/analyze",
            files={"file": (image_path, f, "image/jpeg")},
        )

    if response.status_code != 200:
        print(f"ERROR {response.status_code}: {response.text}")
        return

    result = response.json()

    print(f"  Top class    : {result['top_class_full']} ({result['top_class']})")
    print(f"  Confidence   : {result['confidence']}%")
    print(f"  Severity     : {result['severity_label']} (level {result['severity_level']}/4)")
    print(f"  Session ID   : {result['session_id']}")
    print()
    print("  All class probabilities:")
    for c in result["all_classes"]:
        bar = "#" * int(c["probability"] / 5)
        print(f"    {c['class']:<5} {bar:<20} {c['probability']:.1f}%")

    print()
    print("  Suggested questions:")
    for q in result["suggested_questions"]:
        print(f"    - {q}")

    print(f"\n  Disclaimer: {result['disclaimer']}")

    # Optional: test chat with the returned session_id
    session_id = result["session_id"]
    print(f"\n{'='*50}")
    print("Testing chat endpoint...")
    chat_response = requests.post(
        f"{API_URL}/api/chat",
        json={
            "session_id": session_id,
            "message": "What is this condition and should I be concerned?",
            "stream": False,
        },
    )
    if chat_response.status_code == 200:
        print(f"\n  Q: What is this condition and should I be concerned?")
        print(f"  A: {chat_response.json()['answer']}")
    elif chat_response.status_code == 503:
        print("  Chat not available (RAG not configured yet)")
    else:
        print(f"  Chat error: {chat_response.status_code}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to skin lesion image (JPEG/PNG)")
    args = parser.parse_args()
    test_analyze(args.image)