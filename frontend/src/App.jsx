import React, { useEffect, useState } from "react";
import ChatSearch from "./ChatSearch";
import { getSessions, createSession, deleteSession, renameSession } from "./api";
import "./App.css";
import "./theme.css";

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState('default');
  const [loading, setLoading] = useState(true);

  // Load sessions from database on mount
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const sessionsData = await getSessions();
      if (sessionsData.length === 0) {
        // Create default session if none exist
        try {
          await createSession('default', 'Default Chat');
        } catch (createError) {
          console.warn('Failed to create session in database, using fallback');
        }
        setSessions([{ session_id: 'default', name: 'Default Chat' }]);
      } else {
        setSessions(sessionsData);
        setActiveId(sessionsData[0].session_id);
      }
    } catch (error) {
      console.error('Failed to load sessions from database, using fallback:', error);
      // Fallback to localStorage or default session
      const fallbackSessions = localStorage.getItem('chat_sessions');
      if (fallbackSessions) {
        try {
          const parsed = JSON.parse(fallbackSessions);
          setSessions(parsed.map(s => typeof s === 'string' ? { session_id: s, name: s } : s));
        } catch {
          setSessions([{ session_id: 'default', name: 'Default Chat' }]);
        }
      } else {
        setSessions([{ session_id: 'default', name: 'Default Chat' }]);
      }
    } finally {
      setLoading(false);
    }
  }

  function selectSession(id){
    setActiveId(id);
    window.dispatchEvent(new CustomEvent('chat_session_select', { detail: { id } }));
  }

  async function addSession(){
    const newId = `session-${Date.now()}`;
    const newName = `Chat ${sessions.length + 1}`;
    try {
      await createSession(newId, newName);
      const updatedSessions = [...sessions, { session_id: newId, name: newName }];
      setSessions(updatedSessions);
      selectSession(newId);
    } catch (error) {
      console.error('Failed to create session in database, using fallback:', error);
      // Fallback: create session locally
      const updatedSessions = [...sessions, { session_id: newId, name: newName }];
      setSessions(updatedSessions);
      // Save to localStorage as fallback
      localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions.map(s => s.session_id)));
      selectSession(newId);
    }
  }

  async function deleteSessionHandler(id){
    if (sessions.length === 1) return;
    try {
      await deleteSession(id);
      const remaining = sessions.filter(s => s.session_id !== id);
      setSessions(remaining);
      const nextActive = remaining[0].session_id;
      selectSession(nextActive);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    }
  }

  async function renameSessionHandler(id){
    const currentSession = sessions.find(s => s.session_id === id);
    const name = prompt('Rename session', currentSession?.name || id);
    if (!name || name === currentSession?.name) return;
    
    try {
      await renameSession(id, name);
      const updatedSessions = sessions.map(s => 
        s.session_id === id ? { ...s, name } : s
      );
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('Failed to rename session');
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">AI Assistant</div>
          <button className="new-session" onClick={addSession}>+ New Chat</button>
        </div>
        <div className="session-list">
          {loading ? (
            <div style={{padding: '1rem', textAlign: 'center', color: '#666'}}>Loading sessions...</div>
          ) : (
            sessions.map(session => (
              <div key={session.session_id} className={`session-item ${session.session_id === activeId ? 'active' : ''}`} onClick={() => selectSession(session.session_id)}>
                <div className="session-name" title={session.name}>{session.name}</div>
                <div className="session-actions">
                  <button className="icon" title="Rename" onClick={(e)=>{e.stopPropagation(); renameSessionHandler(session.session_id);}}>✏️</button>
                  <button className="icon" title="Delete" onClick={(e)=>{e.stopPropagation(); deleteSessionHandler(session.session_id);}}>🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
      <main className="main-panel">
        <ChatSearch />
      </main>
    </div>
  );
}

export default App;