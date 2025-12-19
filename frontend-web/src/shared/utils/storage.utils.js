const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  TOKEN_TYPE: 'tokenType',
  USER_ROLE: 'userRole',
  USERNAME: 'username',
  USER_ID: 'userId',
  EMAIL: 'email',
  EXPIRES_AT: 'expiresAt',
};

export const getToken = () => {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
};

export const setToken = (token) => {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const getRefreshToken = () => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const setRefreshToken = (token) => {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
};

export const getUserRole = () => {
  return localStorage.getItem(STORAGE_KEYS.USER_ROLE);
};

export const setUserRole = (role) => {
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
};

export const getUsername = () => {
  return localStorage.getItem(STORAGE_KEYS.USERNAME);
};

export const setUsername = (username) => {
  localStorage.setItem(STORAGE_KEYS.USERNAME, username);
};

export const getUserId = () => {
  return localStorage.getItem(STORAGE_KEYS.USER_ID);
};

export const setUserId = (userId) => {
  localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
};

export const getEmail = () => {
  return localStorage.getItem(STORAGE_KEYS.EMAIL);
};

export const setEmail = (email) => {
  localStorage.setItem(STORAGE_KEYS.EMAIL, email);
};

export const getExpiresAt = () => {
  return localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
};

export const setExpiresAt = (expiresAt) => {
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
};

export const removeToken = () => {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_TYPE);
  localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
  localStorage.removeItem(STORAGE_KEYS.USER_ID);
  localStorage.removeItem(STORAGE_KEYS.EMAIL);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
};

export const setAuthData = ({ accessToken, refreshToken, tokenType, role, username, userId, email, expiresAt }) => {
  if (accessToken) setToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
  if (tokenType) localStorage.setItem(STORAGE_KEYS.TOKEN_TYPE, tokenType);
  if (role) setUserRole(role);
  if (username) setUsername(username);
  if (userId) setUserId(userId);
  if (email) setEmail(email);
  if (expiresAt) setExpiresAt(expiresAt);
};

export const isTokenValid = () => {
  const token = getToken();
  const expiresAt = getExpiresAt();
  
  if (!token || !expiresAt) return false;
  
  return Number(expiresAt) > Date.now();
};
