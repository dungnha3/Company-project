import { SharedProfilePage } from '@/shared/components/profile';

export default function ProfilePage({ glassMode, onProfileUpdate }) {
  return (
    <SharedProfilePage 
      title="Hồ sơ cá nhân"
      breadcrumb="Cá nhân / Hồ sơ cá nhân"
      allowEdit={true}
      userRole="Project Manager"
      glassMode={glassMode}
      onProfileUpdate={onProfileUpdate}
    />
  );
}
