from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    join_code = Column(String, unique=True, index=True, nullable=True)

    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="groups")
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    resources = relationship("GroupResource", back_populates="group", cascade="all, delete-orphan")
    messages = relationship("GroupMessage", back_populates="group", cascade="all, delete-orphan")
    progress_records = relationship("GroupStudentProgress", back_populates="group", cascade="all, delete-orphan")
    quiz_assignments = relationship("GroupQuizAssignment", back_populates="group", cascade="all, delete-orphan")


class GroupMembership(Base):
    __tablename__ = "group_memberships"
    __table_args__ = (
        UniqueConstraint("group_id", "student_id", name="uq_group_student"),
    )

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="memberships")
    student = relationship("DBUser")


class GroupResource(Base):
    __tablename__ = "group_resources"
    __table_args__ = (
        UniqueConstraint("group_id", "document_id", name="uq_group_document"),
    )

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="resources")
    document = relationship("Document")
    uploaded_by = relationship("DBUser")


class GroupMessage(Base):
    __tablename__ = "group_messages"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    scope = Column(String, nullable=False, default="public")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="messages")
    sender = relationship("DBUser", foreign_keys=[sender_id])
    recipient = relationship("DBUser", foreign_keys=[recipient_id])


class GroupStudentProgress(Base):
    __tablename__ = "group_student_progress"
    __table_args__ = (
        UniqueConstraint("group_id", "student_id", "knowledge_component_id", name="uq_group_student_kc"),
    )

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    knowledge_component_id = Column(Integer, ForeignKey("knowledge_components.id", ondelete="CASCADE"), nullable=False, index=True)
    mastery_prob = Column(Float, default=0.1)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    group = relationship("Group", back_populates="progress_records")
    student = relationship("DBUser")
    knowledge_component = relationship("KnowledgeComponent")


class GroupQuizAssignment(Base):
    __tablename__ = "group_quiz_assignments"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, default="Assigned Quiz")
    assigned_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="quiz_assignments")
    assigned_by = relationship("DBUser")
    components = relationship("GroupQuizAssignmentComponent", back_populates="assignment", cascade="all, delete-orphan")
    attempts = relationship("GroupQuizAttempt", back_populates="assignment", cascade="all, delete-orphan")


class GroupQuizAssignmentComponent(Base):
    __tablename__ = "group_quiz_assignment_components"
    __table_args__ = (
        UniqueConstraint("assignment_id", "knowledge_component_id", name="uq_group_quiz_assignment_kc"),
    )

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("group_quiz_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    knowledge_component_id = Column(Integer, ForeignKey("knowledge_components.id", ondelete="CASCADE"), nullable=False, index=True)

    assignment = relationship("GroupQuizAssignment", back_populates="components")
    knowledge_component = relationship("KnowledgeComponent")


class GroupQuizAttempt(Base):
    __tablename__ = "group_quiz_attempts"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_group_quiz_attempt_student"),
    )

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("group_quiz_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    correct_count = Column(Integer, default=0)
    answer_count = Column(Integer, default=0)
    average_mastery = Column(Float, default=0.1)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignment = relationship("GroupQuizAssignment", back_populates="attempts")
    student = relationship("DBUser")
