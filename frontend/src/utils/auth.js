// Lightweight helpers to read role from JWT stored in localStorage
// No external dependencies to keep bundle small

export function getRole() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // Handle base64url decoding
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.role || null;
  } catch {
    return null;
  }
}

export function getUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.id || null;
  } catch {
    return null;
  }
}

export function hasRole(...allowed) {
  const role = getRole();
  if (!role) return false;
  return allowed.includes(role);
}
