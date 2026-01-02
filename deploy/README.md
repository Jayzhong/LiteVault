# LiteVault VPS Deployment Guide

This guide covers deploying LiteVault on a single VPS using Docker Compose.

## Prerequisites

- VPS with Ubuntu 22.04+ or similar
- Docker and Docker Compose installed
- Domain name pointed to VPS IP
- Clerk account with configured application

---

## Deployment Mode Selection

Choose based on your VPS setup:

| Mode | When to Use | Compose File |
|------|-------------|--------------|
| **Host Caddy** (recommended) | Caddy already running on VPS | `docker-compose.host-caddy.yml` |
| **Containerized Caddy** | No reverse proxy on VPS | `docker-compose.vps.yml` |

> ⚠️ **Port Conflict Warning:** If you already run Caddy/Nginx on ports 80/443, use Host Caddy mode. The containerized mode will fail due to port conflicts.

---

## Option A: Host Caddy Mode (Recommended)

Use this if Caddy is already running as a system service on your VPS.

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/LiteVault.git
cd LiteVault/deploy

cp .env.example .env
nano .env  # Configure all values
```

### 2. Start Services

```bash
docker compose -f docker-compose.host-caddy.yml up -d --build
```

### 3. Run Migrations

```bash
docker compose -f docker-compose.host-caddy.yml exec backend uv run alembic upgrade head
```

### 4. Configure Host Caddy

```bash
# Copy the example config
sudo cp caddy/Caddyfile.litevault.example /etc/caddy/conf.d/litevault.caddy

# Edit with your domain
sudo nano /etc/caddy/conf.d/litevault.caddy

# Reload Caddy
sudo systemctl reload caddy
```

### 5. Verify Deployment

```bash
# Check containers
docker compose -f docker-compose.host-caddy.yml ps

# Test via domain
curl https://your-domain.com/health
curl https://your-domain.com/readyz
```

---

## Option B: Containerized Caddy Mode

Use this only if NO reverse proxy runs on your VPS. Caddy runs in Docker and binds ports 80/443.

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/LiteVault.git
cd LiteVault/deploy

cp .env.example .env
nano .env
```

### 2. Deploy

```bash
docker compose -f docker-compose.vps.yml up -d --build
docker compose -f docker-compose.vps.yml exec backend uv run alembic upgrade head
```

### 3. Verify

```bash
curl https://your-domain.com/health
```

---

## Environment Variables

Edit `.env` with your values:

```bash
# Domain (only for containerized mode)
DOMAIN=your-domain.com

# Port bindings (only for host-caddy mode)
BACKEND_PORT=8000
FRONTEND_PORT=3000

# Database
POSTGRES_USER=litevault
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=litevault

# Clerk Authentication
CLERK_JWT_ISSUER=https://your-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# CORS (must match your domain)
CORS_ORIGINS=https://your-domain.com

# LLM Provider
LLM_PROVIDER=litellm
LLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=sk-...

# Backend API URL (for frontend)
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
```

---

## Configuration Management

### Recommended: Env File on VPS Only

Keep your production `.env` file on the VPS only—never commit it to git.

```bash
# On VPS
cd /path/to/LiteVault/deploy
nano .env  # Your secrets here

# The .env file is gitignored
```

### Optional: CD via SSH

If using GitHub Actions for continuous deployment:
1. Store only SSH private key in GitHub Secrets
2. Production `.env` stays on VPS
3. CD workflow SSHs in and runs `git pull && docker compose up -d --build`

Example workflow (store in `.github/workflows/deploy.yml`):
```yaml
# Simplified - adapt to your needs
- run: |
    ssh ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} \
      "cd /app/LiteVault/deploy && git pull && docker compose -f docker-compose.host-caddy.yml up -d --build"
```

---

## Updating

```bash
cd LiteVault
git pull origin main

cd deploy
docker compose -f docker-compose.host-caddy.yml up -d --build
docker compose -f docker-compose.host-caddy.yml exec backend uv run alembic upgrade head
```

## Rollback

```bash
git log --oneline -10
git checkout <commit-or-tag>

cd deploy
docker compose -f docker-compose.host-caddy.yml up -d --build
docker compose -f docker-compose.host-caddy.yml exec backend uv run alembic downgrade -1
```

---

## Logs

```bash
# Host Caddy mode
docker compose -f docker-compose.host-caddy.yml logs -f backend
docker compose -f docker-compose.host-caddy.yml logs -f frontend
docker compose -f docker-compose.host-caddy.yml logs -f postgres

# Containerized Caddy mode
docker compose -f docker-compose.vps.yml logs -f caddy
```

---

## Local Development vs Production

| Aspect | Local Dev | VPS Production |
|--------|-----------|----------------|
| Backend | `uv run uvicorn...` | Docker container |
| Frontend | `npm run dev` | Docker + standalone |
| Database | Local Postgres | Docker Postgres |
| Auth | `AUTH_MODE=mixed` | `AUTH_MODE=clerk` |
| TLS | None | Caddy auto-TLS |
| Quota | Unlimited (dev) | 2/day free |

---

## Troubleshooting

### Backend won't start
```bash
docker compose -f docker-compose.host-caddy.yml logs backend
# Common: AUTH_MODE not set to clerk
# Common: Missing CLERK_JWT_ISSUER
```

### Database connection failed
```bash
docker compose -f docker-compose.host-caddy.yml ps postgres
docker compose -f docker-compose.host-caddy.yml logs postgres
```

### TLS certificate issues

**Host Caddy mode:**
```bash
# Check host Caddy logs
sudo journalctl -u caddy -f

# Ensure domain DNS points to VPS
dig your-domain.com
```

**Containerized Caddy mode:**
```bash
docker compose -f docker-compose.vps.yml logs caddy
```

### Port conflict (containerized mode)
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Solution: Use host-caddy mode instead
```
