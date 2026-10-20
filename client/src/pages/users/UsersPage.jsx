import { useState, useEffect, useContext } from 'react';
import { ShieldCheck, Plus, UserPlus, Lock } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';

export default function UsersPage() {
  const { role } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'STAFF',
  });

  const isAuthorized = ['ADMIN', 'OWNER'].includes(role);

  const loadUsers = async () => {
    if (!isAuthorized) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await api.get('/users');
      if (data.success) {
        setUsers(data.data || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [role]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      showToast(`User ${form.username} provisioned successfully`, 'success');
      setIsModalOpen(false);
      setForm({ username: '', email: '', password: '', full_name: '', role: 'STAFF' });
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (!isAuthorized) {
    return (
      <div style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: '500px', margin: '40px auto' }}>
        <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
          <Lock size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          User provisioning and role administration are restricted to System Administrators and Business Owners.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, margin: 0 }}>User Management & RBAC</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Provision Operator Accounts and Configure Role Permissions
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={16} style={{ marginRight: '6px' }} />
          Provision New User
        </Button>
      </div>

      {/* Users Table */}
      <Card padding="none" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>User</th>
                <th style={{ padding: '12px 16px' }}>Username</th>
                <th style={{ padding: '12px 16px' }}>Role</th>
                <th style={{ padding: '12px 16px' }}>Created</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '32px', textAlign: 'center' }}>Loading users...</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{u.username}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: u.role === 'ADMIN' ? '#EF4444' : u.role === 'OWNER' ? '#8B5CF6' : u.role === 'MANAGER' ? '#3B82F6' : '#10B981',
                          color: '#fff',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: u.is_active ? '#10B981' : '#EF4444' }}>
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Provision User Modal */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Provision Operator Account">
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Full Name</label>
              <Input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="e.g. Ramesh Joshi"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Username</label>
                <Input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="e.g. ramesh_mgr"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Role</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontSize: '13px' }}
                >
                  <option value="STAFF">STAFF (POS Sales Counter)</option>
                  <option value="MANAGER">MANAGER (Store Manager)</option>
                  <option value="OWNER">OWNER (Business Owner)</option>
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Email Address</label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ramesh@example.com"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Password</label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Provision User</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
