# 🤖 AI ChatBot with RAG & Web Search

A modern, full-stack AI chatbot application that combines web search capabilities with RAG (Retrieval-Augmented Generation) for PDF document analysis. Built with FastAPI, React, and MongoDB.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![React](https://img.shields.io/badge/React-18+-61dafb.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)

## ✨ Features

### 🔍 **Web Search & AI Chat**
- Real-time web search using DuckDuckGo, Arxiv, and Wikipedia
- AI-powered responses with Groq's Llama models
- Interactive "Thinking" section showing AI reasoning steps
- Session management with persistent chat history

### 📄 **RAG Document Analysis**
- Upload PDF documents for analysis
- Ask questions about uploaded content
- Automatic document indexing with Chroma vector store
- Seamless integration with chat interface

### 🔗 **URL Summarization**
- Summarize YouTube videos and web pages
- Extract key insights from any URL
- One-click integration with chat

### 💾 **Data Persistence**
- MongoDB Atlas integration for cloud storage
- Automatic fallback to localStorage
- Session management across reloads
- Real-time data synchronization

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB Atlas account (or local MongoDB)
- Groq API key

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chatbot.git
cd chatbot
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
# API Keys
GROQ_API_KEY=your_groq_api_key_here
HF_TOKEN=your_huggingface_token_here

# MongoDB Configuration
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/chatbot_db
```

Start the backend server:

```bash
uvicorn app.main:app --reload
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_BASE=http://localhost:8000
```

Start the frontend development server:

```bash
npm run dev
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
chatbot/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Pydantic models
│   │   ├── database.py          # MongoDB connection
│   │   ├── search_agent.py      # Web search agent
│   │   ├── rag_manager.py       # RAG functionality
│   │   └── requirements.txt     # Python dependencies
│   └── .env                     # Environment variables
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main React component
│   │   ├── ChatSearch.jsx       # Chat interface
│   │   ├── RagUploader.jsx      # PDF upload component
│   │   ├── api.js               # API client
│   │   ├── App.css              # Main styles
│   │   └── theme.css            # Theme configuration
│   ├── package.json             # Node dependencies
│   └── .env                     # Frontend environment
└── README.md
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
GROQ_API_KEY=your_groq_api_key_here          # Required: Get from https://console.groq.com/
HF_TOKEN=your_huggingface_token_here         # Optional: For HuggingFace embeddings
MONGODB_URL=mongodb+srv://...                # Required: MongoDB Atlas connection string
```

#### Frontend (.env)
```env
VITE_API_BASE=http://localhost:8000          # Backend API URL
```

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Add your IP address to the whitelist
5. Update the `MONGODB_URL` in your `.env` file

## 📚 API Endpoints

### Chat & Search
- `POST /api/search-chat` - Send message and get AI response
- `POST /api/summarize` - Summarize YouTube videos or web pages

### RAG Operations
- `POST /api/rag/upload` - Upload PDF documents
- `POST /api/rag/query` - Query uploaded documents

### Database Operations
- `GET /api/sessions` - Get all chat sessions
- `POST /api/sessions` - Create new session
- `DELETE /api/sessions/{id}` - Delete session
- `GET /api/messages/{session_id}` - Get messages for session
- `POST /api/messages` - Save message
- `DELETE /api/messages/{session_id}` - Clear messages

## 🎨 Features in Detail

### Web Search Integration
- **DuckDuckGo Search**: Real-time web search
- **Arxiv Integration**: Academic paper search
- **Wikipedia Integration**: Knowledge base queries
- **AI Reasoning**: Shows step-by-step thinking process

### RAG Document Analysis
- **PDF Upload**: Drag-and-drop PDF upload
- **Vector Indexing**: Automatic document chunking and embedding
- **Semantic Search**: Find relevant content using vector similarity
- **Context-Aware Responses**: AI answers based on document content

### Session Management
- **Multiple Sessions**: Create and switch between chat sessions
- **Persistent History**: All conversations saved to database
- **Session Renaming**: Customize session names
- **Data Synchronization**: Real-time updates across sessions

## 🛠️ Development

### Running in Development Mode

Backend:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:
```bash
cd frontend
npm run dev
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 🔒 Security Considerations

- API keys are stored in environment variables
- MongoDB connection uses authentication
- CORS is configured for frontend-backend communication
- Input validation using Pydantic models

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [LangChain](https://langchain.com/) for AI framework
- [Groq](https://groq.com/) for AI inference
- [FastAPI](https://fastapi.tiangolo.com/) for backend framework
- [React](https://reactjs.org/) for frontend framework
- [MongoDB Atlas](https://www.mongodb.com/atlas) for database hosting

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/chatbot/issues) page
2. Create a new issue with detailed description
3. Include error logs and environment details

## 🚀 Deployment

### Vercel (Frontend)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway/Render (Backend)
1. Connect your GitHub repository
2. Set environment variables
3. Deploy with automatic scaling

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

---

**Made with ❤️ by [Your Name]**

*Star this repository if you found it helpful!*
