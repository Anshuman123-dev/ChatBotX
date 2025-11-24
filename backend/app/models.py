# models.py
from pydantic import BaseModel, EmailStr
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

# Authentication Models
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    created_at: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse