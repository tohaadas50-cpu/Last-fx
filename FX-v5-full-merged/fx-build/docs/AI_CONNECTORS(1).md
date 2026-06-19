# AI Connectors

This project ships with a pluggable provider design. The `backend/` modules are currently mocked. To connect real AI providers:

- Google Vertex AI: create an adapter in `backend/src/providers/googleVertexProvider.ts` that uses Vertex SDK or HTTP API. Provide credentials via `VERTEX_API_KEY` and document scopes.
- OpenAI: create `backend/src/providers/openaiProvider.ts` and use `OPENAI_API_KEY`.
- Local LLMs: see `local_models/README.md` for options (text-generation-webui, llama.cpp, or a hosted local server). Implement an adapter that forwards prompts to your local server.

Security & privacy:
- Keep API keys out of the repository and use environment variables or secure vaults.
- Consider rate limits and batching for production.
