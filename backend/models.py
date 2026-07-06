from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base
from sqlalchemy import DateTime
from datetime import datetime
from sqlalchemy import Boolean


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    password = Column(String)
    is_online = Column(
        Boolean,
        default=False
    )

    last_seen = Column(
        DateTime,
        nullable=True
    )

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(
        Integer,
        ForeignKey("users.id")
    )

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id")
    )

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    channel_id = Column(
        Integer,
        ForeignKey("channels.id"),
        nullable=False
    )

    is_pinned = Column(
        Boolean,
        default=False
    )

    parent_message_id = Column(
        Integer,
        ForeignKey("messages.id"),
        nullable=True
    )
class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    workspace_id = Column(
        Integer,
        ForeignKey("workspaces.id")
    )    
    role = Column(
        String,
        default="member"
    )

class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)

class MessageReaction(Base):
    __tablename__ = "message_reactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    message_id = Column(
        Integer,
        ForeignKey("messages.id")
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    emoji = Column(String)   

class FileMessage(Base):
    __tablename__ = "file_messages"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    filename = Column(String)

    filepath = Column(String)

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    channel_id = Column(
        Integer,
        ForeignKey("channels.id")
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )    
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    text = Column(String)

    is_read = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )    
class TypingStatus(Base):
    __tablename__ = "typing_status"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    channel_id = Column(
        Integer,
        ForeignKey("channels.id")
    )

    is_typing = Column(
        Boolean,
        default=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow
    )    
class ChannelMember(Base):
    __tablename__ = "channel_members"

    id = Column(Integer, primary_key=True)

    channel_id = Column(
        Integer,
        ForeignKey("channels.id")
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )
