import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../api/userApi';

const LoginPage = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('developer');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register({ username, password, role });
      } else {
        await login({ username, password });
      }
      navigate('/backlog');
    } catch (error) {
      console.error('Auth error:', error.response ? error.response.data : error.message);
      alert(`Authentication failed: ${error.response ? error.response.data.detail : error.message}`);
    }
  };

  return (
    <div>
      <h2>{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
        />
        {isRegister && (
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="product_owner">Product Owner</option>
            <option value="scrum_master">Scrum Master</option>
            <option value="developer">Developer</option>
          </select>
        )}
        <button type="submit">{isRegister ? 'Register' : 'Login'}</button>
      </form>
      <button onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? 'Switch to Login' : 'Switch to Register'}
      </button>
    </div>
  );
};

export default LoginPage;