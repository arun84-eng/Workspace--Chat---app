from serializers import serialize_message
from jose import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI
from sqlalchemy.orm import Session
from fastapi import WebSocket
from fastapi import WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from fastapi import Query
from database import SessionLocal
from models import User, Workspace, Channel, Message, WorkspaceMember, DirectMessage, MessageReaction, FileMessage, Notification, TypingStatus, ChannelMember
from schemas import UserCreate, UserLogin, WorkspaceCreate, ChannelCreate, MessageCreate, WorkspaceMemberCreate, AddWorkspaceMember, MessageUpdate, DirectMessageCreate, PromoteMember, DemoteMember, RemoveMember, LeaveWorkspace, DeleteWorkspace, DeleteChannel, RenameChannel, RenameWorkspace, UpdateProfile, ChangePassword, ReactionCreate, TypingUpdate, ChannelMemberCreate, ThreadReplyCreate
from passlib.context import CryptContext
from jose import JWTError
from fastapi import Header,HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
import shutil
import os

from fastapi import Depends
security = HTTPBearer()
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)
SECRET_KEY = "my_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440
from sqlalchemy.orm import Session
from database import SessionLocal
from fastapi import Depends

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(
        self,
        websocket: WebSocket,
        channel_id: int
    ):
        await websocket.accept()

        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []

        self.active_connections[channel_id].append(
            websocket
        )

    def disconnect(
        self,
        websocket: WebSocket,
        channel_id: int
    ):
        self.active_connections[channel_id].remove(
            websocket
        )

    async def broadcast(
        self,
        channel_id: int,
        data: dict
    ):
        for connection in self.active_connections.get(
            channel_id,
            []
        ):
            await connection.send_json(data)
manager = ConnectionManager()
class NotificationManager:

    def __init__(self):
        self.connections = {}

    async def connect(
        self,
        websocket: WebSocket,
        user_id: int
    ):
        await websocket.accept()

        self.connections[user_id] = websocket

    def disconnect(
        self,
        user_id: int
    ):
        if user_id in self.connections:
            del self.connections[user_id]

    async def send_notification(
        self,
        user_id: int,
        data: dict
    ):
        if user_id in self.connections:
            await self.connections[user_id].send_json(
                data
            )

notification_manager = NotificationManager()

def create_notification(
    db,
    user_id,
    text
):
    notification = Notification(
        user_id=user_id,
        text=text
    )

    db.add(notification)
    db.commit()

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

def verify_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        return payload

    except JWTError:
        return None

def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    payload = verify_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    return payload["user_id"]    
def is_workspace_member(
    db,
    user_id: int,
    workspace_id: int
):
    member = db.query(
        WorkspaceMember
    ).filter(
        WorkspaceMember.user_id == user_id,
        WorkspaceMember.workspace_id == workspace_id
    ).first()

    return member is not None

@app.get("/")
def home():
    return {"message": "Slack Clone Backend Running"}


@app.post("/register")
def register(user: UserCreate,
             db: Session = Depends(get_db),):
    

    hashed_password = pwd_context.hash(user.password)
    print(hashed_password)
    new_user = User(
        username=user.username,
        email=user.email,
        password=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id
    }
@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        valid = pwd_context.verify(user.password, existing_user.password)
    except Exception:
        raise HTTPException(status_code=400, detail="This account uses an old password format")

    if not valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    existing_user.is_online = True
    existing_user.last_seen = None
    db.commit()

    token = create_access_token(
        {
            "sub": existing_user.email,
            "user_id": existing_user.id
        }
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer"
    }
@app.get("/me")
def get_current_user(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_online": user.is_online,
        "last_seen": user.last_seen,
    }

@app.post("/channel/create")
def create_channel(
    channel: ChannelCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    
    workspace = db.query(Workspace).filter(
        Workspace.id == channel.workspace_id
    ).first()

    if not workspace:
        return {"message": "Workspace not found"}

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only workspace owner can create channels"
        }
    
    new_channel = Channel(
        name=channel.name,
        workspace_id=channel.workspace_id
    )

    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)

    return {
        "message": "Channel created",
        "channel_id": new_channel.id,
        "name": new_channel.name
    }

