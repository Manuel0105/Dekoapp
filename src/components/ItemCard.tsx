import { Star, ExternalLink } from 'lucide-react';
import './ItemCard.css';

export interface Item {
  id: string;
  external_id: string;
  title: string;
  image_url: string;
  product_url: string;
  price: number;
  room: string;
  purchase_status: string;
  is_new: boolean;
  average_rating: number | null;
  ratings_count: number;
}

interface ItemCardProps {
  item: Item;
  onClick: (item: Item) => void;
  isTopPick?: boolean;
}

export function ItemCard({ item, onClick, isTopPick }: ItemCardProps) {
  const displayRating = item.average_rating !== null ? Number(item.average_rating).toFixed(1) : '-';

  return (
    <div className={`item-card ${isTopPick ? 'top-pick' : ''}`} onClick={() => onClick(item)}>
      <div className="card-image-wrapper">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="card-image" loading="lazy" />
        ) : (
          <div className="card-image-placeholder">Kein Bild</div>
        )}
        
        <div className="card-badges">
          {item.is_new && <span className="badge badge-new">Neu</span>}
          {item.ratings_count === 0 && <span className="badge badge-unrated">Unbewertet</span>}
          {item.purchase_status !== 'geplant' && (
             <span className={`badge badge-status-${item.purchase_status}`}>
               {item.purchase_status}
             </span>
          )}
        </div>
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <span className="card-room">{item.room || 'Allgemein'}</span>
          {item.price && <span className="card-price">{item.price} €</span>}
        </div>
        
        <h3 className="card-title" title={item.title}>
          {item.title}
        </h3>
        
        <div className="card-footer">
          <div className="card-rating">
            <Star className={`rating-icon ${item.average_rating !== null ? 'filled' : ''}`} size={18} />
            <span className="rating-value">{displayRating}</span>
            <span className="rating-count">({item.ratings_count})</span>
          </div>
          
          <button 
            className="card-link" 
            onClick={(e) => {
              e.stopPropagation();
              if (item.product_url) window.open(item.product_url, '_blank');
            }}
            title="Auf Amazon ansehen"
            disabled={!item.product_url}
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
