import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function DepartmentsPage() {
    const { hasRole } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [showModal, setShowModal] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null);

    // Fetch Departments (No pagination for now as per legacy logic, usually few departments)
    const { data: departments, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.DEPARTMENTS.LIST)).data,
    });

    const columns = [
        {
            header: 'Tên phòng ban',
            accessorKey: 'name',
            cell: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.name || row.tenPhongBan}</div>
                    <div className="text-xs text-gray-500">{row.description || row.moTa}</div>
                </div>
            )
        },
        {
            header: 'Trưởng phòng',
            accessorKey: 'manager',
            cell: (row) => (
                row.manager ? (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-100">
                            {row.manager.fullName?.charAt(0) || 'M'}
                        </div>
                        <span className="text-sm text-gray-700">{row.manager.fullName}</span>
                    </div>
                ) : <span className="text-gray-400 text-sm italic">Chưa bổ nhiệm</span>
            )
        },
        {
            header: 'Số nhân viên',
            accessorKey: 'memberCount',
            cell: (row) => <span className="badge badge-gray">{row.memberCount || 0} nhân viên</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => hasRole('MANAGER_HR') && (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => { setSelectedDept(row); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-pen" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.departmentId || row.phongbanId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-trash" />
                    </button>
                </div>
            )
        }
    ];

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.DEPARTMENTS.DELETE(id)),
        onSuccess: () => {
            showToast('Xóa phòng ban thành công', 'success');
            queryClient.invalidateQueries(['departments']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const handleDelete = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Phòng ban</h1>
                    <p className="text-gray-500 text-sm">Quản lý cơ cấu tổ chức</p>
                </div>
                {hasRole('MANAGER_HR') && (
                    <button onClick={() => { setSelectedDept(null); setShowModal(true); }} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Thêm phòng ban
                    </button>
                )}
            </div>

            <DataTable
                loading={isLoading}
                columns={columns}
                data={departments || []}
                totalCount={departments?.length || 0}
            />

            {showModal && (
                <DepartmentModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    department={selectedDept}
                />
            )}
        </div>
    );
}

function DepartmentModal({ isOpen, onClose, department }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEdit = !!department;

    // Fetch potential managers
    const { data: employees } = useQuery({
        queryKey: ['employees-simple'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST, { params: { size: 100 } })).data.content // Fetch top 100 for dropdown
    });

    const mutation = useMutation({
        mutationFn: (data) => {
            if (isEdit) return apiClient.put(ENDPOINTS.DEPARTMENTS.UPDATE(department.departmentId || department.phongbanId), data);
            return apiClient.post(ENDPOINTS.DEPARTMENTS.CREATE, data);
        },
        onSuccess: () => {
            showToast(isEdit ? 'Cập nhật thành công' : 'Thêm mới thành công', 'success');
            queryClient.invalidateQueries(['departments']);
            onClose();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            description: formData.get('description'),
            managerId: formData.get('managerId') ? Number(formData.get('managerId')) : null
        };
        mutation.mutate(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Cập nhật phòng ban' : 'Thêm phòng ban'}</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark" /></button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label-required">Tên phòng ban</label>
                            <input name="name" className="input w-full" defaultValue={department?.name || department?.tenPhongBan} required />
                        </div>
                        <div>
                            <label className="label">Mô tả</label>
                            <textarea name="description" className="input w-full" rows="3" defaultValue={department?.description || department?.moTa} />
                        </div>
                        <div>
                            <label className="label">Trưởng phòng</label>
                            <select name="managerId" className="input w-full" defaultValue={department?.manager?.employeeId}>
                                <option value="">-- Chọn trưởng phòng --</option>
                                {employees?.map(e => (
                                    <option key={e.nhanvienId} value={e.nhanvienId}>{e.hoTen}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="btn-ghost">Hủy</button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : (isEdit ? 'Lưu' : 'Thêm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
