import { useState, useContext } from 'react';
import { reportsApi } from '../../api/reports.api';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function ReportsPage() {
  const { showToast } = useContext(ToastContext);
  const [currentPeriod, setCurrentPeriod] = useState(
    new Date().toISOString().substring(0, 7)
  );
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await reportsApi.downloadCSV(currentPeriod);
      
      // Create a blob from the response and trigger download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition if possible, or fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `SpendSense_${currentPeriod}.csv`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('Export successful', 'success');
    } catch (err) {
      // If the backend returned a 404/Error, the blob will contain the JSON error.
      // We must read the blob to extract the message.
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          showToast(json.message || 'Export failed', 'error');
        } catch {
          showToast('Export failed', 'error');
        }
      } else {
        showToast(err.message || 'Export failed', 'error');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Export your financial data</p>
        </div>
      </div>

      <Card padding="lg" style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>Monthly Export</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
          Download a complete history of your transactions for the selected month in CSV format. 
          Perfect for importing into Excel or sharing with your accountant.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginTop: 'var(--space-4)' }}>
          <input 
            type="month" 
            className="period-selector"
            value={currentPeriod}
            onChange={(e) => setCurrentPeriod(e.target.value)}
          />
          <Button onClick={handleDownload} isLoading={isDownloading}>
            Export to CSV
          </Button>
        </div>
      </Card>
    </div>
  );
}
