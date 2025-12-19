import { SharedStoragePage } from '@/shared/components/storage';

export default function MyStoragePage({ glassMode }) {
  return (
    <SharedStoragePage 
      title="File của tôi"
      breadcrumb="Cá nhân / File của tôi"
      viewMode="personal"
      glassMode={glassMode}
    />
  );
}
