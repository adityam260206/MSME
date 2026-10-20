import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

export default function TransactionForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories,
  accounts = [],
  initialData = null, 
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    description: '',
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        type: initialData.type,
        amount: initialData.amount,
        categoryId: initialData.category?._id || initialData.category,
        accountId: initialData.account || '',
        date: new Date(initialData.date).toISOString().split('T')[0],
        description: initialData.description || '',
      });
    } else if (isOpen) {
      setFormData({
        type: 'expense',
        amount: '',
        categoryId: '',
        accountId: accounts.length > 0 ? accounts[0]._id : '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
    }
  }, [initialData, isOpen, accounts]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  // Filter categories based on selected type
  const filteredCategories = categories?.filter(
    c => c.type === 'both' || c.type === formData.type
  ) || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Transaction' : 'Add Transaction'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <Select
            label="Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            disabled={isLoading}
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
            disabled={isLoading}
            placeholder="0.00"
          />
        </div>

        <Select
          label="Category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          required
          disabled={isLoading}
        >
          <option value="" disabled>Select a category</option>
          {filteredCategories.map(c => (
            <option key={c._id} value={c._id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>

        <Select
          label="Account"
          name="accountId"
          value={formData.accountId}
          onChange={handleChange}
          required
          disabled={isLoading}
        >
          <option value="" disabled>Select an account</option>
          {accounts.map(a => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </Select>

        <Input
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          required
          disabled={isLoading}
        />

        <Input
          label="Description (Optional)"
          name="description"
          type="text"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Grocery run, salary, etc."
          maxLength="100"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
