# main.py
import os
import validators
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from dotenv import load_dotenv
from .models import (SearchRequest, SimpleRequest, RagUploadResponse, RagQueryRequest, 
                     SummarizeRequest, SessionRequest, MessageRequest, SessionResponse, 
                     MessageResponse, UserRegister, UserLogin, Token, UserResponse)
from .database import DatabaseManager
from .auth import get_current_user_optional, create_access_token, get_password_hash, verify_password
from .search_agent import run_search_agent, get_search_agent
from .rag_manager import create_vectorstore_from_pdfs, query_rag, get_session
import tempfile
import shutil
from langchain.prompts import PromptTemplate
from langchain_groq import ChatGroq
from langchain.chains.summarize import load_summarize_chain
from langchain_community.document_loaders import YoutubeLoader, UnstructuredURLLoader
from datetime import datetime

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI(title="LangChain Chat API")

# configure CORS for React dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication Endpoints
@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if email already exists
    existing_user = await DatabaseManager.get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = await DatabaseManager.get_user_by_username(user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Validate password length
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user = await DatabaseManager.create_user(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "created_at": user["created_at"].isoformat()
        }
    }

@app.post("/api/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    """Login user"""
    # Find user by email
    user = await DatabaseManager.get_user_by_email(user_data.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "created_at": user["created_at"].isoformat()
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user_optional)):
    """Get current user information"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "username": current_user["username"],
        "created_at": current_user["created_at"].isoformat()
    }

@app.post("/api/search-chat")
def search_chat(req: SearchRequest):
    """
    Accepts messages: a list of {"role": "user/assistant", "content": "..."}
    Returns final assistant response string (agent.run output)
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set on server.")
    messages = [m.dict() for m in req.messages]
    try:
        result = run_search_agent(messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if isinstance(result, dict):
        return {"response": result.get("output", ""), "steps": result.get("steps", [])}
    return {"response": result}

@app.post("/api/rag/upload", response_model=RagUploadResponse)
async def rag_upload(session_id: str = Form(...), files: List[UploadFile] = File(...)):
    """
    Upload multiple PDFs for a session. Stores vectorstore per session_id.
    """
    tmp_paths = []
    try:
        for f in files:
            suffix = os.path.splitext(f.filename)[1] or ".pdf"
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            contents = await f.read()
            tmp.write(contents)
            tmp.flush()
            tmp_paths.append(tmp.name)
            tmp.close()

        create_vectorstore_from_pdfs(session_id, tmp_paths)
        return {"session_id": session_id, "status": "ok"}
    finally:
        # cleanup temp files
        for p in tmp_paths:
            try:
                os.remove(p)
            except:
                pass

@app.post("/api/rag/query")
def rag_query(req: RagQueryRequest):
    """
    Query the uploaded PDFs for session_id.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set on server.")

    session = get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found. Upload PDFs first.")

    try:
        answer, history = query_rag(req.session_id, req.question, groq_api_key=GROQ_API_KEY)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"answer": answer, "chat_history": history}

@app.post("/api/summarize")
def summarize_url(req: SummarizeRequest):
    """
    Summarize YouTube videos or web pages from URL.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set on server.")
    
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    if not validators.url(url):
        raise HTTPException(status_code=400, detail="Invalid URL provided")

    try:
        # Initialize LLM and prompt
        llm = ChatGroq(model="llama-3.1-8b-instant", groq_api_key=GROQ_API_KEY)
        prompt_template = """
Provide a comprehensive summary of the following content in 300 words:
Content: {text}
"""
        prompt = PromptTemplate(template=prompt_template, input_variables=["text"])

        # Load content based on URL type
        if "youtube.com" in url or "youtu.be" in url:
            try:
                loader = YoutubeLoader.from_youtube_url(url, add_video_info=True)
                docs = loader.load()
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to load YouTube video: {str(e)}")
        else:
            loader = UnstructuredURLLoader(
                urls=[url],
                ssl_verify=False,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36"
                }
            )
            docs = loader.load()

        # Summarization chain
        chain = load_summarize_chain(llm, chain_type="stuff", prompt=prompt)
        output_summary = chain.run(docs)

        return {"summary": output_summary, "url": url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

# Database endpoints for chat persistence
@app.post("/api/sessions", response_model=SessionResponse)
async def create_session(req: SessionRequest):
    """Create a new chat session"""
    success = await DatabaseManager.create_session(req.session_id, req.name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create session")
    
    return {
        "session_id": req.session_id,
        "name": req.name or req.session_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

@app.get("/api/sessions", response_model=List[SessionResponse])
async def get_sessions():
    """Get all chat sessions"""
    sessions = await DatabaseManager.get_sessions()
    return sessions

@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its messages"""
    success = await DatabaseManager.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete session")
    return {"message": "Session deleted successfully"}

@app.put("/api/sessions/{session_id}")
async def rename_session(session_id: str, name: str):
    """Rename a session"""
    success = await DatabaseManager.rename_session(session_id, name)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to rename session")
    return {"message": "Session renamed successfully"}

@app.post("/api/messages", response_model=MessageResponse)
async def save_message(req: MessageRequest):
    """Save a message to the database"""
    from datetime import datetime
    success = await DatabaseManager.save_message(
        req.session_id, 
        req.role, 
        req.content, 
        req.thinking,
        datetime.utcnow()
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save message")
    
    return {
        "role": req.role,
        "content": req.content,
        "thinking": req.thinking or [],
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/messages/{session_id}", response_model=List[MessageResponse])
async def get_messages(session_id: str):
    """Get all messages for a session"""
    messages = await DatabaseManager.get_messages(session_id)
    return messages

@app.delete("/api/messages/{session_id}")
async def clear_messages(session_id: str):
    """Clear all messages for a session"""
    success = await DatabaseManager.clear_messages(session_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear messages")
    return {"message": "Messages cleared successfully"}
