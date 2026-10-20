import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

export default function TransferFormModal({ isOpen, onClose, onSubmit, accounts = [] }) {
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fromAccountId: '',
        toAccountId: '',
        amount: '',
      });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.fromAccountId === formData.toAccountId) {
      alert("Cannot transfer to the same account");
      return;
    }
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Transfer Funds"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="From Account"
            name="fromAccountId"
            value={formData.fromAccountId}
            onChange={handleChange}
            required
          >
            <option value="">Select origin...</option>
            {accounts.map(acc => (
              <option key={acc._id} value={acc._id}>{acc.name} ({acc.currentBalance})</option>
            ))}
          </Select>

          <Select
            label="To Account"
            name="toAccountId"
            value={formData.toAccountId}
            onChange={handleChange}
            required
          >
            <option value="">Select destination...</option>
            {accounts.map(acc => (
              <option key={acc._id} value={acc._id}>{acc.name} ({acc.currentBalance})</option>
            ))}
          </Select>
        </div>

        <Input
          label="Transfer Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount}
          onChange={handleChange}
          required
          placeholder="0.00"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Execute Transfer</Button>
        </div>
      </form>
    </Modal>
  );
}
