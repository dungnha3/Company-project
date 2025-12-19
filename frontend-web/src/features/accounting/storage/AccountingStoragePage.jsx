import { SharedStoragePage } from '@/shared/components/storage';

export default function AccountingStoragePage() {
  return (
    <div className="accounting-animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="glass-card" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <SharedStoragePage
          title="File của tôi"
          breadcrumb="Kế toán / File của tôi"
          viewMode="personal"
        />
      </div>
    </div>
  );
}
