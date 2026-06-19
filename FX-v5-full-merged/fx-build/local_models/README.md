# Local Models — Integration Notes

You can run local LLMs and expose a small HTTP adapter to integrate with the `backend/` provider interface.

Options:
- `text-generation-webui` (web UI + API)
- `llama.cpp`/`ggml` binaries with bridging server

The adapter should accept a prompt and return text or structured JSON. Keep latency considerations in mind.
