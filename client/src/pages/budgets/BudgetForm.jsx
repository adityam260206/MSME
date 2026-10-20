import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';

export default function BudgetForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  categories,
  initialData = null, 
  isLoading = false 
}) {
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    period: new Date().toISOString().substring(0, 7), // YYYY-MM
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        amount: initialData.amount,
        categoryId: initialData.category?._id || initialData.category,
        period: initialData.period,
      });
    } else if (isOpen) {
      setFormData({
        amount: '',
        categoryId: '',
        period: new Date().toISOString().substring(0, 7),
      });
    }
  }, [initialData, isOpen]);

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

  // Only allow budgeting for expense categories
  const expenseCategories = categories?.filter(c => c.type === 'expense' || c.type === 'both') || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Budget' : 'Set Budget'}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        
        <Select
          label="Category"
          name="categoryId"
          value={formData.categoryId}
          onChange={handleChange}
          required
          disabled={isLoading || !!initialData} // Can't change category of an existing budget
        >
          <option value="" disabled>Select a category</option>
          {expenseCategories.map(c => (
            <option key={c._id} value={c._id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Input
            label="Amount limit"
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

          <Input
            label="Month"
            name="period"
            type="month"
            value={formData.period}
            onChange={handleChange}
            required
            disabled={isLoading || !!initialData} // Can't change period of existing budget
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? 'Save Changes' : 'Set Budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
