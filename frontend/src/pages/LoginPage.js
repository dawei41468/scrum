import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/userApi';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('developer');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });
  const { add: toast } = useToast();
  const navigate = useNavigate();

  // If already authenticated, redirect to backlog
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/backlog', { replace: true });
    }
  }, [navigate]);

  // Prefill remembered username
  React.useEffect(() => {
    const saved = localStorage.getItem('remember_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const validate = () => {
    const next = { username: '', password: '' };
    if (!username || username.trim().length < 3) next.username = 'Username must be at least 3 characters';
    if (!password || (isRegister ? password.length < 6 : password.length < 1)) {
      next.password = isRegister ? 'Password must be at least 6 characters' : 'Password is required';
    }
    setErrors(next);
    return !next.username && !next.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast({ variant: 'error', title: 'Please fix the highlighted fields' });
      return;
    }
    try {
      setSubmitting(true);
      if (isRegister) {
        await register({ username, password, role });
        toast({ variant: 'success', title: 'Registration successful' });
      } else {
        await login({ username, password });
        toast({ variant: 'success', title: 'Welcome back!' });
      }
      if (rememberMe) {
        localStorage.setItem('remember_username', username);
      } else {
        localStorage.removeItem('remember_username');
      }
      navigate('/backlog');
    } catch (error) {
      console.error('Auth error:', error.response ? error.response.data : error.message);
      const msg = error?.response?.data?.detail || error.message || 'Authentication failed';
      toast({ variant: 'error', title: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <Card
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? 'Have an account? Login' : 'New here? Register'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            error={errors.username}
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            error={errors.password}
          />
          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" className="h-4 w-4" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
              Show password
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toast({ variant: 'default', title: 'Password reset is not implemented yet.' })}
            >
              Forgot password?
            </Button>
          </div>
          {isRegister && (
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="product_owner">Product Owner</option>
              <option value="scrum_master">Scrum Master</option>
              <option value="developer">Developer</option>
            </Select>
          )}
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          <div className="pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? (isRegister ? 'Registering...' : 'Signing in...') : (isRegister ? 'Register' : 'Login')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;