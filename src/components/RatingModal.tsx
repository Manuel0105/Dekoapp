import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Item } from './ItemCard';
import { useAuth } from '../contexts/AuthContext';
import { Star, X } from 'lucide-react';
import './RatingModal.css';

interface RatingModalProps {
  item: Item;
  minTotalItems: number;
  onClose: () => void;
  onRatingSubmitted: () => void;
}

export function RatingModal({ item, minTotalItems, onClose, onRatingSubmitted }: RatingModalProps) {
  const { session, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const canEditStatus = isAdmin || profile?.can_edit_status;
  const canEditRoom = isAdmin || profile?.can_edit_room;
  const canViewRatings = isAdmin || profile?.can_view_ratings;

  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [allRatings, setAllRatings] = useState<any[]>([]);
  
  const [allVetoes, setAllVetoes] = useState<any[]>([]);
  const [totalUserVetoes, setTotalUserVetoes] = useState<number>(0);
  const [myVeto, setMyVeto] = useState<boolean>(false);
  
  const [editedStatus, setEditedStatus] = useState(item.purchase_status || 'geplant');
  const [editedRoom, setEditedRoom] = useState(item.room || '');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const itemModified = editedStatus !== item.purchase_status || editedRoom !== (item.room || '');

  useEffect(() => {
    // Fetch user's existing rating
    const sourceRef = async () => {
      if (!session) return;
      try {
        if (canViewRatings) {
          const [ratingsRes, vetoesRes, userVetoesRes] = await Promise.all([
             supabase
              .from('ratings')
              .select(`value, note, user_id, profiles (display_name)`)
              .eq('item_id', item.id),
              
             supabase
              .from('vetoes')
              .select(`user_id, profiles (display_name)`)
              .eq('item_id', item.id),
              
             supabase
              .from('vetoes')
              .select('id', { count: 'exact' })
              .eq('user_id', session.user.id)
          ]);
            
          if (ratingsRes.error) throw ratingsRes.error;
          
          if (ratingsRes.data) {
            setAllRatings(ratingsRes.data);
            const myRating = ratingsRes.data.find(r => r.user_id === session.user.id);
            if (myRating) {
              setRating(myRating.value);
              setNote(myRating.note || '');
            }
          }
          
          if (vetoesRes.data) {
             setAllVetoes(vetoesRes.data);
             setMyVeto(vetoesRes.data.some((v: any) => v.user_id === session.user.id));
          }
          if (userVetoesRes.count !== null) {
              setTotalUserVetoes(userVetoesRes.count);
          }
        } else {
          const { data } = await supabase
            .from('ratings')
            .select('value, note')
            .eq('item_id', item.id)
            .eq('user_id', session.user.id)
            .single();
            
          if (data) {
            setRating(data.value);
            setNote(data.note || '');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    sourceRef();
  }, [item.id, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    
    setLoading(true);
    try {
      if (itemModified) {
        const updates: any = {};
        if (canEditStatus) updates.purchase_status = editedStatus;
        if (canEditRoom) updates.room = editedRoom;
        
        if (Object.keys(updates).length > 0) {
          const { error: itemError } = await supabase.from('items').update(updates).eq('id', item.id);
          if (itemError) throw itemError;
        }
      }

      if (rating !== null) {
        const { error: ratingError } = await supabase
          .from('ratings')
          .upsert({
            item_id: item.id,
            user_id: session.user.id,
            value: rating,
            note: note
          }, { onConflict: 'item_id,user_id' });
          
        if (ratingError) throw ratingError;
      }
      
      onRatingSubmitted();
      onClose();
    } catch (err) {
      console.error('Error submitting:', err);
      alert('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVeto = async () => {
      if (!session) return;
      if (loading) return;
      
      const maxAllowed = Math.ceil(minTotalItems * 0.03);
      if (!myVeto && totalUserVetoes >= maxAllowed) {
          alert(`Du hast dein Maximum von ${maxAllowed} Vetos bereits aufgebraucht!`);
          return;
      }
      
      setLoading(true);
      try {
          if (myVeto) {
             const { error } = await supabase.from('vetoes')
                 .delete()
                 .match({ item_id: item.id, user_id: session.user.id });
             if (error) throw error;
             setMyVeto(false);
             setTotalUserVetoes(prev => prev - 1);
          } else {
             const { error } = await supabase.from('vetoes')
                 .insert({ item_id: item.id, user_id: session.user.id });
             if (error) throw error;
             setMyVeto(true);
             setTotalUserVetoes(prev => prev + 1);
          }
          onRatingSubmitted();
          onClose();
      } catch (err) {
          console.error(err);
          alert('Fehler beim Veto speichern');
      } finally {
          setLoading(false);
      }
  };

  const maxVetoesAllowed = Math.ceil(minTotalItems * 0.03);
  const remainingVetoes = Math.max(0, maxVetoesAllowed - totalUserVetoes);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="modal-header">
          <h2>Bewerten & Bearbeiten</h2>
          <p className="modal-subtitle">{item.title}</p>
        </div>
        
        {fetching ? (
          <div className="modal-body-loading">Lädt...</div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="rating-selector">
              <p>Wie gut gefällt dir das?</p>
              <div className="stars-container">
                {[...Array(16)].map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`star-btn ${rating !== null && rating >= i ? 'active' : ''} ${hoveredRating !== null && hoveredRating >= i ? 'hovered' : ''}`}
                    onClick={() => setRating(i)}
                    onMouseEnter={() => setHoveredRating(i)}
                    onMouseLeave={() => setHoveredRating(null)}
                    title={`${i} Punkte`}
                  >
                    <Star size={24} fill={(rating !== null && rating >= i) || (hoveredRating !== null && hoveredRating >= i) ? "currentColor" : "none"} />
                    <span className="star-number">{i}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="input-group">
              <label htmlFor="note">Notiz (Optional)</label>
              <textarea
                id="note"
                rows={3}
                placeholder="Was denkst du darüber?"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            
            <div style={{ margin: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger)' }}>
                <div>
                   <h4 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🛑 Auf gar keinen Fall!
                   </h4>
                   <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Veto-Kontingent: {remainingVetoes} von {maxVetoesAllowed} übrig
                   </p>
                </div>
                <button 
                  type="button" 
                  className={`btn-primary ${myVeto ? '' : 'btn-outline'}`}
                  style={{ 
                      borderColor: 'var(--danger)', 
                      backgroundColor: myVeto ? 'var(--danger)' : 'transparent',
                      color: myVeto ? 'white' : 'var(--danger)'
                  }}
                  onClick={handleToggleVeto}
                  disabled={loading || (!myVeto && remainingVetoes <= 0)}
                >
                  {myVeto ? 'Veto zurücknehmen' : 'Veto einlegen'}
                </button>
            </div>
            
            {(canEditStatus || canEditRoom) && (
              <div className="admin-edit-group" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                {canEditStatus && (
                  <div className="input-group" style={{ margin: 0, flex: 1 }}>
                    <label htmlFor="edit-status">Kaufstatus</label>
                    <select 
                      id="edit-status" 
                      value={editedStatus} 
                      onChange={e => setEditedStatus(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="geplant">Geplant</option>
                      <option value="bestellt">Bestellt</option>
                      <option value="gekauft">Gekauft</option>
                      <option value="verworfen">Verworfen</option>
                    </select>
                  </div>
                )}
                
                {canEditRoom && (
                  <div className="input-group" style={{ margin: 0, flex: 1 }}>
                    <label htmlFor="edit-room">Raum</label>
                    <select 
                      id="edit-room"
                      value={editedRoom} 
                      onChange={e => setEditedRoom(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
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
                  </div>
                )}
              </div>
            )}

            {canViewRatings && (allRatings.length > 0 || allVetoes.length > 0) && (
              <div className="all-ratings-section" style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <h3>Alle Bewertungen & Vetoes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {allVetoes.map((v, i) => (
                      <div key={`veto-${i}`} style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--danger)' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{v.profiles?.display_name || 'WG Mitglied'}</strong>
                            <span style={{ color: 'var(--danger)', fontWeight: 'bold' }}>hat Veto eingelegt 🛑</span>
                         </div>
                      </div>
                  ))}
                  {allRatings.map((r, i) => (
                     <div key={i} style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <strong>{r.profiles?.display_name || 'WG Mitglied'}</strong>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}>
                            <Star size={16} fill="currentColor" /> {r.value}/15
                          </span>
                       </div>
                       {r.note && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>"{r.note}"</p>}
                     </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Abbrechen
              </button>
              <button type="submit" className="btn-primary" disabled={loading || (rating === null && !itemModified)}>
                {loading ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
