import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { ItemCard } from '../components/ItemCard';
import type { Item } from '../components/ItemCard';
import { RatingModal } from '../components/RatingModal';
import { Search, Filter, Loader2, Award, HelpCircle, Link as LinkIcon, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './Dashboard.css';

export function Dashboard() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [ratedItemIds, setRatedItemIds] = useState<Set<string>>(new Set());
  const [commentedItemIds, setCommentedItemIds] = useState<Set<string>>(new Set());
  const [vetoes, setVetoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<string>('Alle');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fetchItems = async () => {
    try {
      const [itemsRes, ratingsRes, vetoesRes] = await Promise.all([
        supabase
          .from('items')
          .select('*')
          .eq('active', true)
          // Highest average first, then most ratings, then newest
          .order('average_rating', { ascending: false, nullsFirst: false })
          .order('ratings_count', { ascending: false })
          .order('created_at', { ascending: false }),
          
        user ? supabase
          .from('ratings')
          .select('item_id, note')
          .eq('user_id', user.id) : null,
          
        supabase
          .from('vetoes')
          .select('*')
      ]);
        
      if (itemsRes.error) throw itemsRes.error;
      setItems(itemsRes.data || []);
      
      if (ratingsRes && !ratingsRes.error) {
        setRatedItemIds(new Set(ratingsRes.data.map((r: any) => r.item_id)));
        setCommentedItemIds(new Set(ratingsRes.data.filter((r: any) => r.note && r.note.trim() !== '').map((r: any) => r.item_id)));
      }
      
      if (vetoesRes && !vetoesRes.error) {
        setVetoes(vetoesRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const rooms = useMemo(() => {
    const roomSet = new Set(items.map(item => item.room || 'Allgemein'));
    return ['Alle', ...Array.from(roomSet).sort()];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesRoom = selectedRoom === 'Alle' || (item.room || 'Allgemein') === selectedRoom;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRoom && matchesSearch;
    });
  }, [items, selectedRoom, searchQuery]);

  const vetoedItemIds = useMemo(() => new Set(vetoes.map(v => v.item_id)), [vetoes]);
  const vetoedItems = items.filter(i => vetoedItemIds.has(i.id));

  // The ratedItems represent all items that have at least one rating (sorted by our API order)
  const ratedItems = items.filter(i => i.average_rating !== null);
  const unratedItems = items.filter(i => !ratedItemIds.has(i.id));

  if (loading) {
    return (
      <div className="dashboard-loader">
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  return (
    <div className="dashboard container">
      <div className="dashboard-header">
        <h1>Deko-Planung</h1>
        <p>Gemeinsam bewerten, gemeinsam entscheiden.</p>
      </div>

      <div className="dashboard-controls" style={{ flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: '1 1 auto', minWidth: '300px' }}>
          <div className="search-box" style={{ flex: 1 }}>
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Gegenstand suchen..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-box">
            <Filter className="filter-icon" size={20} />
            <select value={selectedRoom} onChange={e => setSelectedRoom(e.target.value)}>
              {rooms.map(room => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          className="btn-secondary" 
          onClick={() => setShowImport(!showImport)}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={18} /> Wunschliste Importieren
        </button>
      </div>

      {showImport && (
        <div className="import-section" style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LinkIcon size={20} className="text-accent" />
            Amazon Lister Importieren
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Füge den Link zu einer öffentlichen Amazon-Wunschliste ein, um alle Gegenstände automatisch in die Dekoapp zu übertragen.
          </p>
          <form 
            style={{ display: 'flex', gap: '1rem' }}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!importUrl) return;
              setImporting(true);
              try {
                const { data, error } = await supabase.functions.invoke('amazon-scraper', {
                  body: { wishlistUrl: importUrl }
                });
                
                if (error) {
                    let errMsg = error.message;
                    if (error.context && typeof error.context.json === 'function') {
                        try {
                            const errData = await error.context.json();
                            if (errData && errData.error) {
                                errMsg = errData.error;
                            }
                        } catch (e) {}
                    }
                    throw new Error(errMsg);
                }
                
                alert(data?.message || 'Erfolgreich importiert!');
                setImportUrl('');
                setShowImport(false);
                fetchItems();
              } catch (err: any) {
                console.error(err);
                alert(`Import fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
              } finally {
                setImporting(false);
              }
            }}
          >
            <input 
              type="url" 
              placeholder="https://www.amazon.de/hz/wishlist/ls/..." 
              value={importUrl}
              onChange={e => setImportUrl(e.target.value)}
              style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              required
            />
            <button type="submit" className="btn-primary" disabled={importing || !importUrl}>
              {importing ? 'Importiere...' : 'Import Starten'}
            </button>
          </form>
        </div>
      )}

      {searchQuery === '' && selectedRoom === 'Alle' && ratedItems.length > 0 && (
        <section className="dashboard-section highlight-section">
          <div className="section-title">
            <Award className="section-icon text-warning" size={24} />
            <h2>Alle bewerteten Gegenstände</h2>
            <span className="badge">{ratedItems.length}</span>
          </div>
          <div className="horizontal-scroll-container">
            {ratedItems.map((item, index) => (
              <ItemCard 
                key={item.id} 
                item={item} 
                onClick={setSelectedItem} 
                isVetoed={vetoedItemIds.has(item.id)}
                rank={index + 1}
                userHasRated={ratedItemIds.has(item.id)}
                userHasCommented={commentedItemIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {searchQuery === '' && selectedRoom === 'Alle' && vetoedItems.length > 0 && (
        <section className="dashboard-section highlight-section" style={{ borderColor: 'var(--danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
          <div className="section-title">
            <span style={{ fontSize: '1.5rem' }}>🛑</span>
            <h2 style={{ color: 'var(--danger)' }}>Auf gar keinen Fall</h2>
            <span className="badge badge-status-verworfen">{vetoedItems.length}</span>
          </div>
          <div className="horizontal-scroll-container">
            {vetoedItems.map((item) => (
              <ItemCard 
                key={`veto-${item.id}`} 
                item={item} 
                onClick={setSelectedItem} 
                isVetoed={true}
                userHasRated={ratedItemIds.has(item.id)}
                userHasCommented={commentedItemIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {searchQuery === '' && selectedRoom === 'Alle' && unratedItems.length > 0 && (
        <section className="dashboard-section">
          <div className="section-title">
            <HelpCircle className="section-icon text-accent" size={24} />
            <h2>Nicht bewertet</h2>
            <span className="badge">{unratedItems.length}</span>
          </div>
          <div className="items-grid new-items-grid">
            {unratedItems.map(item => (
              <ItemCard 
                key={`unrated-${item.id}`} 
                item={item} 
                onClick={setSelectedItem} 
                isVetoed={vetoedItemIds.has(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div className="section-title">
          <h2>{searchQuery || selectedRoom !== 'Alle' ? 'Suchergebnisse' : 'Alle Gegenstände'}</h2>
          <span className="badge">{filteredItems.length}</span>
        </div>
        
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛋️</div>
            <h3>Keine Gegenstände gefunden</h3>
            <p>Versuche einen anderen Suchbegriff oder Filter.</p>
          </div>
        ) : (
          <div className="items-grid all-items-grid">
            {filteredItems.map((item) => {
              const rankIdx = ratedItems.findIndex(r => r.id === item.id);
              const rank = rankIdx >= 0 ? rankIdx + 1 : undefined;
              return (
                <ItemCard 
                  key={item.id} 
                  item={item} 
                  onClick={setSelectedItem}
                  isVetoed={vetoedItemIds.has(item.id)}
                  rank={rank}
                  userHasRated={ratedItemIds.has(item.id)}
                  userHasCommented={commentedItemIds.has(item.id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {selectedItem && (
        <RatingModal 
          item={selectedItem} 
          minTotalItems={items.length}
          onClose={() => setSelectedItem(null)} 
          onRatingSubmitted={() => {
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
