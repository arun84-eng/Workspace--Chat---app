def serialize_message(msg, user=None, reply_count=0, reactions=None):
    return {
        "id": msg.id,
        "channel_id": msg.channel_id,
        "user_id": msg.user_id,
        "username": user.username if user else None,
        "content": msg.content,
        "parent_message_id": msg.parent_message_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "edited_at": None,
        "is_pinned": bool(getattr(msg, "is_pinned", False)),
        "reply_count": reply_count,
        "reactions": reactions or [],
        "attachments": []
    }