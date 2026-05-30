import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import { useToast } from '@app/providers/ToastProvider';
import { useAccessControl } from '@shared/hooks/useAccessControl';

export default function EmployeeFormModal({ isOpen, onClose, employeeId = null }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const { hasPermission } = useAccessControl();
    const canManageEmployee = hasPermission('HR.CREATE_EMPLOYEE');
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [errors, setErrors] = useState({});

    const isEditMode = !!employeeId;

    // Fetch users for dropdown (only needed in Create mode)
    const { data: users } = useQuery({
        queryKey: ['users-available'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.USERS.LIST)).data, // Should ideally filter users without employee profile
        initialData: [],
        enabled: isOpen && !isEditMode
    });

    // Fetch employee details if Edit mode
    useQuery({
        queryKey: ['employee', employeeId],
        queryFn: async () => {
            const res = await apiClient.get(ENDPOINTS.EMPLOYEES.BY_ID(employeeId));
            const emp = res.data;
            setFormData({
                userId: emp.user?.userId || '', // Read only in edit
                fullName: emp.fullName || '',
                gender: emp.gender || 'MALE',
                dateOfBirth: emp.dateOfBirth || '',
                idCard: emp.idCard || '',
                email: emp.email || '', // Read only
                phone: emp.phone || '',
                address: emp.address || '',
                startDate: emp.hireDate || '',
                baseSalary: emp.baseSalary || '',
                allowance: emp.allowance || '',
                status: emp.status || 'ACTIVE',
            });
            return emp;
        },
        enabled: isOpen && isEditMode
    });

    // --- MUTATIONS ---
    const mutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                userId: Number(data.userId),
                fullName: data.fullName,
                gender: data.gender,
                dateOfBirth: data.dateOfBirth,
                idCard: data.idCard,
                phone: data.phone,
                address: data.address,
                hireDate: data.startDate,
                baseSalary: Number(data.baseSalary),
                allowance: data.allowance ? Number(data.allowance) : 0,
                status: data.status
            };

            if (isEditMode) {
                return apiClient.put(ENDPOINTS.EMPLOYEES.UPDATE(employeeId), payload);
            } else {
                return apiClient.post(ENDPOINTS.EMPLOYEES.CREATE, payload);
            }
        },
        onSuccess: () => {
            showToast(isEditMode ? 'Cập nhật thành công!' : 'Tạo hồ sơ nhân viên thành công!', 'success');
            queryClient.invalidateQueries(['employees']);
            onClose();
            setFormData(INITIAL_STATE);
        },
        onError: (err) => {
            showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error');
        }
    });

    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.userId && !isEditMode) newErrors.userId = 'Vui lòng chọn tài khoản User';
        if (!formData.fullName) newErrors.fullName = 'Vui lòng nhập họ tên';
        if (!formData.startDate) newErrors.startDate = 'Vui lòng chọn ngày vào làm';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (validate()) {
            mutation.mutate(formData);
        }
    };

    // --- AUTO FILL NAME ---
    // When selecting user, auto-fill full name from user account if available
    useEffect(() => {
        if (!isEditMode && formData.userId) {
            const selectedUser = users.find(u => String(u.userId) === String(formData.userId));
            if (selectedUser) {
                setFormData(prev => ({ ...prev, fullName: selectedUser.fullName || prev.fullName, email: selectedUser.email }));
            }
        }
    }, [formData.userId, users, isEditMode]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800">{isEditMode ? 'Cập nhật hồ sơ nhân viên' : 'Tạo hồ sơ nhân viên mới'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Account Selection (Create Mode Only) */}
                        {!isEditMode && (
                            <div className="md:col-span-2">
                                <label className="label-required">Tài khoản User</label>
                                <select
                                    name="userId"
                                    className={`input w-full ${errors.userId ? 'border-red-500' : ''}`}
                                    value={formData.userId}
                                    onChange={handleChange}
                                >
                                    <option value="">-- Chọn User chưa có hồ sơ nhân viên --</option>
                                    {users.map(u => (
                                        <option key={u.userId} value={u.userId}>
                                            {u.username} ({u.email}) - {u.fullName}
                                        </option>
                                    ))}
                                </select>
                                {errors.userId && <p className="text-red-500 text-xs mt-1">{errors.userId}</p>}
                                <p className="text-xs text-gray-400 mt-1">Chỉ những user đã được mời vào Workspace mới hiển thị ở đây.</p>
                            </div>
                        )}

                        {/* Personal Info */}
                        <div className="md:col-span-2 mb-2 border-b border-gray-100 pb-2 font-semibold text-gray-500 text-sm uppercase">Thông tin cá nhân</div>

                        <div>
                            <label className="label-required">Họ và tên</label>
                            <input name="fullName" className="input w-full" value={formData.fullName} onChange={handleChange} placeholder="VD: Nguyễn Văn A" />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label className="label">Giới tính</label>
                            <select name="gender" className="input w-full" value={formData.gender} onChange={handleChange}>
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Ngày sinh</label>
                            <input type="date" name="dateOfBirth" className="input w-full" value={formData.dateOfBirth} onChange={handleChange} />
                        </div>

                        <div>
                            <label className="label">CMND/CCCD</label>
                            <input name="idCard" className="input w-full" value={formData.idCard} onChange={handleChange} placeholder="Số CMND/CCCD" />
                        </div>

                        <div>
                            <label className="label">Số điện thoại</label>
                            <input name="phone" className="input w-full" value={formData.phone} onChange={handleChange} placeholder="09xxxxxxxxx" />
                        </div>

                        <div>
                            <label className="label">Địa chỉ</label>
                            <input name="address" className="input w-full" value={formData.address} onChange={handleChange} placeholder="Địa chỉ hiện tại" />
                        </div>

                        {/* Job Info */}
                        <div className="md:col-span-2 mt-4 mb-2 border-b border-gray-100 pb-2 font-semibold text-gray-500 text-sm uppercase">Thông tin công việc</div>

                        <div>
                            <label className="label-required">Ngày vào làm</label>
                            <input type="date" name="startDate" className="input w-full" value={formData.startDate} onChange={handleChange} />
                            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                        </div>

                        <div>
                            <label className="label">Trạng thái</label>
                            <select name="status" className="input w-full" value={formData.status} onChange={handleChange}>
                                <option value="ACTIVE">Đang làm việc</option>
                                <option value="ON_LEAVE">Tạm nghỉ</option>
                                <option value="RESIGNED">Nghỉ việc</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Mức lương cơ bản</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="baseSalary"
                                    className="input w-full pr-12"
                                    value={formData.baseSalary}
                                    onChange={handleChange}
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">VND</span>
                            </div>
                        </div>

                        <div>
                            <label className="label">Phụ cấp</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="allowance"
                                    className="input w-full pr-12"
                                    value={formData.allowance}
                                    onChange={handleChange}
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">VND</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="btn-ghost">Hủy bỏ</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canManageEmployee || mutation.isPending}
                        className={`btn-primary flex items-center gap-2 ${!canManageEmployee ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {mutation.isPending && <i className="fa-solid fa-spinner fa-spin" />}
                        {isEditMode ? 'Lưu thay đổi' : 'Tạo hồ sơ'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const INITIAL_STATE = {
    userId: '',
    fullName: '',
    gender: 'MALE',
    dateOfBirth: '',
    idCard: '',
    phone: '',
    address: '',
    startDate: new Date().toISOString().split('T')[0],
    baseSalary: '',
    allowance: '',
    status: 'ACTIVE'
};
