import './Skeleton.css';

/**
 * Skeleton loader component for perceived performance.
 * 
 * @param {Object} props
 * @param {'text' | 'circular' | 'rectangular'} [props.variant='text']
 * @param {string|number} [props.width='100%']
 * @param {string|number} [props.height]
 * @param {string} [props.className='']
 */
export default function Skeleton({ 
  variant = 'text', 
  width = '100%', 
  height, 
  className = '' 
}) {
  const style = {
    width,
    height: height || (variant === 'text' ? '1em' : 'auto')
  };

  return (
    <div 
      className={`skeleton skeleton-${variant} ${className}`} 
      style={style}
      aria-hidden="true"
    />
  );
}
