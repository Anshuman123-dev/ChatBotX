# models.py
from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str
    content: str

class SearchRequest(BaseModel):
    messages: List[ChatMessage]

class SimpleRequest(BaseModel):
    message: str

class RagUploadResponse(BaseModel):
    session_id: str
    status: str

class RagQueryRequest(BaseModel):
    session_id: str
    question: str

class SummarizeRequest(BaseModel):
    url: str

class SessionRequest(BaseModel):
    session_id: str
    name: Optional[str] = None

class MessageRequest(BaseModel):
    session_id: str
    role: str
    content: str
    thinking: Optional[List] = None

class SessionResponse(BaseModel):
    session_id: str
    name: str
    created_at: str
    updated_at: str

class MessageResponse(BaseModel):
    role: str
    content: str
    thinking: List
    timestamp: str