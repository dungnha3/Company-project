import { SharedAttendancePage } from '@/shared/components/attendance';

export default function MyAttendancePage({ glassMode }) {
  return (
    <SharedAttendancePage
      title="Chấm công cá nhân"
      breadcrumb="Cá nhân / Chấm công"
      viewMode="personal"
      glassMode={glassMode}
    />
  );
}
