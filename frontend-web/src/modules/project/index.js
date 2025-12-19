// Project Manager Dashboard - Personal & Project Management
export { default as ProfilePage } from '@/features/project/profile/ProfilePage.jsx'  // Own profile page
export { default as LeavePage } from '@/features/project/leave/LeavePage.jsx'
export { default as ApprovalsPage } from '@/features/project/approvals/ApprovalsPage.jsx'
// ❌ DocumentsPage removed as requested by user
export { default as ChatPage } from '@/features/project/chat/ChatPage.jsx'
export { default as PMStoragePage } from '@/features/project/storage/PMStoragePage.jsx'

// ❌ Removed: PayrollPage (PM không có quyền xem lương)

// Original Project Management page (advanced)
export { default as ProjectsPage } from '@/features/project/projects/ProjectsPage.jsx'