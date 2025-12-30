"""Items API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, status

from app.api.dependencies import (
    get_current_user,
    get_item_repository,
    get_idempotency_repository,
    get_outbox_repository,
    get_tag_repository,
    get_item_tag_repository,
    get_item_tag_suggestion_repository,
)
from app.api.schemas.items import (
    CreateItemRequest,
    ItemResponse,
    PendingItemsResponse,
    UpdateItemRequest,
    UpdateItemResponse,
    RetryResponse,
    TagInItem,
    SuggestedTagInItem,
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


async def resolve_tags_to_objects(
    tag_names: list[str], user_id: str, tag_repo
) -> list[TagInItem]:
    """Resolve tag names to full TagInItem objects.
    
    For each tag name, looks up the tag by name to get id and color.
    If tag not found (shouldn't happen), creates a minimal object.
    """
    if not tag_names or not tag_repo:
        return []
    
    result = []
    for name in tag_names:
        tag = await tag_repo.get_by_name(name, user_id)
        if tag:
            result.append(TagInItem(id=tag.id, name=tag.name, color=tag.color))
        else:
            # Fallback for tags not yet persisted
            result.append(TagInItem(id="", name=name, color="#6B7280"))
    return result


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ItemResponse)
async def create_item(
    request: CreateItemRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    idempotency_repo: Annotated[
        SQLAlchemyIdempotencyRepository, Depends(get_idempotency_repository)
    ],
    outbox_repo: Annotated[SQLAlchemyOutboxRepository, Depends(get_outbox_repository)],
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    item_tag_repo: Annotated[object, Depends(get_item_tag_repository)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> ItemResponse:
    """Create a new item.
    
    If enrich=false, creates item directly as ARCHIVED with provided tags.
    If enrich=true (default), queues AI enrichment job.
    """
    use_case = CreateItemUseCase(
        item_repo, idempotency_repo, outbox_repo, tag_repo, item_tag_repo
    )
    output = await use_case.execute(
        CreateItemInput(
            user_id=current_user.id,
            raw_text=request.rawText,
            idempotency_key=idempotency_key,
            enrich=request.enrich,
            tag_ids=request.tagIds,
        )
    )
    
    # Resolve tag names to objects
    tag_objects = await resolve_tags_to_objects(output.tags, current_user.id, tag_repo)
    
    return ItemResponse(
        id=output.id,
        rawText=output.raw_text,
        title=output.title,
        summary=output.summary,
        tags=tag_objects,
        status=output.status,
        sourceType=output.source_type,
        enrichmentMode=output.enrichment_mode,
        createdAt=output.created_at,
        updatedAt=output.updated_at,
        confirmedAt=output.confirmed_at,
    )


@router.get("/pending", response_model=PendingItemsResponse)
async def get_pending_items(
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    suggestion_repo: Annotated[object, Depends(get_item_tag_suggestion_repository)],
) -> PendingItemsResponse:
    """Get pending items for current user."""
    use_case = GetPendingItemsUseCase(item_repo, suggestion_repo)
    output = await use_case.execute(GetPendingItemsInput(user_id=current_user.id))
    
    items = []
    for item in output.items:
        tag_objects = await resolve_tags_to_objects(item.tags, current_user.id, tag_repo)
        
        suggested_tag_objects = [
            SuggestedTagInItem(
                id=st.id,
                name=st.name,
                status=st.status,
                confidence=st.confidence,
            )
            for st in item.suggested_tags
        ]
        
        items.append(
            ItemResponse(
                id=item.id,
                rawText=item.raw_text,
                title=item.title,
                summary=item.summary,
                tags=tag_objects,
                suggestedTags=suggested_tag_objects,
                status=item.status,
                sourceType=item.source_type,
                createdAt=item.created_at,
                updatedAt=item.updated_at,
                confirmedAt=item.confirmed_at,
            )
        )
    
    return PendingItemsResponse(items=items, total=output.total)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    item_repo: Annotated[SQLAlchemyItemRepository, Depends(get_item_repository)],
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    suggestion_repo: Annotated[object, Depends(get_item_tag_suggestion_repository)],
) -> ItemResponse:
    """Get item by ID."""
    use_case = GetItemUseCase(item_repo, suggestion_repo)
    output = await use_case.execute(
        GetItemInput(user_id=current_user.id, item_id=item_id)
    )
    
    # Resolve tag names to objects
    tag_objects = await resolve_tags_to_objects(output.tags, current_user.id, tag_repo)
    
    # Convert suggested tags to response format
    suggested_tag_objects = [
        SuggestedTagInItem(
            id=st.id,
            name=st.name,
            status=st.status,
            confidence=st.confidence,
        )
        for st in output.suggested_tags
    ]
    
    return ItemResponse(
        id=output.id,
        rawText=output.raw_text,
        title=output.title,
        summary=output.summary,
        tags=tag_objects,
        suggestedTags=suggested_tag_objects,
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
    tag_repo: Annotated[object, Depends(get_tag_repository)],
    item_tag_repo: Annotated[object, Depends(get_item_tag_repository)],
    suggestion_repo: Annotated[object, Depends(get_item_tag_suggestion_repository)],
) -> UpdateItemResponse:
    """Update item (confirm, discard, or edit)."""
    use_case = UpdateItemUseCase(
        item_repo, outbox_repo, tag_repo, item_tag_repo, suggestion_repo
    )
    output = await use_case.execute(
        UpdateItemInput(
            user_id=current_user.id,
            item_id=item_id,
            action=request.action,
            title=request.title,
            summary=request.summary,
            tags=request.tags,
            accepted_suggestion_ids=request.acceptedSuggestionIds,
            rejected_suggestion_ids=request.rejectedSuggestionIds,
            added_tag_ids=request.addedTagIds,
            original_text=request.originalText,
        )
    )
    
    # Resolve tag names to objects
    tag_objects = await resolve_tags_to_objects(output.tags, current_user.id, tag_repo)
    
    return UpdateItemResponse(
        id=output.id,
        status=output.status,
        title=output.title,
        summary=output.summary,
        tags=tag_objects,
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
