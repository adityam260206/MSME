import './Table.css';

/**
 * A highly reusable Table component.
 * 
 * @param {Object} props
 * @param {Array} props.columns - [{ key, header, render(item), width }]
 * @param {Array} props.data - Array of data objects
 * @param {boolean} [props.isLoading=false]
 * @param {ReactNode} [props.emptyState]
 */
export default function Table({ columns, data, isLoading, emptyState }) {
  if (!isLoading && (!data || data.length === 0)) {
    return emptyState || <div className="table-empty">No data available</div>;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th 
                key={col.key || index} 
                style={{ width: col.width }}
                className={col.align ? `text-${col.align}` : ''}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={isLoading ? 'table-loading' : ''}>
          {data?.map((row, rowIndex) => (
            <tr key={row._id || rowIndex} className="animate-fade-in" style={{ animationDelay: `${rowIndex * 0.05}s` }}>
              {columns.map((col, colIndex) => (
                <td 
                  key={col.key || colIndex}
                  className={col.align ? `text-${col.align}` : ''}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
