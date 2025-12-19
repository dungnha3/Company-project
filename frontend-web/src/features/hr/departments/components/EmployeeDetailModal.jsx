import { useState, useEffect } from 'react';
import { 
  contractsService, 
  attendanceService, 
  leavesService 
} from '@/features/hr/shared/services';
import { useErrorHandler } from '@/shared/hooks';
import { 
  InfoTab, 
  ContractTab, 
  AttendanceTab, 
  LeaveTab 
} from './EmployeeDetailTabs';

/**
 * Modal hiển thị chi tiết nhân viên với các tab:
 * - Thông tin
 * - Hợp đồng (HĐ)
 * - Chấm công
 * - Nghỉ phép
 */
export default function EmployeeDetailModal({ employee, onClose }) {
  const [activeTab, setActiveTab] = useState('info');
  const [contracts, setContracts] = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const { handleError } = useErrorHandler();

  useEffect(() => {
    if (employee && activeTab !== 'info') {
      loadTabData();
    }
  }, [activeTab, employee]);

  const loadTabData = async () => {
    if (!employee?.nhanvienId) return;
    
    try {
      setLoading(true);
      
      if (activeTab === 'contract') {
        const data = await contractsService.getByEmployee(employee.nhanvienId);
        setContracts(Array.isArray(data) ? data : [data]);
      } else if (activeTab === 'attendance') {
        const now = new Date();
        const data = await attendanceService.getByMonth(
          employee.nhanvienId, 
          now.getFullYear(), 
          now.getMonth() + 1
        );
        setAttendances(Array.isArray(data) ? data : []);
      } else if (activeTab === 'leave') {
        const data = await leavesService.getByEmployee(employee.nhanvienId);
        setLeaves(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      const errorMessage = handleError(err, { context: `load_${activeTab}` });
      console.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!employee) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              Nhân viên #{employee.nhanvienId} - {employee.hoTen}
            </h2>
            <p style={styles.subtitle}>Thông tin chi tiết nhân viên</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <Tab 
            active={activeTab === 'info'} 
            onClick={() => setActiveTab('info')}
            label="Thông tin"
          />
          <Tab 
            active={activeTab === 'contract'} 
            onClick={() => setActiveTab('contract')}
            label="HĐ"
          />
          <Tab 
            active={activeTab === 'attendance'} 
            onClick={() => setActiveTab('attendance')}
            label="Chấm công"
          />
          <Tab 
            active={activeTab === 'leave'} 
            onClick={() => setActiveTab('leave')}
            label="Nghỉ phép"
          />
        </div>

        {/* Tab Content */}
        <div style={styles.content}>
          {activeTab === 'info' && <InfoTab employee={employee} />}
          {activeTab === 'contract' && (
            <ContractTab contracts={contracts} loading={loading} />
          )}
          {activeTab === 'attendance' && (
            <AttendanceTab attendances={attendances} loading={loading} />
          )}
          {activeTab === 'leave' && (
            <LeaveTab leaves={leaves} loading={loading} />
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.btnClose} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// Tab button component
function Tab({ active, onClick, label }) {
  return (
    <button
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// Styles
const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001
  },
  modal: {
    background: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 1000,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottom: '1px solid #f0f2f5'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#344767',
    margin: 0,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: '#7b809a',
    margin: 0
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: 28,
    color: '#7b809a',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  tabs: {
    display: 'flex',
    gap: 4,
    padding: '0 24px',
    borderBottom: '2px solid #f0f2f5',
    background: '#fff'
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    color: '#7b809a',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s',
    position: 'relative',
    bottom: -2
  },
  tabActive: {
    color: '#1e40af',
    borderBottomColor: '#1e40af'
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: 24
  },
  footer: {
    padding: 20,
    borderTop: '1px solid #f0f2f5',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12
  },
  btnClose: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: '#f0f2f5',
    color: '#7b809a',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer'
  }
};
