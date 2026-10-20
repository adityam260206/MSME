import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

const PREDEFINED_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function AccountFormModal({ isOpen, onClose, onSubmit, initialData = null }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    initialBalance: '',
    color: '#3b82f6'
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          type: initialData.type,
          initialBalance: initialData.initialBalance || 0,
          color: initialData.color || '#3b82f6'
        });
      } else {
        setFormData({
          name: '',
          type: 'bank',
          initialBalance: '',
          color: '#3b82f6'
        });
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      initialBalance: parseFloat(formData.initialBalance || 0)
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? 'Edit Account' : 'New Account'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <Input
          label="Account Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g. Chase Checking, Emergency Fund"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Account Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="bank">Bank / Checking</option>
            <option value="savings">Savings</option>
            <option value="credit">Credit Card</option>
            <option value="cash">Cash Wallet</option>
          </Select>
          <Input
            label={initialData ? "Initial Balance (Disabled)" : "Initial Balance"}
            name="initialBalance"
            type="number"
            step="0.01"
            value={formData.initialBalance}
            onChange={handleChange}
            disabled={!!initialData}
            placeholder="0.00"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Theme Color</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {PREDEFINED_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: formData.color === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0
                }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
