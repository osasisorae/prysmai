"""
Prysm AI — Observability SDK for LLM applications.

Usage:
    import openai
    from prysm import monitor

    client = openai.OpenAI(api_key="sk-...")
    monitored = monitor(client, prysm_key="sk-prysm-...")

    # Every call is now tracked through Prysm.
    response = monitored.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello!"}],
    )
"""

from prysm.client import monitor, PrysmClient
from prysm.context import prysm_context, PrysmContext

__version__ = "0.1.0"
__all__ = ["monitor", "PrysmClient", "prysm_context", "PrysmContext", "__version__"]
