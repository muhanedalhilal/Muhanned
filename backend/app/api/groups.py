import os
import shutil
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.upload import ALLOWED_EXTENSIONS, MIME_TYPES, UPLOAD_DIR, extract_text_from_file
from app.core.ai_service import fallback_kcs_for_resource, generate_kcs_from_file, generate_kcs_from_text
from app.core.document_links import document_view_url
from app.core.group_codes import barcode_data_url, barcode_svg_for_code, generate_unique_join_code, is_simple_join_code, normalize_join_code
from app.core.group_realtime import group_realtime
from app.core.security import get_current_user, get_user_from_token
from app.core.supabase_client import supabase, supabase_admin
from app.database.database import SessionLocal, get_db
from app.models.course import Course
from app.models.db_user import DBUser
from app.models.document import Document
from app.models.group import (
    Group,
    GroupMembership,
    GroupMessage,
    GroupQuizAssignment,
    GroupQuizAssignmentComponent,
    GroupQuizAttempt,
    GroupResource,
    GroupStudentProgress,
)
from app.models.knowledge_component import KnowledgeComponent

router = APIRouter(prefix="/groups", tags=["groups"])


class JoinGroupRequest(BaseModel):
    join_code: str


class MessageRequest(BaseModel):
    content: str
    recipient_id: Optional[int] = None


class ProgressRequest(BaseModel):
    progress: Optional[int] = None
    mastery_prob: Optional[float] = None


class AssignQuizRequest(BaseModel):
    title: Optional[str] = None
    component_ids: list[int] = Field(default_factory=list)
    include_all: bool = False


class AddStudentRequest(BaseModel):
    email: EmailStr


def _is_instructor(user: DBUser) -> bool:
    return (user.role or "").lower() in {"teacher", "admin", "instructor"}


def _is_student_account(user: DBUser | None) -> bool:
    if not user:
        return False
    return (user.role or "student").lower() not in {"teacher", "admin", "instructor"}


def _find_or_sync_student_by_email(db: Session, email: str) -> DBUser | None:
    student = db.query(DBUser).filter(func.lower(DBUser.email) == email).first()
    if student:
        return student

    try:
        page = 1
        per_page = 1000
        while True:
            auth_users = supabase_admin.auth.admin.list_users(page=page, per_page=per_page)
            if not auth_users:
                break

            for auth_user in auth_users:
                auth_email = (getattr(auth_user, "email", None) or "").strip().lower()
                if auth_email != email:
                    continue

                metadata = getattr(auth_user, "user_metadata", None) or {}
                auth_role = str(metadata.get("role") or "student").lower()
                if auth_role in {"teacher", "admin", "instructor"}:
                    return None

                auth_id = getattr(auth_user, "id", None)
                if not auth_id:
                    return None

                user = DBUser(
                    supabase_auth_id=auth_id,
                    name=metadata.get("name") or metadata.get("full_name") or email.split("@")[0].capitalize(),
                    email=email,
                    role="student",
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                return user

            if len(auth_users) < per_page:
                break
            page += 1
    except Exception as exc:
        print(f"Supabase user lookup warning: {exc}")

    return None


def _course_for_instructor(db: Session, course_id: int, user: DBUser) -> Course:
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user.id).first()
    if not course or not _is_instructor(user):
        raise HTTPException(status_code=403, detail="Instructor access required.")
    return course


def _group_for_instructor(db: Session, group_id: int, user: DBUser) -> Group:
    group = db.query(Group).join(Course).filter(Group.id == group_id, Course.user_id == user.id).first()
    if not group or not _is_instructor(user):
        raise HTTPException(status_code=403, detail="Instructor access required.")
    _ensure_join_code(db, group)
    return group


def _is_group_member(db: Session, group_id: int, user_id: int) -> bool:
    return db.query(GroupMembership.id).filter(
        GroupMembership.group_id == group_id,
        GroupMembership.student_id == user_id
    ).first() is not None