@app.get("/workspaces")
def get_workspaces(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    

    workspaces = (
        db.query(Workspace)
        .join(
            WorkspaceMember,
            Workspace.id == WorkspaceMember.workspace_id
        )
        .filter(
            WorkspaceMember.user_id == current_user_id
        )
        .all()
    )

    return workspaces

@app.post("/workspace/create")
def create_workspace(
    workspace: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    new_workspace = Workspace(
        name=workspace.name,
        owner_id=current_user_id
    )

    db.add(new_workspace)
    db.commit()
    db.refresh(new_workspace)
    owner_member = WorkspaceMember(
        user_id=current_user_id,
        workspace_id=new_workspace.id,
        role="owner"
    )

    db.add(owner_member)
    db.commit()

    return {
        "message": "Workspace created",
        "workspace_id": new_workspace.id,
        "owner_id": new_workspace.owner_id,
        "name": new_workspace.name
    }
@app.post("/message/send")
def send_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user_id,
        WorkspaceMember.workspace_id == channel.workspace_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")

    new_message = Message(
        content=message.content,
        user_id=current_user_id,
        channel_id=message.channel_id,
        parent_message_id=message.parent_message_id
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    user = db.query(User).filter(User.id == current_user_id).first()

    return serialize_message(
        msg=new_message,
        user=user,
        reply_count=0,
        reactions=[]
    )
@app.get("/messages/{channel_id}")
def get_messages(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    channel = db.query(Channel).filter(
        Channel.id == channel_id
    ).first()

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == current_user_id,
        WorkspaceMember.workspace_id == channel.workspace_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")

    messages = db.query(Message).filter(
        Message.channel_id == channel_id,
        Message.parent_message_id == None
    ).order_by(Message.created_at).all()

    result = []

    for msg in messages:
        user = db.query(User).filter(User.id == msg.user_id).first()

        reply_count = db.query(Message).filter(
            Message.parent_message_id == msg.id
        ).count()

        reactions = db.query(MessageReaction).filter(
            MessageReaction.message_id == msg.id
        ).all()

        reaction_list = [
            {
                "emoji": reaction.emoji,
                "user_id": reaction.user_id,
                "message_id": reaction.message_id
            }
            for reaction in reactions
        ]

        result.append(
            serialize_message(
                msg=msg,
                user=user,
                reply_count=reply_count,
                reactions=reaction_list
            )
        )

    return result
@app.get("/thread/{message_id}")
def get_thread(
    message_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    parent = db.query(Message).filter(
        Message.parent_message_id == message_id
    ).first()

    if not parent:
        return []

    replies = db.query(Message).filter(
        Message.parent_message_id == message_id
    ).order_by(Message.created_at).all()
    result = []

    for reply in replies:
        user = db.query(User).filter(
            User.id == reply.user_id
        ).first()

        reply_reactions = db.query(MessageReaction).filter(
            MessageReaction.message_id == reply.id
        ).all()

        reaction_list = []

        for reaction in reply_reactions:
            reaction_list.append({
                "emoji": reaction.emoji,
                "user_id": reaction.user_id,
                "message_id": reaction.message_id
            })

        nested_reply_count = db.query(Message).filter(
            Message.parent_message_id == reply.id
        ).count()

        result.append(
            serialize_message(
                msg=reply,
                user=user,
                reply_count=nested_reply_count,
                reactions=reaction_list
            )
        )

    return result

@app.get("/channels/{workspace_id}")
def get_workspace_channels(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):


    channels = db.query(Channel).filter(
        Channel.workspace_id == workspace_id
    ).all()

    return channels

@app.post("/workspace/add-member")
def add_member(
    member: AddWorkspaceMember,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    # Check if user exists
    user = db.query(User).filter(
        User.id == member.user_id
    ).first()

    if not user:
        return {"message": "User not found"}

    # Check if workspace exists
    workspace = db.query(Workspace).filter(
        Workspace.id == member.workspace_id
    ).first()

    if not workspace:
        return {"message": "Workspace not found"}

    # Only workspace owner can add members
    if workspace.owner_id != current_user_id:
        return {
            "message": "Only workspace owner can add members"
        }

    # Check if already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.user_id == member.user_id,
        WorkspaceMember.workspace_id == member.workspace_id
    ).first()

    if existing:
        return {
            "message": "User already a member"
        }

    # Add member
    new_member = WorkspaceMember(
        user_id=member.user_id,
        workspace_id=member.workspace_id,
        role="member"

    )

    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    create_notification(
        db,
        member.user_id,
        f"You were added to workspace {workspace.name}"
    )

    return {
        "message": "Member added successfully",
        "member_id": new_member.id
    }

@app.get("/workspace/{workspace_id}/channels")
def get_channels(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    if not is_workspace_member(
        db,
        current_user_id,
        workspace_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Access denied"
        )

    channels = db.query(Channel).filter(
        Channel.workspace_id == workspace_id
    ).all()

    return channels
@app.put("/message/{message_id}")
def edit_message(
    message_id: int,
    updated_message: MessageUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")

    message.content = updated_message.content
    message.edited_at = datetime.utcnow()

    db.commit()
    db.refresh(message)

    user = db.query(User).filter(User.id == message.user_id).first()

    reply_count = db.query(Message).filter(
        Message.parent_message_id == message.id
    ).count()

    reactions = db.query(MessageReaction).filter(
        MessageReaction.message_id == message.id
    ).all()

    reaction_list = [
        {
            "emoji": reaction.emoji,
            "user_id": reaction.user_id,
            "message_id": reaction.message_id
        }
        for reaction in reactions
    ]

    return serialize_message(
        msg=message,
        user=user,
        reply_count=reply_count,
        reactions=reaction_list
    )
@app.delete("/message/{message_id}")
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    message = db.query(Message).filter(Message.id == message_id).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message.user_id != current_user_id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")

    db.query(MessageReaction).filter(MessageReaction.message_id == message_id).delete()
    db.query(Message).filter(Message.parent_message_id == message_id).delete()

    db.delete(message)
    db.commit()

    return {"success": True}
@app.post("/dm/send")
async def send_direct_message(
    dm: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    receiver = db.query(User).filter(User.id == dm.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    sender = db.query(User).filter(User.id == current_user_id).first()

    new_dm = DirectMessage(
        content=dm.content,
        sender_id=current_user_id,
        receiver_id=dm.receiver_id
    )

    db.add(new_dm)
    db.commit()
    db.refresh(new_dm)

    notification = Notification(
        user_id=dm.receiver_id,
        text=f"New message from {sender.username}"
    )
    db.add(notification)
    db.commit()

    await notification_manager.send_notification(
        dm.receiver_id,
        {
            "type": "dm",
            "sender": sender.username,
            "message": dm.content
        }
    )

    return {
        "id": new_dm.id,
        "sender_id": new_dm.sender_id,
        "receiver_id": new_dm.receiver_id,
        "content": new_dm.content,
        "created_at": new_dm.created_at,
        "read": new_dm.read,
    }
@app.get("/dm/conversations")
def get_conversations(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    messages = db.query(DirectMessage).filter(
        (DirectMessage.sender_id == current_user_id) |
        (DirectMessage.receiver_id == current_user_id)
    ).all()

    user_ids = set()

    for msg in messages:
        if msg.sender_id == current_user_id:
            user_ids.add(msg.receiver_id)
        else:
            user_ids.add(msg.sender_id)

    if not user_ids:
        return []

    users = db.query(User).filter(User.id.in_(user_ids)).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email
        }
        for user in users
    ]
@app.get("/dm/unread-count")
def get_unread_counts(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    messages = db.query(DirectMessage).filter(
        DirectMessage.receiver_id == current_user_id,
        DirectMessage.read == False
    ).all()

    counts = {}

    for message in messages:
        sender_id = message.sender_id
        counts[sender_id] = counts.get(sender_id, 0) + 1

    return [
        {
            "user_id": sender_id,
            "unread_count": count
        }
        for sender_id, count in counts.items()
    ]

@app.get("/dm/{other_user_id}")
def get_direct_messages(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    messages = db.query(DirectMessage).filter(
        (
            (DirectMessage.sender_id == current_user_id) &
            (DirectMessage.receiver_id == other_user_id)
        ) |
        (
            (DirectMessage.sender_id == other_user_id) &
            (DirectMessage.receiver_id == current_user_id)
        )
    ).order_by(DirectMessage.created_at).all()

    return [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "created_at": msg.created_at,
            "read": msg.read, 
        }
        for msg in messages
    ]
@app.get("/users")
def get_users(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    

    users = db.query(User).filter(
        User.id != current_user_id
    ).all()

    result = []

    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email
        })

    return result
@app.put("/dm/read/{message_id}")
def mark_dm_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    message = db.query(DirectMessage).filter(
        DirectMessage.id == message_id
    ).first()

    if not message:
        return {
            "message": "Message not found"
        }

    if message.receiver_id != current_user_id:
        return {
            "message": "You can only mark your own received messages as read"
        }

    message.read = True

    db.commit()

    return {
        "message": "Message marked as read"
    }
@app.put("/workspace/promote-admin")
def promote_admin(
    data: PromoteMember,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only owner can promote admins"
        }

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == data.workspace_id,
        WorkspaceMember.user_id == data.user_id
    ).first()

    if not member:
        return {
            "message": "User is not a workspace member"
        }

    member.role = "admin"

    db.commit()

    return {
        "message": "User promoted to admin"
    }
@app.get("/workspace/{workspace_id}/members")
def get_workspace_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user_id
    ).first()

    if not member:
        return {
            "message": "You are not a member of this workspace"
        }

    members = db.query(
        WorkspaceMember,
        User.username,
        User.email
    ).join(
        User,
        WorkspaceMember.user_id == User.id
    ).filter(
        WorkspaceMember.workspace_id == workspace_id
    ).all()

    result = []

    for member, username, email in members:
        result.append({
            "user_id": member.user_id,
            "username": username,
            "email": email,
            "role": member.role
        })

    return result

@app.put("/workspace/demote-admin")
def demote_admin(
    data: DemoteMember,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only owner can demote admins"
        }

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == data.workspace_id,
        WorkspaceMember.user_id == data.user_id
    ).first()

    if not member:
        return {
            "message": "User is not a workspace member"
        }

    if member.role == "owner":
        return {
            "message": "Owner cannot be demoted"
        }

    member.role = "member"

    db.commit()

    return {
        "message": "User demoted to member"
    }

@app.delete("/workspace/remove-member")
def remove_member(
    data: RemoveMember,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only owner can remove members"
        }

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == data.workspace_id,
        WorkspaceMember.user_id == data.user_id
    ).first()

    if not member:
        return {
            "message": "User is not a workspace member"
        }

    if member.role == "owner":
        return {
            "message": "Owner cannot be removed"
        }

    db.delete(member)
    db.commit()

    return {
        "message": "Member removed successfully"
    }
@app.delete("/workspace/leave")
def leave_workspace(
    data: LeaveWorkspace,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id == current_user_id:
        return {
            "message": "Owner cannot leave workspace"
        }

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == data.workspace_id,
        WorkspaceMember.user_id == current_user_id
    ).first()

    if not member:
        return {
            "message": "You are not a member of this workspace"
        }

    db.delete(member)
    db.commit()

    return {
        "message": "You left the workspace successfully"
    }
@app.delete("/workspace/delete")
def delete_workspace(
    data: DeleteWorkspace,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only owner can delete workspace"
        }

    channels = db.query(Channel).filter(
        Channel.workspace_id == data.workspace_id
    ).all()

    for channel in channels:

        db.query(Message).filter(
            Message.channel_id == channel.id
        ).delete()

        db.delete(channel)

    db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == data.workspace_id
    ).delete()

    db.delete(workspace)

    db.commit()

    return {
        "message": "Workspace deleted successfully"
    }

@app.delete("/channel/delete")
def delete_channel(
    data: DeleteChannel,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
   

    channel = db.query(Channel).filter(
        Channel.id == data.channel_id
    ).first()

    if not channel:
        return {
            "message": "Channel not found"
        }

    workspace = db.query(Workspace).filter(
        Workspace.id == channel.workspace_id
    ).first()

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only workspace owner can delete channels"
        }

    db.query(Message).filter(
        Message.channel_id == channel.id
    ).delete()

    db.delete(channel)

    db.commit()

    return {
        "message": "Channel deleted successfully"
    }
@app.put("/channel/rename")
def rename_channel(
    data: RenameChannel,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    channel = db.query(Channel).filter(
        Channel.id == data.channel_id
    ).first()

    if not channel:
        return {
            "message": "Channel not found"
        }

    workspace = db.query(Workspace).filter(
        Workspace.id == channel.workspace_id
    ).first()

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only workspace owner can rename channels"
        }

    channel.name = data.name

    db.commit()
    db.refresh(channel)

    return {
        "message": "Channel renamed successfully",
        "channel_id": channel.id,
        "name": channel.name
    }
@app.put("/workspace/rename")
def rename_workspace(
    data: RenameWorkspace,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    workspace = db.query(Workspace).filter(
        Workspace.id == data.workspace_id
    ).first()

    if not workspace:
        return {
            "message": "Workspace not found"
        }

    if workspace.owner_id != current_user_id:
        return {
            "message": "Only workspace owner can rename workspace"
        }

    workspace.name = data.name

    db.commit()
    db.refresh(workspace)

    return {
        "message": "Workspace renamed successfully",
        "workspace_id": workspace.id,
        "name": workspace.name
    }
@app.get("/profile")
def get_profile(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    

    user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }
@app.put("/profile")
def update_profile(
    data: UpdateProfile,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
   

    user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    existing_user = db.query(User).filter(
        User.email == data.email,
        User.id != current_user_id
    ).first()

    if existing_user:
        return {
            "message": "Email already in use"
        }

    user.username = data.username
    user.email = data.email

    db.commit()
    db.refresh(user)

    return {
        "message": "Profile updated successfully",
        "id": user.id,
        "username": user.username,
        "email": user.email
    }
@app.put("/change-password")
def change_password(
    data: ChangePassword,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    if not pwd_context.verify(
        data.current_password,
        user.password
    ):
        return {
            "message": "Current password is incorrect"
        }

    user.password = pwd_context.hash(
        data.new_password
    )

    db.commit()

    return {
        "message": "Password changed successfully"
    }
@app.post("/react/add")
def react_to_message(
    reaction: ReactionCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    

    message = db.query(Message).filter(
        Message.id == reaction.message_id
    ).first()

    if not message:
        return {
            "message": "Message not found"
        }

    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == reaction.message_id,
        MessageReaction.user_id == current_user_id,
        MessageReaction.emoji == reaction.emoji
    ).first()

    if existing:
        return {
            "message": "Reaction already exists"
        }

    new_reaction = MessageReaction(
        message_id=reaction.message_id,
        user_id=current_user_id,
        emoji=reaction.emoji
    )

    db.add(new_reaction)
    db.commit()

    return {
        "message": "Reaction added"
    }
@app.delete("/reaction/remove")
def remove_reaction(
    reaction: ReactionCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == reaction.message_id,
        MessageReaction.user_id == current_user_id,
        MessageReaction.emoji == reaction.emoji
    ).first()

    if not existing:
        return {
            "message": "Reaction not found"
        }

    db.delete(existing)
    db.commit()

    return {
        "message": "Reaction removed"
    }

@app.get("/reactions/{message_id}/")
def get_message_reactions(
    message_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    

    message = db.query(Message).filter(
        Message.id == message_id
    ).first()

    if not message:
        return {
            "message": "Message not found"
        }

    reactions = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id
    ).all()

    result = {}

    for reaction in reactions:
        emoji = reaction.emoji

        if emoji not in result:
            result[emoji] = 0

        result[emoji] += 1

    return result
@app.put("/message/pin/{message_id}")
def pin_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_pinned = True
    db.commit()

    return {"success": True}

@app.put("/message/unpin/{message_id}")
def unpin_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    message.is_pinned = False
    db.commit()

    return {"success": True} 

@app.get("/channel/{channel_id}/pinned")
def get_pinned_messages(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    messages = db.query(Message).filter(
        Message.channel_id == channel_id,
        Message.is_pinned == True,
        Message.parent_message_id == None
    ).order_by(Message.created_at).all()

    result = []

    for msg in messages:
        user = db.query(User).filter(User.id == msg.user_id).first()

        reply_count = db.query(Message).filter(
            Message.parent_message_id == msg.id
        ).count()

        msg_reactions = db.query(MessageReaction).filter(
            MessageReaction.message_id == msg.id
        ).all()

        reaction_list = [
            {
                "emoji": reaction.emoji,
                "user_id": reaction.user_id,
                "message_id": reaction.message_id
            }
            for reaction in msg_reactions
        ]

        result.append(
            serialize_message(
                msg=msg,
                user=user,
                reply_count=reply_count,
                reactions=reaction_list
            )
        )

    return result
@app.get("/search/messages")
def search_messages(
    q: str,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    messages = db.query(Message).filter(
        Message.content.ilike(f"%{q}%")
    ).all()

    result = []

    for message in messages:
        result.append({
            "id": message.id,
            "content": message.content,
            "channel_id": message.channel_id,
            "user_id": message.user_id,
            "created_at": message.created_at
        })

    return result
@app.post("/thread/reply")
def send_thread_reply(
    reply: ThreadReplyCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    parent = db.query(Message).filter(
        Message.id == reply.parent_id
    ).first()

    if not parent:
        raise HTTPException(status_code=404, detail="Parent message not found")

    new_reply = Message(
        content=reply.content,
        user_id=current_user_id,
        channel_id=parent.channel_id,
        parent_message_id=reply.parent_id
    )

    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)

    user = db.query(User).filter(User.id == current_user_id).first()

    return serialize_message(
        msg=new_reply,
        user=user,
        reply_count=0,
        reactions=[]
    )    
@app.get("/message/thread/{message_id}")
def get_message_thread(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    parent = db.query(Message).filter(
        Message.id == message_id
    ).first()

    if not parent:
        return []

    replies = db.query(Message).filter(
        Message.parent_message_id == message_id
    ).order_by(Message.created_at).all()

    result = []

    for reply in replies:
        user = db.query(User).filter(
            User.id == reply.user_id
        ).first()

        reply_reactions = db.query(MessageReaction).filter(
            MessageReaction.message_id == reply.id
        ).all()

        reaction_list = []
        for reaction in reply_reactions:
            reaction_list.append({
                "emoji": reaction.emoji,
                "user_id": reaction.user_id,
                "message_id": reaction.message_id
            })

        nested_reply_count = db.query(Message).filter(
            Message.parent_message_id == reply.id
        ).count()

        result.append(
            serialize_message(
                msg=reply,
                user=user,
                reply_count=nested_reply_count,
                reactions=reaction_list
            )
        )

    return result

@app.get("/message/{message_id}/thread-count")
def thread_count(
    message_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    count = db.query(Message).filter(
        Message.parent_message_id == message_id
    ).count()

    return {
        "message_id": message_id,
        "reply_count": count
    }
@app.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {
        "message": "File uploaded",
        "filename": file.filename
    }
@app.post("/channel/upload")
def upload_channel_file(
    channel_id: int,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    current_user_id: int = Depends(get_current_user_id)
):
    

    channel = db.query(Channel).filter(
        Channel.id == channel_id
    ).first()

    if not channel:
        return {
            "message": "Channel not found"
        }

    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    new_file = FileMessage(
        filename=file.filename,
        filepath=file_path,
        user_id=current_user_id,
        channel_id=channel_id
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return {
        "message": "File uploaded",
        "file_id": new_file.id
    }
@app.get("/channel/{channel_id}/files")
def get_channel_files(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    files = db.query(FileMessage).filter(
        FileMessage.channel_id == channel_id
    ).all()

    result = []

    for file in files:
        result.append({
            "id": file.id,
            "filename": file.filename,
            "uploaded_by": file.user_id,
            "created_at": file.created_at
        })

    return result
@app.get("/notifications")
def get_notifications(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    

    notifications = db.query(Notification).filter(
        Notification.user_id == current_user_id
    ).order_by(
        Notification.created_at.desc()
    ).all()

    result = []

    for notification in notifications:
        result.append({
            "id": notification.id,
            "text": notification.text,
            "is_read": notification.is_read,
            "created_at": notification.created_at
        })

    return result
@app.put("/notifications/read/{notification_id}")
def mark_notification_read(
    notification_id: int,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
   

    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user_id
    ).first()

    if not notification:
        return {
            "message": "Notification not found"
        }

    notification.is_read = True

    db.commit()

    return {
        "message": "Notification marked as read"
    }
@app.put("/notifications/read-all")
def mark_all_notifications_read(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    

    notifications = db.query(Notification).filter(
        Notification.user_id == current_user_id,
        Notification.is_read == False
    ).all()

    for notification in notifications:
        notification.is_read = True

    db.commit()

    return {
        "message": "All notifications marked as read"
    }
@app.get("/notifications/unread-count")
def unread_notification_count(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    

    count = db.query(Notification).filter(
        Notification.user_id == current_user_id,
        Notification.is_read == False
    ).count()

    return {
        "unread_count": count
    }
@app.post("/logout")
def logout(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    
    user = db.query(User).filter(
        User.id == current_user_id
    ).first()

    user.is_online = False
    user.last_seen = datetime.utcnow()

    db.commit()

    return {
        "message": "Logged out successfully"
    }
@app.get("/user/status/{user_id}")
def get_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    
    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:
        return {
            "message": "User not found"
        }

    return {
        "user_id": user.id,
        "username": user.username,
        "is_online": user.is_online,
        "last_seen": user.last_seen
    }
@app.get("/users/online")
def get_online_users(
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    

    users = db.query(User).filter(
        User.is_online == True
    ).all()

    result = []

    for user in users:
        result.append({
            "id": user.id,
            "username": user.username,
            "email": user.email
        })

    return result
@app.put("/typing")
def update_typing_status(
    data: TypingUpdate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    status = db.query(TypingStatus).filter(
        TypingStatus.user_id == current_user_id,
        TypingStatus.channel_id == data.channel_id
    ).first()

    if not status:
        status = TypingStatus(
            user_id=current_user_id,
            channel_id=data.channel_id,
            is_typing=data.is_typing
        )
        db.add(status)
    else:
        status.is_typing = data.is_typing
        status.updated_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Typing status updated"
    }
@app.get("/channel/{channel_id}/typing")
def get_typing_users(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
   

    statuses = db.query(TypingStatus).filter(
        TypingStatus.channel_id == channel_id,
        TypingStatus.is_typing == True
    ).all()

    result = []

    for status in statuses:
        user = db.query(User).filter(
            User.id == status.user_id
        ).first()

        result.append({
            "user_id": user.id,
            "username": user.username
        })

    return result

@app.websocket("/ws/chat/{channel_id}")
async def websocket_chat(
    websocket: WebSocket,
    
    channel_id: int,
    token: str = Query(...)
):
    await manager.connect(
        websocket,
        channel_id
    )
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        current_user_id = payload.get("user_id")
        db = SessionLocal()

        user = db.query(User).filter(
            User.id == current_user_id
        ).first()

        user.is_online = True

        db.commit()
        await manager.broadcast(
            channel_id,
            {
                "type": "online",
                "user_id": user.id,
                "username": user.username
            }
        )

    except Exception:
        await websocket.close()
        return
    try:
        while True:

            db = SessionLocal()

            data = await websocket.receive_json()
            message_type = data.get("type")
            if message_type == "typing":

                sender = db.query(User).filter(
                    User.id == current_user_id
                ).first()

                await manager.broadcast(
                    channel_id,
                {
                    "type": "typing",
                    "user_id": sender.id,
                    "username": sender.username
                }
                )
                continue

            if message_type == "message":

                new_message = Message(
                    content=data["content"],
                    user_id=current_user_id,
                    channel_id=channel_id
                )

                db.add(new_message)
                db.commit()
                db.refresh(new_message)

                sender = db.query(User).filter(
                    User.id == new_message.user_id
                ).first()

                await manager.broadcast(
                    channel_id,
                    {
                        "type": "message",
                        "message_id": new_message.id,
                        "user_id": sender.id,
                        "username": sender.username,
                        "content": new_message.content,
                        "created_at": str(new_message.created_at)
                    }
                )

    except WebSocketDisconnect:

        db = SessionLocal()

        user = db.query(User).filter(
            User.id == current_user_id
        ).first()

        if user:
            user.is_online = False
            db.commit()

            await manager.broadcast(
                channel_id,
                {
                    "type": "offline",
                    "user_id": user.id,
                    "username": user.username
                }
            )

    manager.disconnect(
        websocket,
        channel_id
    )
@app.websocket("/ws/notifications")
async def notification_socket(
    websocket: WebSocket,
    token: str = Query(...)
):

    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=[ALGORITHM]
    )

    user_id = payload["user_id"]

    await notification_manager.connect(
        websocket,
        user_id
    )
    await notification_manager.send_notification(
        user_id,
        {
            "type": "notification",
            "message": "WebSocket notification test"
        }
    )
    try:

        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:

        notification_manager.disconnect(
            user_id
        )    
@app.post("/channel/add-member")
def add_channel_member(
    data: ChannelMemberCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    channel = db.query(Channel).filter(
        Channel.id == data.channel_id
    ).first()

    if not channel:
        return {
            "message": "Channel not found"
        }

    user = db.query(User).filter(
        User.id == data.user_id
    ).first()

    if not user:
        return {
            "message": "User not found"
        }

    existing = db.query(ChannelMember).filter(
        ChannelMember.channel_id == data.channel_id,
        ChannelMember.user_id == data.user_id
    ).first()

    if existing:
        return {
            "message": "User already in channel"
        }

    member = ChannelMember(
        channel_id=data.channel_id,
        user_id=data.user_id
    )

    db.add(member)
    db.commit()

    return {
        "message": "Member added to channel"
    }     
       
@app.get("/channel/{channel_id}/members")
def get_channel_members(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    members = (
        db.query(User)
        .join(ChannelMember, User.id == ChannelMember.user_id)
        .filter(ChannelMember.channel_id == channel_id)
        .all()
    )

    return [
        {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_online": user.is_online
        }
        for user in members
    ]
@app.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(get_current_user_id)
):
    

    file = db.query(FileMessage).filter(
        FileMessage.id == file_id
    ).first()

    if not file:
        return {
            "message": "File not found"
        }
    membership = db.query(ChannelMember).filter(
        ChannelMember.channel_id == file.channel_id,
        ChannelMember.user_id == current_user_id
    ).first()

    if not membership:
        return {
            "message": "Access denied"
        }
    return FileResponse(
        path=file.filepath,
        filename=file.filename,
        media_type="application/octet-stream"
    )
@app.post("/thread/reply")
def send_thread_reply(
    reply: ThreadReplyCreate,
    current_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    parent = db.query(Message).filter(Message.id == reply.parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent message not found")

    new_reply = Message(
        content=reply.content,
        user_id=current_user_id,
        channel_id=parent.channel_id,
        parent_message_id=reply.parent_id
    )

    db.add(new_reply)
    db.commit()
    db.refresh(new_reply)

    user = db.query(User).filter(User.id == current_user_id).first()

    return serialize_message(
        msg=new_reply,
        user=user,
        reply_count=0,
        reactions=[]
    )