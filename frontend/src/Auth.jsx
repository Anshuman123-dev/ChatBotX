import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { registerUser, loginUser } from './api';
import { 
  Mail, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Search, 
  FileText, 
  MessageSquare, 
  Cloud,
  Bot
} from 'lucide-react';
import './Auth.css';

function Auth() {
  const { login, register, continueAsGuest } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (formData.password.length < 6) throw new Error('Password must be at least 6 characters');
        const response = await registerUser(formData.email, formData.username, formData.password);
        register(response.user, response.access_token);
      } else {
        const response = await loginUser(formData.email, formData.password);
        login(response.user, response.access_token);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side - Login Form */}
      <div className="auth-left">
        <div className="auth-background-blobs">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="auth-subtitle">
              {isSignUp 
                ? 'Join us to save your chat history' 
                : 'Enter your credentials to access your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            {isSignUp && (
              <div className="input-group">
                <label htmlFor="username">Username</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={20} />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="johndoe"
                    required
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="auth-button primary"
              disabled={loading}
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button 
            onClick={continueAsGuest} 
            className="auth-button guest"
            disabled={loading}
          >
            Continue as Guest
          </button>

          <div className="auth-footer">
            <p>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="toggle-link"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - App Info */}
      <div className="auth-right">
        <div className="app-info">
          <div className="brand-badge">
            <Bot size={32} />
            <span>AI Assistant</span>
          </div>
          
          <h2 className="info-title">Your Intelligent<br />Companion</h2>
          <p className="info-description">
            Experience the next generation of AI conversation with real-time web search and document analysis.
          </p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-box blue">
                <Search size={24} />
              </div>
              <div className="feature-text">
                <h3>Web Search</h3>
                <p>Real-time internet access</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box purple">
                <FileText size={24} />
              </div>
              <div className="feature-text">
                <h3>PDF Analysis</h3>
                <p>Chat with your documents</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box pink">
                <MessageSquare size={24} />
              </div>
              <div className="feature-text">
                <h3>Smart Chat</h3>
                <p>Context-aware reasoning</p>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-box indigo">
                <Cloud size={24} />
              </div>
              <div className="feature-text">
                <h3>Cloud Sync</h3>
                <p>Access anywhere</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;