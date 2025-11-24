# database.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from dotenv import load_dotenv
from typing import List, Dict, Optional
from datetime import datetime

load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")

# Extract database name from URI if present, otherwise use default
def get_database_name_from_uri(uri):
    try:
        # Parse the URI to extract database name
        if "/" in uri and "?" not in uri.split("/")[-1]:
            # If there's a database name in the URI (no query params)
            return uri.split("/")[-1]
        elif "/" in uri and "?" in uri:
            # If there are query params, extract the part before the query
            db_part = uri.split("/")[-1].split("?")[0]
            return db_part if db_part else "chatbot_db"
        else:
            return "chatbot_db"
    except:
        return "chatbot_db"

DATABASE_NAME = get_database_name_from_uri(MONGODB_URL)

# Async client for FastAPI with connection options
async_client = AsyncIOMotorClient(
    MONGODB_URL,
    serverSelectionTimeoutMS=5000,  # 5 second timeout
    connectTimeoutMS=10000,         # 10 second connection timeout
    socketTimeoutMS=20000,          # 20 second socket timeout
    maxPoolSize=10,                 # Maximum number of connections
    retryWrites=True,               # Enable retryable writes
    retryReads=True                 # Enable retryable reads
)
database = async_client[DATABASE_NAME]

# Log database connection info
print(f"🔗 Connected to MongoDB database: {DATABASE_NAME}")
print(f"📡 MongoDB URI: {MONGODB_URL.replace(MONGODB_URL.split('@')[0].split('//')[1], '***:***') if '@' in MONGODB_URL else MONGODB_URL}")

# Collections
sessions_collection = database["sessions"]
messages_collection = database["messages"]
users_collection = database["users"]

# Test connection on startup
async def test_connection():
    try:
        # Test the connection
        await async_client.admin.command('ping')
        print("✅ MongoDB connection successful!")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return False

class DatabaseManager:
    @staticmethod
    async def create_session(session_id: str, name: str = None) -> bool:
        """Create a new chat session"""
        try:
            session_doc = {
                "session_id": session_id,
                "name": name or session_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await sessions_collection.insert_one(session_doc)
            return True
        except Exception as e:
            print(f"Error creating session: {e}")
            # If database is not available, still return True to prevent app crash
            return True

    @staticmethod
    async def get_sessions() -> List[Dict]:
        """Get all chat sessions"""
        try:
            sessions = []
            async for session in sessions_collection.find().sort("updated_at", -1):
                sessions.append({
                    "session_id": session["session_id"],
                    "name": session["name"],
                    "created_at": session["created_at"].isoformat(),
                    "updated_at": session["updated_at"].isoformat()
                })
            return sessions
        except Exception as e:
            print(f"Error getting sessions: {e}")
            # Return default session if database is not available
            return [{
                "session_id": "default",
                "name": "Default Chat",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }]

    @staticmethod
    async def delete_session(session_id: str) -> bool:
        """Delete a session and all its messages"""
        try:
            # Delete session
            await sessions_collection.delete_one({"session_id": session_id})
            # Delete all messages for this session
            await messages_collection.delete_many({"session_id": session_id})
            return True
        except Exception as e:
            print(f"Error deleting session: {e}")
            return True  # Return True to prevent app crash

    @staticmethod
    async def save_message(session_id: str, role: str, content: str, thinking: List = None, timestamp: datetime = None) -> bool:
        """Save a message to the database"""
        try:
            message_doc = {
                "session_id": session_id,
                "role": role,
                "content": content,
                "thinking": thinking or [],
                "timestamp": timestamp or datetime.utcnow(),
                "created_at": datetime.utcnow()
            }
            await messages_collection.insert_one(message_doc)
            
            # Update session's updated_at timestamp
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
            return True
        except Exception as e:
            print(f"Error saving message: {e}")
            return True  # Return True to prevent app crash

    @staticmethod
    async def get_messages(session_id: str) -> List[Dict]:
        """Get all messages for a session"""
        try:
            messages = []
            async for message in messages_collection.find({"session_id": session_id}).sort("timestamp", 1):
                messages.append({
                    "role": message["role"],
                    "content": message["content"],
                    "thinking": message.get("thinking", []),
                    "timestamp": message["timestamp"].isoformat()
                })
            return messages
        except Exception as e:
            print(f"Error getting messages: {e}")
            return []

    @staticmethod
    async def clear_messages(session_id: str) -> bool:
        """Clear all messages for a session"""
        try:
            await messages_collection.delete_many({"session_id": session_id})
            return True
        except Exception as e:
            print(f"Error clearing messages: {e}")
            return True  # Return True to prevent app crash

    @staticmethod
    async def rename_session(session_id: str, new_name: str) -> bool:
        """Rename a session"""
        try:
            await sessions_collection.update_one(
                {"session_id": session_id},
                {"$set": {"name": new_name, "updated_at": datetime.utcnow()}}
            )
            return True
        except Exception as e:
            print(f"Error renaming session: {e}")
            return True  # Return True to prevent app crash

    # User Management Methods
    @staticmethod
    async def create_user(email: str, username: str, hashed_password: str) -> Optional[Dict]:
        """Create a new user"""
        try:
            user_doc = {
                "email": email.lower(),
                "username": username,
                "password": hashed_password,
                "created_at": datetime.utcnow()
            }
            result = await users_collection.insert_one(user_doc)
            user_doc["id"] = str(result.inserted_id)
            return user_doc
        except Exception as e:
            print(f"Error creating user: {e}")
            return None

    @staticmethod
    async def get_user_by_email(email: str) -> Optional[Dict]:
        """Get user by email"""
        try:
            user = await users_collection.find_one({"email": email.lower()})
            if user:
                user["id"] = str(user["_id"])
            return user
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    @staticmethod
    async def get_user_by_username(username: str) -> Optional[Dict]:
        """Get user by username"""
        try:
            user = await users_collection.find_one({"username": username})
            if user:
                user["id"] = str(user["_id"])
            return user
        except Exception as e:
            print(f"Error getting user by username: {e}")
            return None

    @staticmethod
    async def get_user_by_id(user_id: str) -> Optional[Dict]:
        """Get user by ID"""
        try:
            from bson import ObjectId
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                user["id"] = str(user["_id"])
            return user
        except Exception as e:
            print(f"Error getting user by ID: {e}")
            return None