def _group_for_participant(db: Session, group_id: int, user: DBUser) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    owns_course = db.query(Course.id).filter(Course.id == group.course_id, Course.user_id == user.id).first()
    if owns_course or _is_group_member(db, group_id, user.id):
        _ensure_join_code(db, group)
        return group

    raise HTTPException(status_code=403, detail="You do not have access to this group.")


def _ensure_join_code(db: Session, group: Group) -> str:
    if is_simple_join_code(group.join_code):
        return group.join_code
    group.join_code = generate_unique_join_code(db, Group)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group.join_code


def _group_recipient_ids(db: Session, group: Group) -> list[int]:
    course_owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()
    student_ids = [
        row[0] for row in db.query(GroupMembership.student_id).filter(GroupMembership.group_id == group.id).all()
    ]
    recipients = set(student_ids)
    if course_owner_id:
        recipients.add(course_owner_id)
    return list(recipients)


def _public_url(path: str | None) -> str | None:
    if not path:
        return None
    try:
        return supabase.storage.from_("documents").get_public_url(path)
    except Exception:
        return None


def _serialize_user(user: DBUser | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


def _group_component_rows(db: Session, group_id: int):
    course_id = db.query(Group.course_id).filter(Group.id == group_id).scalar()
    if not course_id:
        return []
    return db.query(KnowledgeComponent).filter(
        KnowledgeComponent.course_id == course_id
    ).order_by(KnowledgeComponent.id).all()


def _ensure_progress_rows(db: Session, group_id: int, student_id: int):
    components = _group_component_rows(db, group_id)
    for component in components:
        exists = db.query(GroupStudentProgress.id).filter(
            GroupStudentProgress.group_id == group_id,
            GroupStudentProgress.student_id == student_id,
            GroupStudentProgress.knowledge_component_id == component.id,
        ).first()
        if not exists:
            db.add(GroupStudentProgress(
                group_id=group_id,
                student_id=student_id,
                knowledge_component_id=component.id,
                mastery_prob=0.1,
            ))
    if components:
        db.commit()


def _component_progress_map(db: Session, group_id: int, student_id: int) -> dict[int, float]:
    _ensure_progress_rows(db, group_id, student_id)
    rows = db.query(GroupStudentProgress).filter(
        GroupStudentProgress.group_id == group_id,
        GroupStudentProgress.student_id == student_id,
    ).all()
    return {row.knowledge_component_id: row.mastery_prob or 0.1 for row in rows}


def _serialize_components(db: Session, group_id: int, student_id: int | None = None) -> list[dict]:
    components = _group_component_rows(db, group_id)
    progress_map = _component_progress_map(db, group_id, student_id) if student_id else {}
    return [
        {
            "id": component.id,
            "text": component.topic,
            "content": component.content,
            "progress": int((progress_map.get(component.id, 0.1)) * 100) if student_id else 0,
        }
        for component in components
    ]


def _student_progress(db: Session, group_id: int, student: DBUser) -> dict:
    components = _group_component_rows(db, group_id)
    progress_map = _component_progress_map(db, group_id, student.id)
    component_rows = []
    total = 0.0
    for component in components:
        mastery = progress_map.get(component.id, 0.1)
        total += mastery
        component_rows.append({
            "componentId": component.id,
            "name": component.topic,
            "mastery": int(mastery * 100),
            "status": "mastered" if mastery >= 0.9 else "in_progress" if mastery >= 0.35 else "needs_practice",
        })
    avg = int((total / len(components)) * 100) if components else 0
    return {
        "student": _serialize_user(student),
        "averageMastery": avg,
        "components": component_rows,
    }


def _serialize_members(db: Session, group_id: int) -> list[dict]:
    memberships = db.query(GroupMembership).filter(GroupMembership.group_id == group_id).order_by(GroupMembership.joined_at).all()
    return [_student_progress(db, group_id, membership.student) for membership in memberships if membership.student]


def _serialize_document_resource(doc: Document | None, uploaded_by: DBUser | None = None, resource_id: int | None = None, created_at=None) -> dict:
    return {
        "id": resource_id or (doc.id if doc else None),
        "documentId": doc.id if doc else None,
        "text": doc.filename if doc else "Resource",
        "type": doc.file_type if doc else "file",
        "fileUrl": document_view_url(doc),
        "uploadedBy": _serialize_user(uploaded_by or (doc.owner if doc else None)),
        "created_at": created_at or (doc.created_at if doc else None),
    }


def _serialize_resource(resource: GroupResource) -> dict:
    payload = _serialize_document_resource(
        resource.document,
        uploaded_by=resource.uploaded_by,
        resource_id=resource.id,
        created_at=resource.created_at,
    )
    payload["groupId"] = resource.group_id
    return payload


def _group_resources(db: Session, group: Group) -> list[dict]:
    resources_by_doc_id: dict[int, dict] = {}

    course_docs = db.query(Document).filter(
        Document.course_id == group.course_id
    ).order_by(Document.created_at.desc()).all()
    for doc in course_docs:
        payload = _serialize_document_resource(doc)
        payload["groupId"] = group.id
        resources_by_doc_id[doc.id] = payload

    group_resources = db.query(GroupResource).filter(
        GroupResource.group_id == group.id
    ).order_by(GroupResource.created_at.desc()).all()
    for resource in group_resources:
        if not resource.document:
            continue
        resources_by_doc_id[resource.document.id] = _serialize_resource(resource)

    return sorted(
        resources_by_doc_id.values(),
        key=lambda item: item.get("created_at") or datetime.min,
        reverse=True,
    )


def _serialize_message(message: GroupMessage) -> dict:
    return {
        "id": message.id,
        "groupId": message.group_id,
        "sender": _serialize_user(message.sender),
        "recipient": _serialize_user(message.recipient),
        "scope": message.scope,
        "content": message.content,
        "created_at": message.created_at,
    }


def _assignment_component_ids(assignment: GroupQuizAssignment) -> list[int]:
    return [item.knowledge_component_id for item in assignment.components]


def _assignment_attempt_for_student(db: Session, assignment_id: int, student_id: int) -> GroupQuizAttempt | None:
    return db.query(GroupQuizAttempt).filter(
        GroupQuizAttempt.assignment_id == assignment_id,
        GroupQuizAttempt.student_id == student_id,
    ).first()


def _serialize_assignment(
    db: Session,
    assignment: GroupQuizAssignment,
    viewer: DBUser,
    include_components: bool = False,
) -> dict:
    component_ids = _assignment_component_ids(assignment)
    attempt = _assignment_attempt_for_student(db, assignment.id, viewer.id) if viewer.role == "student" else None
    payload = {
        "id": assignment.id,
        "groupId": assignment.group_id,
        "title": assignment.title,
        "componentCount": len(component_ids),
        "assignedBy": _serialize_user(assignment.assigned_by),
        "created_at": assignment.created_at,
        "attempt": {
            "correctCount": attempt.correct_count,
            "answerCount": attempt.answer_count,
            "averageMastery": int((attempt.average_mastery or 0.1) * 100),
            "updated_at": attempt.updated_at,
        } if attempt else None,
    }
    if include_components:
        component_map = {
            component.id: component for component in db.query(KnowledgeComponent).filter(
                KnowledgeComponent.id.in_(component_ids)
            ).all()
        }
        payload["componentIds"] = component_ids
        payload["components"] = [
            {
                "id": component_id,
                "text": component_map[component_id].topic if component_id in component_map else f"Component {component_id}",
            }
            for component_id in component_ids
        ]
    return payload


def _group_assignments(db: Session, group_id: int, viewer: DBUser, include_components: bool = False) -> list[dict]:
    assignments = db.query(GroupQuizAssignment).filter(
        GroupQuizAssignment.group_id == group_id
    ).order_by(GroupQuizAssignment.created_at.desc()).all()
    return [_serialize_assignment(db, assignment, viewer, include_components=include_components) for assignment in assignments]


def _group_average(members: list[dict]) -> int:
    if not members:
        return 0
    return round(sum(member["averageMastery"] for member in members) / len(members))


def _serialize_group(db: Session, group: Group, viewer: DBUser, include_detail: bool = False) -> dict:
    join_code = _ensure_join_code(db, group)
    members = _serialize_members(db, group.id)
    course = db.query(Course).filter(Course.id == group.course_id).first()
    is_member = _is_group_member(db, group.id, viewer.id)
    is_owner = bool(course and course.user_id == viewer.id)

    payload = {
        "id": group.id,
        "name": group.name,
        "courseId": group.course_id,
        "courseName": course.name if course else "",
        "joinCode": join_code,
        "barcodeSvg": barcode_svg_for_code(join_code),
        "barcodeDataUrl": barcode_data_url(join_code),
        "studentCount": len(members),
        "averageMastery": _group_average(members),
        "isInstructor": is_owner,
        "isMember": is_member,
        "viewer": _serialize_user(viewer),
        "created_at": group.created_at,
    }

    if include_detail:
        if is_owner:
            visible_members = members
        elif is_member:
            own_progress = _student_progress(db, group.id, viewer)
            visible_members = [own_progress]
        else:
            visible_members = []
        payload.update({
            "members": visible_members,
            "resources": _group_resources(db, group),
            "quizzes": _group_assignments(db, group.id, viewer, include_components=is_owner),
            "components": _serialize_components(db, group.id, viewer.id if is_member else None) if is_owner else [],
        })

    return payload


@router.get("/my")
def my_groups(
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if _is_instructor(current_user):
        groups = db.query(Group).join(Course).filter(Course.user_id == current_user.id).order_by(Group.created_at.desc()).all()
    else:
        groups = db.query(Group).join(GroupMembership).filter(
            GroupMembership.student_id == current_user.id
        ).order_by(Group.created_at.desc()).all()
    return [_serialize_group(db, group, current_user, include_detail=False) for group in groups]


@router.post("/join")
async def join_group(
    body: JoinGroupRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only student accounts can join groups.")

    code = normalize_join_code(body.join_code)
    group = db.query(Group).filter(func.upper(Group.join_code) == code).first()
    if not group:
        raise HTTPException(status_code=404, detail="No group found for that join code.")

    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group.id,
        GroupMembership.student_id == current_user.id,
    ).first()
    if not membership:
        membership = GroupMembership(group_id=group.id, student_id=current_user.id)
        db.add(membership)
        db.commit()
        db.refresh(membership)

    _ensure_progress_rows(db, group.id, current_user.id)
    group_payload = _serialize_group(db, group, current_user, include_detail=True)
    event = {
        "type": "group_member_joined",
        "groupId": group.id,
        "member": _student_progress(db, group.id, current_user),
        "group": group_payload,
    }
    await group_realtime.send_to_users(_group_recipient_ids(db, group), event)
    return group_payload


@router.post("/{group_id}/regenerate-code")
def regenerate_join_code_endpoint(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    group.join_code = generate_unique_join_code(db, Group)
    db.add(group)
    db.commit()
    db.refresh(group)
    return _serialize_group(db, group, current_user, include_detail=True)


@router.get("/{group_id}")
def get_group(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    return _serialize_group(db, group, current_user, include_detail=True)


@router.delete("/{group_id}")
async def delete_group(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)

    assignment_ids = [row[0] for row in db.query(GroupQuizAssignment.id).filter(GroupQuizAssignment.group_id == group.id).all()]
    if assignment_ids:
        db.query(GroupQuizAttempt).filter(GroupQuizAttempt.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
        db.query(GroupQuizAssignmentComponent).filter(GroupQuizAssignmentComponent.assignment_id.in_(assignment_ids)).delete(synchronize_session=False)
        db.query(GroupQuizAssignment).filter(GroupQuizAssignment.group_id == group.id).delete(synchronize_session=False)

    db.query(GroupStudentProgress).filter(GroupStudentProgress.group_id == group.id).delete(synchronize_session=False)
    db.query(GroupMembership).filter(GroupMembership.group_id == group.id).delete(synchronize_session=False)
    db.query(GroupMessage).filter(GroupMessage.group_id == group.id).delete(synchronize_session=False)
    db.query(GroupResource).filter(GroupResource.group_id == group.id).delete(synchronize_session=False)
    
    db.delete(group)
    db.commit()
    
    return {"message": "Group deleted successfully"}


@router.get("/{group_id}/analytics")
def group_analytics(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    members = _serialize_members(db, group.id)
    return {
        "groupId": group.id,
        "averageMastery": _group_average(members),
        "members": members,
    }


@router.post("/{group_id}/members")
async def add_group_member(
    group_id: int,
    body: AddStudentRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    email = str(body.email).strip().lower()
    student = _find_or_sync_student_by_email(db, email)
    if not _is_student_account(student):
        raise HTTPException(status_code=404, detail="The student doesn't exist")

    if student.role != "student":
        student.role = "student"
        db.add(student)
        db.commit()
        db.refresh(student)

    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group.id,
        GroupMembership.student_id == student.id,
    ).first()
    if not membership:
        membership = GroupMembership(group_id=group.id, student_id=student.id)
        db.add(membership)
        db.commit()
        db.refresh(membership)

    _ensure_progress_rows(db, group.id, student.id)
    group_payload = _serialize_group(db, group, current_user, include_detail=True)
    await group_realtime.send_to_users(_group_recipient_ids(db, group), {
        "type": "group_member_added",
        "groupId": group.id,
        "studentId": student.id,
        "member": _student_progress(db, group.id, student),
        "group": group_payload,
    })
    return group_payload


@router.delete("/{group_id}/members/{student_id}")
async def remove_group_member(
    group_id: int,
    student_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    membership = db.query(GroupMembership).filter(
        GroupMembership.group_id == group.id,
        GroupMembership.student_id == student_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Student is not a member of this group.")

    removed_student = membership.student
    recipients = set(_group_recipient_ids(db, group))
    recipients.add(student_id)

    assignment_ids = [
        row[0] for row in db.query(GroupQuizAssignment.id).filter(
            GroupQuizAssignment.group_id == group.id
        ).all()
    ]
    if assignment_ids:
        db.query(GroupQuizAttempt).filter(
            GroupQuizAttempt.assignment_id.in_(assignment_ids),
            GroupQuizAttempt.student_id == student_id,
        ).delete(synchronize_session=False)

    db.query(GroupStudentProgress).filter(
        GroupStudentProgress.group_id == group.id,
        GroupStudentProgress.student_id == student_id,
    ).delete(synchronize_session=False)
    db.delete(membership)
    db.commit()

    group_payload = _serialize_group(db, group, current_user, include_detail=True)
    await group_realtime.send_to_users(recipients, {
        "type": "group_member_removed",
        "groupId": group.id,
        "studentId": student_id,
        "student": _serialize_user(removed_student),
        "group": group_payload,
    })
    return group_payload


@router.get("/{group_id}/messages/public")
def public_messages(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _group_for_participant(db, group_id, current_user)
    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group_id,
        GroupMessage.scope == "public",
    ).order_by(GroupMessage.created_at.asc()).limit(200).all()
    return [_serialize_message(message) for message in messages]


@router.post("/{group_id}/messages/public")
async def create_public_message(
    group_id: int,
    body: MessageRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    message = GroupMessage(group_id=group.id, sender_id=current_user.id, scope="public", content=content)
    db.add(message)
    db.commit()
    db.refresh(message)
    payload = _serialize_message(message)
    await group_realtime.send_to_users(_group_recipient_ids(db, group), {
        "type": "group_public_message",
        "groupId": group.id,
        "message": payload,
    })
    return payload


@router.get("/{group_id}/messages/private/{student_id}")
def private_messages(
    group_id: int,
    student_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    course_owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()

    if current_user.id != course_owner_id and current_user.id != student_id:
        raise HTTPException(status_code=403, detail="Private conversation access denied.")
    if not _is_group_member(db, group.id, student_id):
        raise HTTPException(status_code=404, detail="Student is not a member of this group.")

    messages = db.query(GroupMessage).filter(
        GroupMessage.group_id == group.id,
        GroupMessage.scope == "private",
        or_(
            (GroupMessage.sender_id == course_owner_id) & (GroupMessage.recipient_id == student_id),
            (GroupMessage.sender_id == student_id) & (GroupMessage.recipient_id == course_owner_id),
        )
    ).order_by(GroupMessage.created_at.asc()).limit(200).all()
    return [_serialize_message(message) for message in messages]


@router.post("/{group_id}/messages/private")
async def create_private_message(
    group_id: int,
    body: MessageRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    course_owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if current_user.id == course_owner_id:
        recipient_id = body.recipient_id
        if not recipient_id or not _is_group_member(db, group.id, recipient_id):
            raise HTTPException(status_code=400, detail="Choose a student in this group.")
    else:
        recipient_id = course_owner_id
        if not _is_group_member(db, group.id, current_user.id):
            raise HTTPException(status_code=403, detail="Join the group before messaging the instructor.")

    message = GroupMessage(
        group_id=group.id,
        sender_id=current_user.id,
        recipient_id=recipient_id,
        scope="private",
        content=content,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    payload = _serialize_message(message)
    await group_realtime.send_to_users({current_user.id, recipient_id}, {
        "type": "group_private_message",
        "groupId": group.id,
        "studentId": recipient_id if current_user.id == course_owner_id else current_user.id,
        "message": payload,
    })
    return payload


@router.put("/{group_id}/progress/{component_id}")
async def update_progress(
    group_id: int,
    component_id: int,
    body: ProgressRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update their progress.")
    group = _group_for_participant(db, group_id, current_user)
    if not _is_group_member(db, group.id, current_user.id):
        raise HTTPException(status_code=403, detail="Join the group before updating progress.")

    component_ids = {component.id for component in _group_component_rows(db, group.id)}
    if component_id not in component_ids:
        raise HTTPException(status_code=404, detail="Component not found in this group.")

    if body.mastery_prob is not None:
        mastery = max(0.0, min(1.0, float(body.mastery_prob)))
    elif body.progress is not None:
        mastery = max(0.0, min(1.0, float(body.progress) / 100))
    else:
        raise HTTPException(status_code=400, detail="Provide progress or mastery_prob.")

    progress = db.query(GroupStudentProgress).filter(
        GroupStudentProgress.group_id == group.id,
        GroupStudentProgress.student_id == current_user.id,
        GroupStudentProgress.knowledge_component_id == component_id,
    ).first()
    if not progress:
        progress = GroupStudentProgress(
            group_id=group.id,
            student_id=current_user.id,
            knowledge_component_id=component_id,
        )
        db.add(progress)
    progress.mastery_prob = mastery
    progress.updated_at = datetime.utcnow()
    db.commit()

    student_payload = _student_progress(db, group.id, current_user)
    members = _serialize_members(db, group.id)
    event = {
        "type": "group_progress_updated",
        "groupId": group.id,
        "studentId": current_user.id,
        "member": student_payload,
        "groupAverageMastery": _group_average(members),
    }
    await group_realtime.send_to_users(_group_recipient_ids(db, group), event)
    return event


@router.get("/{group_id}/quizzes")
def list_group_quizzes(
    group_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    course_owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()
    return _group_assignments(db, group.id, current_user, include_components=current_user.id == course_owner_id)


@router.get("/{group_id}/quizzes/{assignment_id}")
def get_group_quiz(
    group_id: int,
    assignment_id: int,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_participant(db, group_id, current_user)
    assignment = db.query(GroupQuizAssignment).filter(
        GroupQuizAssignment.id == assignment_id,
        GroupQuizAssignment.group_id == group.id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Quiz assignment not found.")
    course_owner_id = db.query(Course.user_id).filter(Course.id == group.course_id).scalar()
    return _serialize_assignment(db, assignment, current_user, include_components=current_user.id == course_owner_id)


@router.post("/{group_id}/quizzes")
async def assign_group_quiz(
    group_id: int,
    body: AssignQuizRequest,
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    available_components = _group_component_rows(db, group.id)
    available_ids = {component.id for component in available_components}

    if body.include_all:
        selected_ids = [component.id for component in available_components]
    else:
        selected_ids = [component_id for component_id in body.component_ids if component_id in available_ids]

    if not selected_ids:
        raise HTTPException(status_code=400, detail="Select at least one course component for the quiz.")

    title = (body.title or "").strip() or f"{group.name} Quiz"
    assignment = GroupQuizAssignment(
        group_id=group.id,
        title=title[:120],
        assigned_by_id=current_user.id,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    for component_id in selected_ids:
        db.add(GroupQuizAssignmentComponent(
            assignment_id=assignment.id,
            knowledge_component_id=component_id,
        ))
    db.commit()
    db.refresh(assignment)

    memberships = db.query(GroupMembership).filter(GroupMembership.group_id == group.id).all()
    for membership in memberships:
        _ensure_progress_rows(db, group.id, membership.student_id)

    instructor_payload = _serialize_assignment(db, assignment, current_user, include_components=True)
    await group_realtime.send_to_users(_group_recipient_ids(db, group), {
        "type": "group_quiz_assigned",
        "groupId": group.id,
        "quiz": _serialize_assignment(db, assignment, current_user, include_components=False),
    })
    return instructor_payload


@router.post("/{group_id}/resources")
async def upload_group_resource(
    group_id: int,
    file: UploadFile = File(...),
    current_user: DBUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    group = _group_for_instructor(db, group_id, current_user)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Only {', '.join(ALLOWED_EXTENSIONS)} are allowed."
        )

    safe_filename = f"{uuid.uuid4()}{ext}"
    save_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to handle temp file: {exc}")
    finally:
        file.file.close()

    storage_path = f"{current_user.supabase_auth_id}/groups/{group.id}/{safe_filename}"
    try:
        with open(save_path, "rb") as stored_file:
            supabase.storage.from_("documents").upload(storage_path, stored_file, {"content-type": file.content_type})
    except Exception as exc:
        print(f"Supabase group resource upload warning: {exc}")

    new_doc = Document(
        filename=file.filename,
        file_type=ext.replace(".", ""),
        supabase_path=storage_path,
        user_id=current_user.id,
        course_id=group.course_id,
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    resource = GroupResource(group_id=group.id, document_id=new_doc.id, uploaded_by_id=current_user.id)
    db.add(resource)
    db.commit()
    db.refresh(resource)

    source_text = extract_text_from_file(save_path, ext).strip()
    kcs_data = generate_kcs_from_text(source_text) if source_text else []
    if not kcs_data:
        kcs_data = generate_kcs_from_file(save_path, MIME_TYPES.get(ext) or file.content_type, file.filename)
    if not kcs_data:
        kcs_data = fallback_kcs_for_resource(None, file.filename)

    components = []
    for kc in kcs_data:
        if not isinstance(kc, dict):
            continue
        component = KnowledgeComponent(
            topic=str(kc.get("topic") or "Unknown Topic").strip() or "Unknown Topic",
            content=str(kc.get("content") or "No content provided.").strip() or "No content provided.",
            document_id=new_doc.id,
            user_id=current_user.id,
            course_id=group.course_id,
        )
        db.add(component)
        components.append(component)
    db.commit()

    memberships = db.query(GroupMembership).filter(GroupMembership.group_id == group.id).all()
    for component in components:
        db.refresh(component)
        for membership in memberships:
            db.add(GroupStudentProgress(
                group_id=group.id,
                student_id=membership.student_id,
                knowledge_component_id=component.id,
                mastery_prob=0.1,
            ))
    db.commit()

    db.refresh(resource)
    payload = {
        "resource": _serialize_resource(resource),
        "components": _serialize_components(db, group.id),
        "group": _serialize_group(db, group, current_user, include_detail=True),
    }
    await group_realtime.send_to_users(_group_recipient_ids(db, group), {
        "type": "group_resource_created",
        "groupId": group.id,
        **payload,
    })
    return payload


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    token = websocket.query_params.get("token", "")
    db = SessionLocal()
    try:
        user = get_user_from_token(token, db)
        await group_realtime.connect(user.id, websocket)
        await websocket.send_json({"type": "connected", "userId": user.id})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if "user" in locals():
            await group_realtime.disconnect(user.id, websocket)
    except Exception:
        await websocket.close(code=1008)
    finally:
        db.close()
