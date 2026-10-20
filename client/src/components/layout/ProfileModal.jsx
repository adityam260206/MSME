import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { authApi } from '../../api/auth.api';

export default function ProfileModal({ isOpen, onClose, user, onUpdate }) {
  const [formData, setFormData] = useState({
    nickname: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordStep, setPasswordStep] = useState(0); // 0: closed, 1: old, 2: new

  useEffect(() => {
    if (isOpen) {
      setFormData({
        nickname: user?.nickname || '',
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setError('');
      setSuccess('');
      setFieldErrors({});
      setPasswordStep(0);
    }
  }, [isOpen, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: undefined }));
    }
    setError('');
  };

  const handleNextStep = async (e) => {
    e.preventDefault();
    if (passwordStep === 1) {
      if (!formData.oldPassword) {
        setFieldErrors({ oldPassword: 'Old password is required' });
        return;
      }
      
      setIsLoading(true);
      setError('');
      try {
        await authApi.verifyPassword({ password: formData.oldPassword });
        setPasswordStep(2);
        setFieldErrors({});
      } catch (err) {
        if (err.errors && err.errors.length > 0) {
          setFieldErrors({ oldPassword: err.errors[0].message });
        } else {
          setFieldErrors({ oldPassword: err.message || 'Incorrect old password.' });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordStep === 2) {
      if (formData.newPassword !== formData.confirmPassword) {
        setFieldErrors({ confirmPassword: 'Passwords do not match' });
        return;
      }
      if (!formData.newPassword) {
        setFieldErrors({ newPassword: 'New password is required' });
        return;
      }
    }

    const payload = {};
    if (formData.nickname !== user?.nickname) {
      payload.nickname = formData.nickname;
    }
    if (passwordStep === 2 && formData.newPassword) {
      payload.oldPassword = formData.oldPassword;
      payload.newPassword = formData.newPassword;
    }

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setIsLoading(true);
    setFieldErrors({});
    setError('');
    setSuccess('');

    try {
      const response = await authApi.updateProfile(payload);
      onUpdate(response.data.data.user);
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        const errorsMap = {};
        err.errors.forEach(e => {
          errorsMap[e.field] = e.message;
        });
        setFieldErrors(errorsMap);
      } else {
        setError(err.message || 'Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Profile">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {error && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'rgba(255, 90, 95, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: 'var(--space-3)', backgroundColor: 'rgba(0, 200, 150, 0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)' }}>
            {success}
          </div>
        )}

        <Input
          label="Nickname"
          name="nickname"
          value={formData.nickname}
          onChange={handleChange}
          error={fieldErrors.nickname}
          placeholder="What should we call you?"
          disabled={isLoading}
        />

        <div style={{ marginTop: 'var(--space-2)' }}>
          {passwordStep === 0 ? (
            <Button type="button" variant="danger" onClick={() => setPasswordStep(1)} fullWidth>
              Change Password
            </Button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {passwordStep === 1 && (
                <>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', fontWeight: 'var(--weight-medium)', padding: 'var(--space-2)', backgroundColor: 'rgba(255, 184, 0, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    NOTE: Old password is required to change password
                  </div>
                  <Input
                    label="Old Password"
                    name="oldPassword"
                    type="password"
                    value={formData.oldPassword}
                    onChange={handleChange}
                    error={fieldErrors.oldPassword}
                    placeholder="Enter current password"
                    disabled={isLoading}
                    autoFocus
                  />
                  <Button type="button" variant="primary" onClick={handleNextStep}>
                    Next
                  </Button>
                </>
              )}

              {passwordStep === 2 && (
                <>
                  <Input
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleChange}
                    error={fieldErrors.newPassword}
                    placeholder="New secure password"
                    disabled={isLoading}
                    autoFocus
                  />

                  <Input
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={fieldErrors.confirmPassword}
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {passwordStep !== 1 && (
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Changes
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
