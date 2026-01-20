import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { useDropzone } from 'react-dropzone';

const PublicShare = () => {
  const { id } = useParams();
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [shareName, setShareName] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const verifyPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/shares/verify', { shareId: id, password });
      setToken(res.data.token);
      setShareName(res.data.shareName);
      setError('');
    } catch (err) {
      setError('Invalid Password or Expired Share');
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await api.get('/files', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch files');
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await api.delete(`/files/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchFiles();
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token]);

  const onDrop = async (acceptedFiles) => {
    setUploading(true);
    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      alert('Upload Successful!');
      fetchFiles(); // Refresh list
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] }
  });

  if (!token) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '16px' }}>Access Shared Folder</h2>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
          <form onSubmit={verifyPassword}>
            <div style={{ marginBottom: '24px' }}>
              <input
                type="password"
                placeholder="Enter Password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Access</button>
          </form>
        </div>
      </div>
    );
  }



  const toggleSelect = (fileId) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedFiles(new Set(files.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedFiles.size} selected files?`)) return;
    try {
      // Parallel deletes
      await Promise.all(
        Array.from(selectedFiles).map(id =>
          api.delete(`/files/${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
        )
      );
      setSelectedFiles(new Set());
      fetchFiles();
    } catch (err) {
      alert('Failed to delete some files');
    }
  };

  return (
    <div className="container" style={{ paddingTop: '60px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>{shareName}</h1>

      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', cursor: 'pointer', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--glass-border)', marginBottom: '40px' }} {...getRootProps()}>
        <input {...getInputProps()} />
        {
          isDragActive ?
            <p style={{ fontSize: '1.2rem' }}>Drop the files here ...</p> :
            <div>
              <p style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Drag & drop images here, or click to select</p>
              <button className="btn-primary">Select Images</button>
            </div>
        }
        {uploading && <p style={{ marginTop: '20px', color: 'var(--primary-color)' }}>Uploading...</p>}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>Files in this Folder</h3>
          {files.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  checked={selectedFiles.size === files.length}
                  onChange={handleSelectAll}
                />
                Select All
              </label>
              {selectedFiles.size > 0 && (
                <button
                  onClick={deleteSelected}
                  className="btn-secondary"
                  style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '4px 12px' }}
                >
                  Delete Selected ({selectedFiles.size})
                </button>
              )}
            </div>
          )}
        </div>

        {files.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No files yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px', marginTop: '16px' }}>
            {files.map(file => (
              <div
                key={file.id}
                className="glass-panel"
                style={{
                  padding: '0',
                  textAlign: 'center',
                  background: selectedFiles.has(file.id) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: selectedFiles.has(file.id) ? '1px solid var(--primary-color)' : '1px solid transparent'
                }}
                onClick={() => toggleSelect(file.id)}
              >
                <div style={{ width: '100%', height: '150px', backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <img
                    src={`http://localhost:3000/api/files/${file.id}/preview?token=${token}`}
                    alt={file.originalName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.onerror = null; e.target.src = 'placeholder.png'; e.target.parentNode.innerHTML = '<span>📄</span>'; }}
                  />
                </div>
                <div style={{ padding: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }} title={file.originalName}>{file.originalName}</div>

                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    transform: 'scale(1.5)',
                    cursor: 'pointer',
                    zIndex: 10
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicShare;
