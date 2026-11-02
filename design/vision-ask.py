#!/usr/bin/env python3
"""vision-ask.py - one image, one short question, at the local endpoint.

Recipe learned the hard way (PITFALLS: "the local vision endpoint"):
  - `mistralai/ministral-3-14b-reasoning` ignores every reasoning-off flag but its reasoning scales with question
    complexity, so a multi-field question spends the whole budget thinking and returns an empty string.
  - So: one image per call, one short question, max_tokens 2400, temperature 0, image downscaled to ~640px.
  - Always check finish_reason and non-empty content. HTTP 200 with content="" is a failure, not a result.
  - Output is a hypothesis to verify against code or pixels (D80), never a measurement.

Usage: python3 design/vision-ask.py <image> "<short question>" [model]
"""
import base64
import json
import sys
import time
import urllib.request

DEFAULT_MODEL = "mistralai/ministral-3-14b-reasoning"
ENDPOINT = "http://127.0.0.1:1234/v1/chat/completions"


def ask(image: str, question: str, model: str = DEFAULT_MODEL, max_tokens: int = 2400) -> int:
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": 0,
        "messages": [{
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + base64.b64encode(open(image, "rb").read()).decode()}},
            ],
        }],
    }
    req = urllib.request.Request(ENDPOINT, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"})
    started = time.time()
    try:
        reply = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:400]}")
        return 1
    choice, usage = reply["choices"][0], reply.get("usage", {})
    content = (choice["message"].get("content") or "").strip()
    details = usage.get("completion_tokens_details", {})
    print(f"model={model} finish={choice['finish_reason']} completion={usage.get('completion_tokens')} reasoning={details.get('reasoning_tokens')} {time.time() - started:.0f}s")
    print(content if content else "<EMPTY - question too complex or budget too small, retry with a shorter one>")
    return 0 if content else 2


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(ask(sys.argv[1], sys.argv[2], *sys.argv[3:]))
