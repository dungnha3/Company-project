import { SharedLeaveRequestPage } from '@/shared/components/leave-request';

export default function LeavePage() {
  return (
    <SharedLeaveRequestPage 
      title="Đơn từ & Nghỉ phép"
      breadcrumb="Cá nhân / Nghỉ phép"
      viewMode="personal"
    />
  );
}