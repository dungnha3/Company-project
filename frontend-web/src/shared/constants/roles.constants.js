export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER_HR: 'MANAGER_HR',
  MANAGER_ACCOUNTING: 'MANAGER_ACCOUNTING',
  MANAGER_PROJECT: 'MANAGER_PROJECT',
  EMPLOYEE: 'EMPLOYEE',
};

export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Quản trị viên',
  [USER_ROLES.MANAGER_HR]: 'Quản lý nhân sự',
  [USER_ROLES.MANAGER_ACCOUNTING]: 'Quản lý kế toán',
  [USER_ROLES.MANAGER_PROJECT]: 'Quản lý dự án',
  [USER_ROLES.EMPLOYEE]: 'Nhân viên',
};

export const ROLE_ROUTES = {
  [USER_ROLES.ADMIN]: '/admin',
  [USER_ROLES.MANAGER_HR]: '/hr',
  [USER_ROLES.MANAGER_ACCOUNTING]: '/accounting',
  [USER_ROLES.MANAGER_PROJECT]: '/projects',
  [USER_ROLES.EMPLOYEE]: '/employee',
};
