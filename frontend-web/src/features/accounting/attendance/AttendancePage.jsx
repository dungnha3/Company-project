import { SharedAttendancePage } from '@/shared/components/attendance';

export function AttendancePage() {
    return (
        <div className="accounting-animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 
                SharedAttendancePage handles its own container and glass styling.
                We just pass 100% height to ensure it fills the space.
             */}
            <div style={{ flex: 1, minHeight: 0 }}>
                <SharedAttendancePage
                    title="Quản lý chấm công"
                    breadcrumb="Kế toán / Quản lý chấm công"
                    viewMode="management"
                    glassMode={true}
                />
            </div>
        </div>
    );
}
