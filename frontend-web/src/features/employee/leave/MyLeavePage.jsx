import { SharedLeaveRequestPage } from '@/shared/components/leave-request';

export default function MyLeavePage({ glassMode }) {
  return (
    <SharedLeaveRequestPage
      title="Đơn từ & Nghỉ phép"
      breadcrumb="Cá nhân / Nghỉ phép"
      viewMode="personal"
      glassMode={glassMode}
    />
  );
}
