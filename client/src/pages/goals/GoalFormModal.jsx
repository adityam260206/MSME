import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function GoalFormModal({ isOpen, onClose, onSubmit, initialData = null, accounts = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    targetAmount: '',
    currentAmount: '',
    deadline: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'active',
    linkedAccountId: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title,
          targetAmount: initialData.targetAmount,
          currentAmount: initialData.currentAmount,
          deadline: new Date(initialData.deadline).toISOString().split('T')[0],
          priority: initialData.priority,
          status: initialData.status,
          linkedAccountId: initialData.linkedAccountId?._id || initialData.linkedAccountId || ''
        });
      } else {
        setFormData({
          title: '',
          targetAmount: '',
          currentAmount: '0',
          deadline: new Date().toISOString().split('T')[0],
          priority: 'medium',
          status: 'active',
          linkedAccountId: ''
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
    
    const payload = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      currentAmount: formData.linkedAccountId ? 0 : parseFloat(formData.currentAmount || 0),
    };
    
    if (!payload.linkedAccountId) {
      payload.linkedAccountId = null;
    }
    
    onSubmit(payload);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? 'Edit Savings Goal' : 'New Savings Goal'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <Input
          label="Goal Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          placeholder="e.g. New Car, Emergency Fund"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Input
            label="Target Amount"
            name="targetAmount"
            type="number"
            step="0.01"
            min="1"
            value={formData.targetAmount}
            onChange={handleChange}
            required
            placeholder="0.00"
          />
          <Select
            label="Link to Account (Optional)"
            name="linkedAccountId"
            value={formData.linkedAccountId}
            onChange={handleChange}
          >
            <option value="">None (Manual Tracking)</option>
            {accounts.filter(a => a.type === 'savings' || a.type === 'bank').map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </Select>
          <Input
            label={formData.linkedAccountId ? "Current Saved (Auto-Synced)" : "Current Saved"}
            name="currentAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.linkedAccountId ? '' : formData.currentAmount}
            onChange={handleChange}
            required={!formData.linkedAccountId}
            disabled={!!formData.linkedAccountId}
            placeholder={formData.linkedAccountId ? "Syncs with account" : "0.00"}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Input
            label="Target Deadline"
            name="deadline"
            type="date"
            value={formData.deadline}
            onChange={handleChange}
            required
          />

          <Select
            label="Priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>

        {initialData && (
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
          >
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Update Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
