import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { categoriesApi } from '../../api/categories.api';
import useApi from '../../hooks/useApi';

export default function RecurringFormModal({ isOpen, onClose, onSubmit, initialData = null, accounts = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'expense',
    category: '',
    account: '',

    frequency: 'monthly',
    nextDueDate: new Date().toISOString().split('T')[0]
  });

  const categoriesApiHook = useApi(categoriesApi.getAll);

  useEffect(() => {
    if (isOpen) {
      categoriesApiHook.execute();
      
      if (initialData) {
        setFormData({
          name: initialData.name,
          amount: initialData.amount,
          type: initialData.type,
          category: initialData.category?._id || initialData.category,
          account: initialData.account || (accounts.length > 0 ? accounts[0]._id : ''),
          frequency: initialData.frequency,
          nextDueDate: new Date(initialData.nextDueDate).toISOString().split('T')[0]
        });
      } else {
        setFormData({
          name: '',
          amount: '',
          type: 'expense',
          category: '',
          account: accounts.length > 0 ? accounts[0]._id : '',
          frequency: 'monthly',
          nextDueDate: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [isOpen, initialData, accounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  const activeCategories = categoriesApiHook.data?.categories?.filter(c => c.type === formData.type) || [];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </Select>
          <Input
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={handleChange}
            required
            placeholder="0.00"
          />
        </div>

        <Input
          label="Name / Description"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="e.g. Netflix Subscription"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          >
            <option value="">Select category...</option>
            {activeCategories.map(c => (
              <option key={c._id} value={c._id}>
                {c.icon} {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Account"
            name="account"
            value={formData.account}
            onChange={handleChange}
            required
          >
            <option value="" disabled>Select an account</option>
            {accounts.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </Select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Frequency"
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </Select>

          <Input
            label="Next Due Date"
            name="nextDueDate"
            type="date"
            value={formData.nextDueDate}
            onChange={handleChange}
            required
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {initialData ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
