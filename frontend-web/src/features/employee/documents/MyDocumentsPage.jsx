import { SharedContractsPage } from '@/shared/components/contracts';

export default function MyDocumentsPage({ glassMode }) {
  return (
    <SharedContractsPage
      title="Hợp đồng & Tài liệu"
      breadcrumb="Cá nhân / Hợp đồng & Tài liệu"
      viewMode="personal"
      glassMode={glassMode}
    />
  );
}
