"""Tags API endpoints."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import get_current_user, get_db_session
from app.api.schemas.tags import (
    TagResponse,
    TagsListResponse,
    CreateTagRequest,
    RenameTagRequest,
)
from app.domain.entities.user import User
from app.domain.entities.tag import Tag
from app.domain.exceptions import TagExistsException, TagNotFoundException
from app.infrastructure.persistence.repositories.tag_repository_impl import (
    SQLAlchemyTagRepository,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/tags", tags=["tags"])


async def get_tag_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)]
) -> SQLAlchemyTagRepository:
    """Get tag repository."""
    return SQLAlchemyTagRepository(session)


def tag_to_response(tag: Tag) -> TagResponse:
    """Convert Tag entity to response."""
    return TagResponse(
        id=tag.id,
        name=tag.name,
        usageCount=tag.usage_count,
        lastUsed=tag.last_used,
        createdAt=tag.created_at or datetime.now(timezone.utc),
    )


@router.get("", response_model=TagsListResponse)
async def get_tags(
    current_user: Annotated[User, Depends(get_current_user)],
    tag_repo: Annotated[SQLAlchemyTagRepository, Depends(get_tag_repository)],
    q: str | None = Query(None, description="Search by name"),
    sort: str = Query("name", description="Sort by: name, usage, lastUsed"),
    unused: bool | None = Query(None, description="Filter by unused (usageCount=0)"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
) -> TagsListResponse:
    """List tags for current user with filtering and sorting."""
    tags = await tag_repo.list_by_user(
        user_id=current_user.id,
        query=q,
        show_unused=unused,
        sort=sort,
        limit=limit,
    )
    total = await tag_repo.count_by_user(current_user.id)
    
    return TagsListResponse(
        tags=[tag_to_response(tag) for tag in tags],
        total=total,
    )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TagResponse)
async def create_tag(
    request: CreateTagRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tag_repo: Annotated[SQLAlchemyTagRepository, Depends(get_tag_repository)],
) -> TagResponse:
    """Create a new tag."""
    # Check for duplicate (case-insensitive)
    name = request.name.strip()
    existing = await tag_repo.get_by_name(name, current_user.id)
    if existing:
        raise TagExistsException(
            f"Tag '{name}' already exists",
            details={"tagName": name},
        )
    
    # Create tag
    tag = Tag(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=name,
        name_lower=name.lower(),
        usage_count=0,
        last_used=None,
        created_at=datetime.now(timezone.utc),
    )
    created = await tag_repo.create(tag)
    return tag_to_response(created)


@router.patch("/{tag_id}", response_model=TagResponse)
async def rename_tag(
    tag_id: str,
    request: RenameTagRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    tag_repo: Annotated[SQLAlchemyTagRepository, Depends(get_tag_repository)],
) -> TagResponse:
    """Rename a tag."""
    # Get existing tag
    tag = await tag_repo.get_by_id(tag_id, current_user.id)
    if not tag:
        raise TagNotFoundException("Tag not found", details={"tagId": tag_id})
    
    # Check for duplicate name (case-insensitive)
    new_name = request.name.strip()
    if new_name.lower() != tag.name_lower:
        existing = await tag_repo.get_by_name(new_name, current_user.id)
        if existing:
            raise TagExistsException(
                f"Tag '{new_name}' already exists",
                details={"tagName": new_name},
            )
    
    # Update tag
    tag.name = new_name
    tag.name_lower = new_name.lower()
    updated = await tag_repo.update(tag)
    return tag_to_response(updated)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    tag_repo: Annotated[SQLAlchemyTagRepository, Depends(get_tag_repository)],
) -> None:
    """Delete a tag."""
    deleted = await tag_repo.delete(tag_id, current_user.id)
    if not deleted:
        raise TagNotFoundException("Tag not found", details={"tagId": tag_id})
