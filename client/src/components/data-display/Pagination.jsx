import Button from '../ui/Button';
import './Pagination.css';

/**
 * Pagination controls component.
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  hasNextPage, 
  hasPrevPage, 
  onNext, 
  onPrev 
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <div className="pagination-info">
        Page {currentPage} of {totalPages}
      </div>
      
      <div className="pagination-controls">
        <Button 
          variant="secondary" 
          size="sm" 
          disabled={!hasPrevPage} 
          onClick={onPrev}
        >
          Previous
        </Button>
        <Button 
          variant="secondary" 
          size="sm" 
          disabled={!hasNextPage} 
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
