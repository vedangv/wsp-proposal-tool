from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonUpdate, LessonOut

router = APIRouter(prefix="/api/lessons", tags=["lessons"])


@router.get("/", response_model=List[LessonOut])
async def list_lessons(
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    client: Optional[str] = Query(None),
    impact: Optional[str] = Query(None),
    discipline: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Lesson)
    if search:
        pattern = f"%{search}%"
        q = q.where(
            Lesson.title.ilike(pattern)
            | Lesson.description.ilike(pattern)
            | Lesson.recommendation.ilike(pattern)
        )
    if source:
        q = q.where(Lesson.source == source)
    if category:
        q = q.where(Lesson.category == category)
    if sector:
        q = q.where(Lesson.sector == sector)
    if client:
        q = q.where(func.lower(Lesson.client) == client.lower())
    if impact:
        q = q.where(Lesson.impact == impact)
    if discipline:
        q = q.where(Lesson.disciplines.contains([discipline]))
    q = q.order_by(Lesson.updated_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=LessonOut, status_code=201)
async def create_lesson(
    body: LessonCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    obj = Lesson(created_by=user.id, updated_by=user.id, **body.model_dump())
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Lesson not found")
    return obj


@router.patch("/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: UUID,
    body: LessonUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Lesson not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.updated_by = user.id
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Lesson not found")
    await db.delete(obj)
    await db.commit()
