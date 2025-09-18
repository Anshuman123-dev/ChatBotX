import React, { useState, useRef } from "react";
import { uploadRag, queryRag } from "./api";

export default function RagUploader({ onUploadSuccess }) {
  const [files, setFiles] = useState([]);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('chat_active_session') || 'default');
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [answer, setAnswer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef(null);

  async function uploadFiles() {
    if (files.length === 0) {
      setUploadStatus("⚠️ Please select PDF files first");
      return;
    }

    setUploading(true);
    setUploadStatus("📤 Uploading and indexing files...");
    
    try {
      const resp = await uploadRag(sessionId, files);
      if (resp.status === "ok") {
        setUploadStatus(`✅ Successfully uploaded and indexed ${files.length} PDF file(s)!`);
        // Clear files and close modal after successful upload
        setTimeout(() => {
          setFiles([]);
          setUploadStatus("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          // Call the success callback to close modal and add message to chat
          if (onUploadSuccess) {
            onUploadSuccess(files.length);
          }
        }, 1500);
      } else {
        setUploadStatus("❌ Upload failed. Please try again.");
      }
    } catch (error) {
      setUploadStatus(`❌ Upload error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function askQuestion() {
    if (!question.trim()) return;
    
    setQuerying(true);
    try {
      const resp = await queryRag(sessionId, question);
      setAnswer(resp.answer);
      setChatHistory(resp.chat_history || []);
    } catch (error) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setQuerying(false);
    }
  }

  function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setUploadStatus("");
  }

  function removeFile(index) {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Update file input
    const dt = new DataTransfer();
    newFiles.forEach(file => dt.items.add(file));
    fileInputRef.current.files = dt.files;
  }

  function clearFiles() {
    setFiles([]);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div style={{padding: '1rem'}}>
      {/* Session ID Display */}
      <div style={{marginBottom: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'}}>
        <div style={{fontWeight: '600', color: '#333', marginBottom: '0.25rem'}}>Session ID</div>
        <div style={{fontSize: '0.9rem', color: '#666'}}>{sessionId}</div>
      </div>

      {/* File Upload Section */}
      <div style={{marginBottom: '1rem'}}>
        <div style={{fontWeight: '600', color: '#333', marginBottom: '0.5rem'}}>Upload PDF Files</div>
        
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            style={{display: 'none'}}
            id="pdf-upload"
          />
          <label 
            htmlFor="pdf-upload" 
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1rem', 
              background: 'white', 
              border: '2px dashed #4f46e5', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: '500', 
              color: '#4f46e5',
              transition: 'all 0.3s ease'
            }}
          >
            <span>📎</span>
            Choose PDF Files
          </label>
          
          <button
            onClick={uploadFiles}
            disabled={uploading || files.length === 0}
            style={{
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              padding: '0.75rem 1rem', 
              background: files.length > 0 ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#ccc', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: files.length > 0 ? 'pointer' : 'not-allowed', 
              fontWeight: '500',
              transition: 'all 0.3s ease'
            }}
          >
            {uploading ? (
              <>
                <span style={{width: '16px', height: '16px', border: '2px solid transparent', borderTop: '2px solid currentColor', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></span>
                Uploading...
              </>
            ) : (
              <>
                <span>☁️</span>
                Upload & Index
              </>
            )}
          </button>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div style={{marginTop: '0.75rem', border: '1px solid #e9ecef', borderRadius: '8px', background: 'white', overflow: 'hidden'}}>
            <div style={{padding: '0.75rem', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontWeight: '600', color: '#333'}}>
              Selected Files ({files.length})
            </div>
            {files.map((file, index) => (
              <div key={index} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid #f8f9fa'}}>
                <div>
                  <div style={{fontWeight: '500', color: '#333'}}>📄 {file.name}</div>
                  <div style={{fontSize: '0.85rem', color: '#666'}}>{formatFileSize(file.size)}</div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  style={{background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: '0.25rem', borderRadius: '4px'}}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus && (
          <div style={{
            marginTop: '0.75rem', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            fontWeight: '500',
            background: uploadStatus.includes('✅') ? 'rgba(40, 167, 69, 0.1)' : uploadStatus.includes('❌') ? 'rgba(220, 53, 69, 0.1)' : 'rgba(102, 126, 234, 0.1)',
            color: uploadStatus.includes('✅') ? '#28a745' : uploadStatus.includes('❌') ? '#dc3545' : '#4f46e5',
            border: uploadStatus.includes('✅') ? '1px solid rgba(40, 167, 69, 0.2)' : uploadStatus.includes('❌') ? '1px solid rgba(220, 53, 69, 0.2)' : '1px solid rgba(102, 126, 234, 0.2)'
          }}>
            {uploadStatus}
          </div>
        )}
      </div>
    </div>
  );
}