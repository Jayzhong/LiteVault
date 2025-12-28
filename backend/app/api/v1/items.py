"""Items API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, status

from app.api.dependencies import (
    get_current_user,
    get_item_repository,
    get_idempotency_repository,
    get_outbox_repository,
)
from app.api.schemas.items import (
    CreateItemRequest,
    ItemResponse,
    PendingItemsResponse,
    UpdateItemRequest,
    UpdateItemResponse,
    RetryResponse,
)
from app.domain.entities.user import User
from app.infrastructure.persistence.repositories.item_repository_impl import (
    SQLAlchemyItemRepository,
)
from app.infrastructure.persistence.repositories.idempotency_repository_impl import (
    SQLAlchemyIdempotencyRepository,
)
from app.infrastructure.persistence.repositories.outbox_repository_impl import (
    SQLAlchemyOutboxRepository,
)
from app.application.items.create_item import CreateItemUseCase
from app.application.items.get_pending_items import GetPendingItemsUseCase
from app.application.items.get_item import GetItemUseCase
from app.application.items.update_item import UpdateItemUseCase
from app.application.items.retry_enrichment import RetryEnrichmentUseCase
from app.application.items.dtos import (
    CreateItemInput,
    GetPendingItemsInput,
    GetItemInput,
    UpdateItemInput,
    RetryEnrichmentInput,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ItemResponse)
async def create_item(
    request: CreateItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    idempotency_repo: Annotated[
        SQLAlchemyIdempotencyRepository, Depends(get_idempotency_repository)
    ],
    outbox_repo: Annotated[SQLAlchemyOutboxRepository, Depends(get_outbox_repository)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ItemResponse:
    """Create a new item."""
    use_case = CreateItemUseCase(item_repo, idempotency_repo, outbox_repo)
    output = await use_case.execute(
        CreateItemInput(
            user_id=current_user.id,
            raw_text=request.rawText,
            idempotency_key=idempotency_key,
        )
    )
    return ItemResponse(
        id=output.id,
        rawText=output.raw_text,
        title=output.title,
        summary=output.summary,
        tags=output.tags,
        status=output.status,
        sourceType=output.source_type,
        createdAt=output.created_at,
        updatedAt=output.updated_at,
        confirmedAt=output.confirmed_at,
    )


@router.get("/pending", response_model=PendingItemsResponse)
async def get_pending_items(
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
) -> PendingItemsResponse:
    """Get pending items for current user."""
    use_case = GetPendingItemsUseCase(item_repo)
    output = await use_case.execute(GetPendingItemsInput(user_id=current_user.id))
    return PendingItemsResponse(
        items=[
            ItemResponse(
                id=item.id,
                rawText=item.raw_text,
                title=item.title,
                summary=item.summary,
                tags=item.tags,
                status=item.status,
                sourceType=item.source_type,
                createdAt=item.created_at,
                updatedAt=item.updated_at,
                confirmedAt=item.confirmed_at,
            )
            for item in output.items
        ],
        total=output.total,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
) -> ItemResponse:
    """Get item by ID."""
    use_case = GetItemUseCase(item_repo)
    output = await use_case.execute(
        GetItemInput(user_id=current_user.id, item_id=item_id)
    )
    return ItemResponse(
        id=output.id,
        rawText=output.raw_text,
        title=output.title,
        summary=output.summary,
        tags=output.tags,
        status=output.status,
        sourceType=output.source_type,
        createdAt=output.created_at,
        updatedAt=output.updated_at,
        confirmedAt=output.confirmed_at,
    )


@router.patch("/{item_id}", response_model=UpdateItemResponse)
async def update_item(
    item_id: str,
    request: UpdateItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    outbox_repo: Annotated[SQLAlchemyOutboxRepository, Depends(get_outbox_repository)],
) -> UpdateItemResponse:
    """Update item (confirm, discard, or edit)."""
    use_case = UpdateItemUseCase(item_repo, outbox_repo)
    output = await use_case.execute(
        UpdateItemInput(
            user_id=current_user.id,
            item_id=item_id,
            action=request.action,
            title=request.title,
            summary=request.summary,
            tags=request.tags,
        )
    )
    return UpdateItemResponse(
        id=output.id,
        status=output.status,
        title=output.title,
        summary=output.summary,
        tags=output.tags,
        updatedAt=output.updated_at,
        confirmedAt=output.confirmed_at,
    )


@router.post("/{item_id}/retry", response_model=RetryResponse)
async def retry_enrichment(
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    outbox_repo: Annotated[SQLAlchemyOutboxRepository, Depends(get_outbox_repository)],
) -> RetryResponse:
    """Retry enrichment for failed item."""
    use_case = RetryEnrichmentUseCase(item_repo, outbox_repo)
    output = await use_case.execute(
        RetryEnrichmentInput(user_id=current_user.id, item_id=item_id)
    )
    return RetryResponse(
        id=output.id,
        status=output.status,
        updatedAt=output.updated_at,
    )
