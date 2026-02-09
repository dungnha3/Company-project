import { useState } from 'react';
import PropTypes from 'prop-types';

const PERMISSION_GROUPS = [
    {
        key: 'HR',
        label: 'Quản trị Nhân sự',
        icon: 'fa-users',
        permissions: [
            { key: 'hrViewList', label: 'Xem danh sách nhân viên' },
            { key: 'hrEditProfile', label: 'Chỉnh sửa hồ sơ' },
            { key: 'hrManageContracts', label: 'Quản lý hợp đồng' },
        ]
    },
    {
        key: 'SALARY',
        label: 'Lương & Thưởng',
        icon: 'fa-money-bill-wave',
        permissions: [
            { key: 'salaryView', label: 'Xem bảng lương' },
            { key: 'salaryCalculate', label: 'Tính lương' },
            { key: 'salaryApprove', label: 'Duyệt bảng lương' },
        ]
    },
    {
        key: 'LEAVE',
        label: 'Nghỉ phép & Chấm công',
        icon: 'fa-calendar-check',
        permissions: [
            { key: 'leaveViewAll', label: 'Xem đơn nghỉ phép (Tất cả)' },
            { key: 'leaveApprove', label: 'Duyệt đơn nghỉ phép' },
            { key: 'attendanceViewAll', label: 'Xem chấm công (Tất cả)' },
            { key: 'attendanceEdit', label: 'Chỉnh sửa chấm công' },
        ]
    },
    {
        key: 'PROJECT',
        label: 'Quản lý Dự án',
        icon: 'fa-briefcase',
        permissions: [
            { key: 'projectCreate', label: 'Tạo dự án mới' },
            { key: 'projectManageAll', label: 'Quản lý tất cả dự án' },
            { key: 'projectDelete', label: 'Xóa dự án' },
        ]
    },
    {
        key: 'OTHER',
        label: 'Khác',
        icon: 'fa-sliders',
        permissions: [
            { key: 'chatCreateGroup', label: 'Tạo nhóm chat' },
            { key: 'storageUpload', label: 'Tải lên tài liệu' },
        ]
    }
];

export default function PermissionSelector({ value = {}, onChange, disabled = false }) {
    // value is the permissions object (e.g. { hrViewList: true, ... })

    const handleToggle = (key, currentStatus) => {
        if (disabled) return;
        onChange(key, !currentStatus);
    };

    return (
        <div className="space-y-6">
            {PERMISSION_GROUPS.map(group => (
                <div key={group.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-100">
                            <i className={`fa-solid ${group.icon} text-violet-600`} />
                        </div>
                        <h4 className="font-semibold text-gray-800">{group.label}</h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.permissions.map(perm => (
                            <div key={perm.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="text-sm text-gray-700">{perm.label}</div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={value[perm.key] || false}
                                        onChange={() => handleToggle(perm.key, value[perm.key])}
                                        disabled={disabled}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

PermissionSelector.propTypes = {
    value: PropTypes.object,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
};
