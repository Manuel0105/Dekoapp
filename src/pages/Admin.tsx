import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Profile } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Users, RefreshCw, Box, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import './Admin.css';
import type { Item } from '../components/ItemCard';

export function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'items' | 'sync'>('items');
  const [users, setUsers] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [syncMeta, setSyncMeta] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  if (profile?.role !== 'admin') {
    return <Navigate to="/" />;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setUsers(data || []);
      } else if (activeTab === 'items') {
        const { data } = await supabase.from('items').select('*').order('created_at', { ascending: false });
        setItems(data || []);
      } else if (activeTab === 'sync') {
        const { data } = await supabase.from('sync_meta').select('*').order('last_sync_at', { ascending: false }).limit(20);
        setSyncMeta(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUpdateRoom = async (id: string, newRoom: string) => {
    const { error } = await supabase.from('items').update({ room: newRoom }).eq('id', id);
    if (!error) {
      setItems(items.map(i => i.id === id ? { ...i, room: newRoom } : i));
    }
  };

  const handleUpdatePermission = async (id: string, field: 'can_edit_status' | 'can_edit_room' | 'can_view_ratings', value: boolean) => {
    const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', id);
    if (!error) {
      setUsers(users.map(u => u.id === id ? { ...u, [field]: value } : u));
    } else {
      console.error('Failed to update permission:', error);
    }
  };

  const manualSync = async () => {
    // In a real app this might call a serverless function endpoint
    // For now we simulate that the sync service will pick it up or we just show a demo toast
    alert('Manuelles Sync-Signal gesendet! (Simuliert. Der echte Sync läuft über GitHub Actions oder Node.js)');
  };

  return (
    <div className="admin-container container">
      <div className="admin-header">
        <h1>Admin Control Panel</h1>
        <p>Verwalte Daten, Nutzer und Import-Routinen.</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeTab === 'items' ? 'active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          <Box size={18} /> Gegenstände
        </button>
        <button 
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> Nutzer
        </button>
        <button 
          className={`admin-tab ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          <Database size={18} /> Sync & System
        </button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="loading-state">Lade Daten...</div>
        ) : (
          <>
            {activeTab === 'items' && (
              <div className="admin-panel">
                <div className="panel-header">
                  <h2>Gegenstands-Verwaltung</h2>
                  <span>{items.length} gesamt</span>
                </div>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Titel</th>
                        <th>Raum</th>
                        <th>Status</th>
                        <th>Bilder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id}>
                          <td className="item-title-cell">{item.title}</td>
                          <td>
                            <select 
                              value={item.room || 'Allgemein'}
                              onChange={(e) => handleUpdateRoom(item.id, e.target.value)}
                              className="room-input"
                            >
                              <option value="Allgemein">Allgemein</option>
                              <option value="Küche">Küche</option>
                              <option value="Wohnzimmer">Wohnzimmer</option>
                              <option value="Kaffeebar">Kaffeebar</option>
                              <option value="Garten">Garten</option>
                              <option value="WC/Bad">WC/Bad</option>
                              <option value="Deko">Deko</option>
                              <option value="Flur">Flur</option>
                            </select>
                          </td>
                          <td>
                            <span className={`status-badge ${item.is_new ? 'new' : ''}`}>
                              {item.is_new ? 'Neu' : 'Aktiv'}
                            </span>
                          </td>
                          <td>{item.image_url ? 'Ja' : 'Nein'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="admin-panel">
                <div className="panel-header">
                  <h2>Registrierte Nutzer</h2>
                </div>
                <div className="table-responsive">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Rolle</th>
                        <th>Status-Recht</th>
                        <th>Raum-Recht</th>
                        <th>Sicht-Recht</th>
                        <th>Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td><strong>{user.display_name}</strong> (@{user.username})</td>
                          <td>
                            <span className={`role-badge ${user.role}`}>
                              {user.role}
                            </span>
                          </td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={!!user.can_edit_status} 
                              onChange={(e) => handleUpdatePermission(user.id, 'can_edit_status', e.target.checked)}
                              disabled={user.role === 'admin'}
                              title={user.role === 'admin' ? "Admins haben dieses Recht automatisch" : "Erlaubt diesem Nutzer den Kaufstatus zu ändern"}
                            />
                          </td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={!!user.can_edit_room} 
                              onChange={(e) => handleUpdatePermission(user.id, 'can_edit_room', e.target.checked)}
                              disabled={user.role === 'admin'}
                              title={user.role === 'admin' ? "Admins haben dieses Recht automatisch" : "Erlaubt diesem Nutzer den Raum zu ändern"}
                            />
                          </td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={!!user.can_view_ratings} 
                              onChange={(e) => handleUpdatePermission(user.id, 'can_view_ratings', e.target.checked)}
                              disabled={user.role === 'admin'}
                              title={user.role === 'admin' ? "Admins sehen alles automatisch" : "Erlaubt Nutzer, alle WG-Bewertungen zu sehen"}
                            />
                          </td>
                          <td>{new Date(user.created_at || '').toLocaleDateString('de-DE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'sync' && (
              <div className="admin-panel">
                <div className="panel-header">
                  <h2>System Synchronisation</h2>
                  <button className="btn-primary" onClick={manualSync}>
                    <RefreshCw size={16} /> Sync jetzt starten
                  </button>
                </div>
                
                <div className="sync-history">
                  <h3>Letzte Läufe</h3>
                  {syncMeta.length === 0 ? (
                    <p className="no-data">Noch keine Sync-Logs vorhanden.</p>
                  ) : (
                    <div className="sync-cards">
                      {syncMeta.map(sync => (
                        <div key={sync.id} className="sync-card">
                          <div className="sync-card-header">
                            {sync.last_status === 'success' ? (
                              <CheckCircle className="text-success" size={20} />
                            ) : (
                              <AlertTriangle className="text-danger" size={20} />
                            )}
                            <span className="sync-time">
                              {new Date(sync.last_sync_at).toLocaleString('de-DE')}
                            </span>
                          </div>
                          <div className="sync-details">
                            <p><strong>Status:</strong> {sync.last_status}</p>
                            <p><strong>Importiert:</strong> {sync.items_imported} Items</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
