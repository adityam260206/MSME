import { useState, useEffect, useContext } from 'react';
import { Briefcase, Plus, Edit2, UserX, Lock, Mail, Building } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function EmployeesPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    monthly_base_salary: '',
  });

  const canManageHR = ['ADMIN', 'OWNER'].includes(role);
  const isDenied = role === 'STAFF';

  const loadEmployees = async () => {
    if (isDenied) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.get('/business/employees');
      if (data.success) {
        setEmployees(data.data || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, [role]);

  const handleOpenModal = (emp = null) => {
    if (emp) {
      setEditingEmployee(emp);
      setEmpForm({
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        monthly_base_salary: emp.monthly_base_salary || '',
      });
    } else {
      setEditingEmployee(null);
      setEmpForm({
        name: '',
        email: '',
        role: '',
        department: '',
        monthly_base_salary: '',
      });
    }
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await api.put(`/business/employees/${editingEmployee.id}`, {
          name: empForm.name,
          email: empForm.email,
          role: empForm.role,
          department: empForm.department,
          monthly_base_salary: empForm.monthly_base_salary ? parseFloat(empForm.monthly_base_salary) : undefined,
        });
        showToast('Employee record updated successfully', 'success');
      } else {
        await api.post('/business/employees', {
          ...empForm,
          monthly_base_salary: parseFloat(empForm.monthly_base_salary),
        });
        showToast('Employee created successfully', 'success');
      }
      setIsEmployeeModalOpen(false);
      loadEmployees();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeactivate = async (empId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      const { data } = await api.post(`/business/employees/${empId}/deactivate`);
      if (data.success) {
        showToast('Employee deactivated successfully', 'success');
        loadEmployees();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (isDenied) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Workforce and HR administration is restricted to Store Managers and Business Owners. Sales staff do not have access to personnel records (HTTP 403 Forbidden).
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>Workforce & HR Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Employee Directory, Operational Roles & Compensation Roster
          </p>
        </div>

        {canManageHR && (
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Add Employee
          </Button>
        )}
      </div>

      {/* Roster Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Department</th>
                <th style={{ padding: '12px 16px' }}>Operational Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Monthly Base Salary</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                {canManageHR && <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center' }}>Loading employee roster...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No active employees registered.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{emp.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        <Building size={12} /> {emp.department}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{emp.role}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>
                      {emp.monthly_base_salary !== null && emp.monthly_base_salary !== undefined ? (
                        `₹${Number(emp.monthly_base_salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '11px' }}>
                          🔒 Confidential (Masked)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: emp.is_active ? '#10B981' : '#EF4444' }}>
                        {emp.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {canManageHR && (
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button size="sm" variant="secondary" onClick={() => handleOpenModal(emp)} title="Edit Record">
                            <Edit2 size={13} />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDeactivate(emp.id)} title="Deactivate" style={{ color: '#EF4444' }}>
                            <UserX size={13} />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Employee Modal */}
      {isEmployeeModalOpen && (
        <Modal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} title={editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}>
          <form onSubmit={handleSaveEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
              <Input
                type="text"
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                placeholder="e.g. Vikram Malhotra"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Work Email</label>
              <Input
                type="email"
                required
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                placeholder="employee@msme360.local"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Operational Role</label>
                <Input
                  type="text"
                  required
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  placeholder="e.g. Operations Manager"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Department</label>
                <select
                  required
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
                >
                  <option value="">Select Department...</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Finance">Finance</option>
                  <option value="Administration">Administration</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Monthly Base Salary (₹)</label>
              <Input
                type="number"
                step="1"
                min="1"
                required
                value={empForm.monthly_base_salary}
                onChange={(e) => setEmpForm({ ...empForm, monthly_base_salary: e.target.value })}
                placeholder="e.g. 35000"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsEmployeeModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Employee</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
