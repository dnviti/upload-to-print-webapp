import React, { useEffect, useState } from 'react';
import api from '../api';

const AdminDashboard = () => {
  const [shares, setShares] = useState([]);
  const [newShareName, setNewShareName] = useState('');
  const [newSharePassword, setNewSharePassword] = useState('');
  const [selectedShare, setSelectedShare] = useState(null);
  const [shareFiles, setShareFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState(new Set());

  const fetchShares = async () => {
    try {
      const res = await api.get('/shares');
      setShares(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchShares();
  }, []);

  const deleteShare = async (shareId) => {
    if (!confirm('Are you sure you want to delete this folder? ALL FILES WILL BE LOST.')) return;
    try {
      await api.delete(`/shares/${shareId}`);
      fetchShares();
    } catch (error) {
      alert('Failed to delete share');
    }
  };

  const createShare = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shares', { name: newShareName, password: newSharePassword });
      setNewShareName('');
      setNewSharePassword('');
      fetchShares();
    } catch (error) {
      alert('Failed to create share');
    }
  };

  const viewShare = async (shareId) => {
    try {
      const res = await api.get(`/shares/${shareId}/admin`);
      setSelectedShare(res.data);
      setShareFiles(res.data.files);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setShareFiles(shareFiles.filter(f => f.id !== fileId));
    } catch (error) {
      alert('Failed to delete file');
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/s/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

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
      setSelectedFiles(new Set(shareFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selectedFiles.size} selected files?`)) return;
    try {
      await Promise.all(
        Array.from(selectedFiles).map(id => api.delete(`/files/${id}`))
      );
      setShareFiles(shareFiles.filter(f => !selectedFiles.has(f.id)));
      setSelectedFiles(new Set());
    } catch (err) {
      alert('Failed to delete some files');
    }
  };

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingTop: '20px' }}>
        <h1>Admin Dashboard</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Create New Share</h3>
          <form onSubmit={createShare}>
            <div style={{ marginBottom: '16px' }}>
              <input
                placeholder="Folder Name"
                className="glass-input"
                value={newShareName}
                onChange={(e) => setNewShareName(e.target.value)}
                required
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <input
                placeholder="Password"
                className="glass-input"
                value={newSharePassword}
                onChange={(e) => setNewSharePassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Create Share</button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3>Active Shares</h3>
          {shares.map(share => (
            <div key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--glass-border)' }}>
              <div>
                <strong>{share.name}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Created: {new Date(share.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => copyLink(share.id)}>Link</button>
                <button className="btn-primary" onClick={() => viewShare(share.id)}>View</button>
                <button className="btn-secondary" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => deleteShare(share.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedShare && (
        <div className="glass-panel" style={{ marginTop: '40px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>{selectedShare.name} - Files</h2>
            <button className="btn-secondary" onClick={() => { setSelectedShare(null); setSelectedFiles(new Set()); }}>Close</button>
          </div>

          {shareFiles.length > 0 && (
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                  checked={shareFiles.length > 0 && selectedFiles.size === shareFiles.length}
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

          {shareFiles.length === 0 ? (
            <p>No files uploaded yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
              {shareFiles.map(file => (
                <div
                  key={file.id}
                  className="glass-panel"
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: selectedFiles.has(file.id) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                    border: selectedFiles.has(file.id) ? '1px solid var(--primary-color)' : '1px solid transparent',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSelect(file.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      transform: 'scale(1.5)',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ marginBottom: '8px', fontSize: '2rem' }}>📄</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }} title={file.originalName}>{file.originalName}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); downloadFile(file.id, file.originalName); }}>Download</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
