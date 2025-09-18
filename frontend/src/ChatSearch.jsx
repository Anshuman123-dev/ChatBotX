import React, { useState, useRef, useEffect } from "react";
import RagUploader from "./RagUploader";
import { searchChat, summarizeUrl, queryRag, getMessages, saveMessage, clearMessages } from "./api";

export default function ChatSearch() {
  const [sessionId, setSessionId] = useState('default');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState([]);
  const [expandedThinking, setExpandedThinking] = useState({});
  const [showUploader, setShowUploader] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load messages for active session on mount and when session changes
  useEffect(() => {
    const onSelect = (e) => {
      if (e?.detail?.id) setSessionId(e.detail.id);
    };
    window.addEventListener('chat_session_select', onSelect);
    loadMessagesForSession(sessionId);
    return () => window.removeEventListener('chat_session_select', onSelect);
  }, [sessionId]);

  async function loadMessagesForSession(sessionId) {
    setLoadingMessages(true);
    try {
      const messagesData = await getMessages(sessionId);
      if (messagesData.length === 0) {
        // Add welcome message for new sessions
        const welcomeMessage = {
          role: "assistant",
          content: "Hi! I'm an AI assistant with web search capabilities. Ask me anything and I'll help you find the most up-to-date information.",
          timestamp: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
        // Try to save welcome message to database
        try {
          await saveMessage(sessionId, welcomeMessage.role, welcomeMessage.content, []);
        } catch (saveError) {
          console.warn('Failed to save welcome message to database:', saveError);
        }
      } else {
        setMessages(messagesData.map(m => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
        })));
      }
    } catch (error) {
      console.error('Failed to load messages from database, using fallback:', error);
      // Fallback to localStorage
      const fallbackMessages = localStorage.getItem(`chat_messages_${sessionId}`);
      if (fallbackMessages) {
        try {
          const parsed = JSON.parse(fallbackMessages).map(m => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
          setMessages(parsed);
        } catch {
          setMessages([{
            role: "assistant",
            content: "Hi! I'm an AI assistant with web search capabilities. Ask me anything and I'll help you find the most up-to-date information.",
            timestamp: new Date()
          }]);
        }
      } else {
        setMessages([{
          role: "assistant",
          content: "Hi! I'm an AI assistant with web search capabilities. Ask me anything and I'll help you find the most up-to-date information.",
          timestamp: new Date()
        }]);
      }
    } finally {
      setLoadingMessages(false);
    }
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  };

  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = {
      role: "user",
      content: input,
      timestamp: new Date()
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    
    try {
      // Try to save user message to database
      try {
        await saveMessage(sessionId, "user", input, []);
      } catch (saveError) {
        console.warn('Failed to save user message to database:', saveError);
        // Fallback to localStorage
        localStorage.setItem(`chat_messages_${sessionId}`, JSON.stringify(newMessages.map(m => ({
          ...m,
          timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp
        }))));
      }
      
      // Check if we should use RAG (if user mentions documents/PDFs or asks about uploaded content)
      const shouldUseRAG = checkIfShouldUseRAG(input);
      
      let resp;
      if (shouldUseRAG) {
        // Use RAG for document-related questions
        resp = await queryRag(sessionId, input);
        const botReply = {
          role: "assistant",
          content: resp.answer || "I couldn't find relevant information in the uploaded documents.",
          timestamp: new Date()
        };
        setMessages([...newMessages, botReply]);
        // Try to save assistant message to database
        try {
          await saveMessage(sessionId, "assistant", botReply.content, []);
        } catch (saveError) {
          console.warn('Failed to save assistant message to database:', saveError);
        }
      } else {
        // Use web search for general questions
        resp = await searchChat(newMessages);
        const botReply = {
          role: "assistant",
          content: resp.response || "I apologize, but I couldn't generate a response. Please try again.",
          thinking: resp.steps || [],
          timestamp: new Date()
        };
        setMessages([...newMessages, botReply]);
        // Try to save assistant message to database
        try {
          await saveMessage(sessionId, "assistant", botReply.content, botReply.thinking);
        } catch (saveError) {
          console.warn('Failed to save assistant message to database:', saveError);
        }
      }
    } catch (e) {
      const errorMessage = {
        role: "assistant",
        content: `I encountered an error: ${e.message}. Please check your connection and try again.`,
        timestamp: new Date()
      };
      setMessages([...newMessages, errorMessage]);
      // Try to save error message to database
      try {
        await saveMessage(sessionId, "assistant", errorMessage.content, []);
      } catch (saveError) {
        console.warn('Failed to save error message to database:', saveError);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function checkIfShouldUseRAG(message) {
    const ragKeywords = [
      'document', 'pdf', 'uploaded', 'file', 'text', 'content', 'page', 'section',
      'according to', 'in the document', 'what does it say', 'summarize the',
      'based on the', 'from the pdf', 'in the file'
    ];
    
    const lowerMessage = message.toLowerCase();
    return ragKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  async function handleUploadSuccess(fileCount) {
    // Close the uploader modal
    setShowUploader(false);
    
    // Add a confirmation message to the chat
    const confirmationMessage = {
      role: "assistant",
      content: `✅ Successfully uploaded ${fileCount} PDF file(s) to session "${sessionId}". You can now ask questions about the documents in this chat!`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmationMessage]);
    // Save confirmation message to database
    await saveMessage(sessionId, "assistant", confirmationMessage.content, []);
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function clearChat() {
    try {
      await clearMessages(sessionId);
      const welcomeMessage = {
        role: "assistant",
        content: "Hi! I'm an AI assistant with web search capabilities. Ask me anything and I'll help you find the most up-to-date information.",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      await saveMessage(sessionId, welcomeMessage.role, welcomeMessage.content, []);
      setExpandedThinking({});
    } catch (error) {
      console.error('Failed to clear chat:', error);
      alert('Failed to clear chat');
    }
  }

  function toggleThinking(messageIndex) {
    setExpandedThinking(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }));
  }

  async function summarizeUrlContent() {
    if (!urlInput.trim()) return;
    
    setSummarizing(true);
    try {
      const resp = await summarizeUrl(urlInput);
      const summaryMessage = {
        role: "assistant",
        content: `📄 **Summary of ${resp.url}:**\n\n${resp.summary}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, summaryMessage]);
      // Save summary message to database
      await saveMessage(sessionId, "assistant", summaryMessage.content, []);
      setUrlInput("");
      setShowUrlInput(false);
    } catch (e) {
      const errorMessage = {
        role: "assistant",
        content: `❌ Failed to summarize URL: ${e.message}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      // Save error message to database
      await saveMessage(sessionId, "assistant", errorMessage.content, []);
    } finally {
      setSummarizing(false);
    }
  }

  function formatTime(timestamp) {
    try {
      // Handle both Date objects and ISO strings
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch (error) {
      console.warn('Error formatting time:', error, 'Timestamp:', timestamp);
      return 'Invalid time';
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <h2>🔍 AI Assistant</h2>
          <span className="chat-subtitle">Ask questions, upload PDFs, or summarize URLs</span>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button className="clear-button" onClick={() => setShowUrlInput(true)} title="Summarize YouTube or web page">
            🔗 Summarize URL
          </button>
          <button className="clear-button" onClick={() => setShowUploader(true)} title="Upload PDFs to chat about">
            📄 Upload PDFs
          </button>
          <button className="clear-button" onClick={clearChat} title="Clear conversation">
            🗑️ Clear
          </button>
        </div>
      </div>
      
      <div className="chat-messages" ref={listRef}>
        {loadingMessages ? (
          <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>Loading messages...</div>
        ) : (
          messages.map((message, index) => (
          <div key={index} className={`message-wrapper ${message.role}`}>
            <div className={`message ${message.role}`}>
              {/* Show thinking toggle for assistant messages with thinking steps */}
              {message.role === 'assistant' && message.thinking && message.thinking.length > 0 && (
                <div className="thinking-toggle-container">
                  <button
                    className="thinking-toggle"
                    onClick={() => toggleThinking(index)}
                  >
                    <span className="thinking-icon">🧠</span>
                    <span className="thinking-text">
                      {expandedThinking[index] ? 'Hide' : 'Show'} reasoning
                    </span>
                    <span className={`thinking-arrow ${expandedThinking[index] ? 'expanded' : ''}`}>
                      ▼
                    </span>
                  </button>
                  
                  {expandedThinking[index] && (
                    <div className="thinking-content">
                      <div className="thinking-header">
                        <span className="thinking-title">💭 AI Reasoning Process</span>
                      </div>
                      <div className="thinking-steps">
                        {message.thinking.map((step, stepIndex) => (
                          <div key={stepIndex} className="thinking-step">
                            {step.tool && (
                              <div className="thinking-item">
                                <span className="thinking-label">🔧 Tool:</span>
                                <span className="thinking-value">{step.tool}</span>
                              </div>
                            )}
                            {step.tool_input && (
                              <div className="thinking-item">
                                <span className="thinking-label">📝 Input:</span>
                                <div className="thinking-value thinking-code">
                                  {typeof step.tool_input === 'string' ? step.tool_input : JSON.stringify(step.tool_input, null, 2)}
                                </div>
                              </div>
                            )}
                            {step.log && (
                              <div className="thinking-item">
                                <span className="thinking-label">📋 Log:</span>
                                <span className="thinking-value">{step.log}</span>
                              </div>
                            )}
                            {step.observation && (
                              <div className="thinking-item">
                                <span className="thinking-label">👁️ Observation:</span>
                                <div className="thinking-value">{step.observation}</div>
                              </div>
                            )}
                            {step.raw && (
                              <div className="thinking-item">
                                <span className="thinking-label">⚡ Raw:</span>
                                <div className="thinking-value">{step.raw}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="message-content">
                {message.content}
              </div>
              <div className="message-time">
                {formatTime(message.timestamp || new Date())}
              </div>
            </div>
          </div>
        ))
        )}
        
        {loading && (
          <div className="message-wrapper assistant">
            <div className="message assistant loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="message-content">
                {checkIfShouldUseRAG(input) ? "📄 Searching uploaded documents..." : "🔍 Searching the web and thinking..."}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask me anything... I can search the web, answer questions about uploaded PDFs, or summarize URLs!"
            disabled={loading}
            className="chat-input"
          />
          <button 
            onClick={sendMessage} 
            disabled={loading || !input.trim()}
            className="send-button"
            title="Send message"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      {showUrlInput && (
        <div className="modal-overlay" onClick={() => setShowUrlInput(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{fontWeight:600}}>Summarize URL</div>
              <button className="icon" onClick={() => setShowUrlInput(false)}>✖</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Enter YouTube or web page URL..."
                  style={{flex:1, padding:'8px 12px', border:'1px solid #ddd', borderRadius:'6px'}}
                />
                <button 
                  onClick={summarizeUrlContent}
                  disabled={summarizing || !urlInput.trim()}
                  style={{padding:'8px 16px', background:'#4f46e5', color:'white', border:'none', borderRadius:'6px', cursor:'pointer'}}
                >
                  {summarizing ? '⏳' : '📄'} {summarizing ? 'Summarizing...' : 'Summarize'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUploader && (
        <div className="modal-overlay" onClick={() => setShowUploader(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{fontWeight:600}}>Upload PDFs for RAG</div>
              <button className="icon" onClick={() => setShowUploader(false)}>✖</button>
            </div>
            <div className="modal-body">
              <RagUploader onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}