# Contributing to LiteVault

Solid code, crisp docs, and kindness. That's all we ask.

## Quickstart

1.  **Fork & Clone**: `git clone ...`
2.  **Branch**: `git checkout -b feature/topic-name`
3.  **Code**: Use the architecture patterns defined in `docs/architecture/`.
4.  **Test**:
    *   Backend: `uv run pytest`
    *   Frontend: `npm run lint` (Tests coming soon)
5.  **Commit**: Conventional Commits (e.g. `feat: add vector search`)
6.  **PR**: Open against `main`.

## Standards

*   **Backend**: `uv` for dependency management. `ruff` for linting.
*   **Frontend**: `Next.js` App Router patterns. `shadcn/ui` for components.
*   **Docs**: If you change the code, update the docs.
