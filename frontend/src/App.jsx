import React, { useEffect, useState } from "react";
import ChatSearch from "./ChatSearch";
import Auth from "./Auth";
import { useAuth } from "./AuthContext";
import { getSessions, createSession, deleteSession, renameSession } from "./api";
import "./App.css";
import "./theme.css";

function App() {
  const { user, isGuest, logout, hasChosenMode, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState('default');
  const [loading, setLoading] = useState(true);

  // Show auth screen if user hasn't chosen a mode
  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1.5rem'
      }}>
        Loading...
      </div>
    );
  }

  if (!hasChosenMode) {
    return <Auth />;
  }

  return <MainApp 
    isGuest={isGuest}
    user={user}
    logout={logout}
    sessions={sessions}
    setSessions={setSessions}
    activeId={activeId}
    setActiveId={setActiveId}
    loading={loading}
    setLoading={setLoading}
  />;
}

function MainApp({ isGuest, user, logout, sessions, setSessions, activeId, setActiveId, loading, setLoading }) {
  // Load sessions from database on mount (or localStorage for guests)
  useEffect(() => {
    loadSessions();
  }, [isGuest]);

  async function loadSessions() {
    if (isGuest) {
      // For guest users, use localStorage
      const guestSessions = localStorage.getItem('guest_sessions');
      if (guestSessions) {
        try {
          const parsed = JSON.parse(guestSessions);
          setSessions(parsed);
          if (parsed.length > 0) {
            setActiveId(parsed[0].session_id);
          }
        } catch {
          setSessions([{ session_id: 'default', name: 'Default Chat' }]);
        }
      } else {
        setSessions([{ session_id: 'default', name: 'Default Chat' }]);
      }
      setLoading(false);
      return;
    }

    // For authenticated users, use database
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
      setSessions([{ session_id: 'default', name: 'Default Chat' }]);
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
    
    if (isGuest) {
      // For guest users, store in localStorage
      const updatedSessions = [...sessions, { session_id: newId, name: newName }];
      setSessions(updatedSessions);
      localStorage.setItem('guest_sessions', JSON.stringify(updatedSessions));
      selectSession(newId);
      return;
    }

    // For authenticated users, use database
    try {
      await createSession(newId, newName);
      const updatedSessions = [...sessions, { session_id: newId, name: newName }];
      setSessions(updatedSessions);
      selectSession(newId);
    } catch (error) {
      console.error('Failed to create session in database:', error);
      alert('Failed to create session');
    }
  }

  async function deleteSessionHandler(id){
    if (sessions.length === 1) return;
    
    if (isGuest) {
      // For guest users, update localStorage
      const remaining = sessions.filter(s => s.session_id !== id);
      setSessions(remaining);
      localStorage.setItem('guest_sessions', JSON.stringify(remaining));
      const nextActive = remaining[0].session_id;
      selectSession(nextActive);
      return;
    }

    // For authenticated users, use database
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
    
    if (isGuest) {
      // For guest users, update localStorage
      const updatedSessions = sessions.map(s => 
        s.session_id === id ? { ...s, name } : s
      );
      setSessions(updatedSessions);
      localStorage.setItem('guest_sessions', JSON.stringify(updatedSessions));
      return;
    }

    // For authenticated users, use database
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
    <div className="app-container">
      {isGuest && (
        <div className="guest-banner">
          <span>🎭 Guest Mode - Your data is stored locally only.</span>
          <button onClick={logout} className="guest-banner-btn">Sign In to Save</button>
        </div>
      )}
      
      <div className="app-shell">
        <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            🤖 AI Assistant
            {user && <div className="user-badge">{user.username}</div>}
          </div>
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
        
        <div className="sidebar-footer">
          {user ? (
            <button className="logout-btn" onClick={logout}>
              🚪 Logout
            </button>
          ) : (
            <button className="logout-btn" onClick={logout}>
              🔑 Sign In
            </button>
          )}
        </div>
      </aside>
      
        <main className="main-panel">
          <ChatSearch />
        </main>
      </div>
    </div>
  );
}

export default App;