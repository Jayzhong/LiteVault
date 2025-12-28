.PHONY: dev-db migrate dev test lint clean

# Start Postgres database
dev-db:
	docker compose up -d

# Run database migrations
migrate:
	uv run alembic upgrade head

# Start development server
dev:
	uv run uvicorn app.main:app --reload --port 8080

# Run tests
test:
	uv run pytest -v

# Run tests with coverage
test-cov:
	uv run pytest --cov=app --cov-report=term-missing

# Run linter
lint:
	uv run ruff check .
	uv run ruff format --check .

# Format code
format:
	uv run ruff format .
	uv run ruff check --fix .

# Type check
typecheck:
	uv run mypy app

# Clean up
clean:
	rm -rf .pytest_cache __pycache__ .mypy_cache .ruff_cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

# Full setup (for fresh clone)
setup: dev-db
	uv sync
	@echo "Waiting for Postgres..."
	sleep 3
	$(MAKE) migrate
	@echo "✅ Setup complete! Run 'make dev' to start the server."
