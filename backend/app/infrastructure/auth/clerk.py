"""Clerk JWT verification and auth dependencies."""

import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from jwt import PyJWKClient, PyJWK

from app.config import Settings


@dataclass
class ClerkPrincipal:
    """Authenticated user principal from Clerk JWT."""
    clerk_user_id: str
    email: str | None = None
    name: str | None = None
    avatar_url: str | None = None


class ClerkJWTVerificationError(Exception):
    """Error during Clerk JWT verification."""
    pass


class ClerkJWTVerifier:
    """Verifies Clerk JWT tokens using JWKS."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._jwks_client: PyJWKClient | None = None
        self._jwks_cache_time: float = 0
        self._jwks_cache_ttl: float = 3600  # 1 hour cache

    def _get_jwks_client(self) -> PyJWKClient:
        """Get or create JWKS client with caching."""
        now = time.time()
        
        # Refresh cache if expired or not initialized
        if self._jwks_client is None or (now - self._jwks_cache_time) > self._jwks_cache_ttl:
            if not self.settings.clerk_jwks_url:
                raise ClerkJWTVerificationError("CLERK_JWKS_URL not configured")
            
            self._jwks_client = PyJWKClient(
                self.settings.clerk_jwks_url,
                cache_keys=True,
                lifespan=int(self._jwks_cache_ttl),
            )
            self._jwks_cache_time = now
        
        return self._jwks_client

    def verify_token(self, token: str) -> ClerkPrincipal:
        """
        Verify a Clerk JWT token and extract the principal.
        
        Args:
            token: The JWT token string (without 'Bearer ' prefix)
            
        Returns:
            ClerkPrincipal with user information
            
        Raises:
            ClerkJWTVerificationError: If verification fails
        """
        try:
            # Get signing key from JWKS
            jwks_client = self._get_jwks_client()
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            
            # Decode and verify token
            options: dict[str, Any] = {
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "require": ["sub", "exp", "nbf", "iss"],
            }
            
            # Build decode kwargs
            decode_kwargs: dict[str, Any] = {
                "algorithms": ["RS256"],
                "options": options,
            }
            
            # Add issuer validation if configured
            if self.settings.clerk_jwt_issuer:
                decode_kwargs["issuer"] = self.settings.clerk_jwt_issuer
            
            # Add audience validation if configured
            if self.settings.clerk_audience:
                decode_kwargs["audience"] = self.settings.clerk_audience
            
            payload = jwt.decode(
                token,
                signing_key.key,
                **decode_kwargs,
            )
            
            # Extract clerk_user_id from sub claim
            clerk_user_id = payload.get("sub")
            if not clerk_user_id:
                raise ClerkJWTVerificationError("Missing 'sub' claim in token")
            
            # Extract optional claims
            # Clerk tokens may include these in various places
            email = payload.get("email") or payload.get("primary_email_address")
            name = payload.get("name") or payload.get("first_name")
            avatar_url = payload.get("image_url") or payload.get("profile_image_url")
            
            return ClerkPrincipal(
                clerk_user_id=clerk_user_id,
                email=email,
                name=name,
                avatar_url=avatar_url,
            )
            
        except jwt.ExpiredSignatureError:
            raise ClerkJWTVerificationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise ClerkJWTVerificationError(f"Invalid token: {e}")
        except Exception as e:
            raise ClerkJWTVerificationError(f"Token verification failed: {e}")


# Global verifier instance (lazy initialization)
_clerk_verifier: ClerkJWTVerifier | None = None


def get_clerk_verifier(settings: Settings) -> ClerkJWTVerifier:
    """Get or create the Clerk JWT verifier."""
    global _clerk_verifier
    if _clerk_verifier is None:
        _clerk_verifier = ClerkJWTVerifier(settings)
    return _clerk_verifier
