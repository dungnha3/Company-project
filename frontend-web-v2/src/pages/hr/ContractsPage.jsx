import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function ContractsPage() {
    const { hasRole } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [showModal, setShowModal] = useState(false);
    const [selectedContract, setSelectedContract] = useState(null);

    const { data: contracts, isLoading } = useQuery({
        queryKey: ['contracts'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.CONTRACTS.LIST)).data,
    });

    const columns = [
        {
            header: 'Mã HĐ',
            accessorKey: 'contractCode',
            cell: (row) => <span className="font-mono text-gray-600">#{row.contractCode}</span>
        },
        {
            header: 'Nhân viên',
            accessorKey: 'employee',
            cell: (row) => (
                <div>
                    <div className="font-semibold text-gray-900">{row.employeeName || row.employee?.fullName}</div>
                    <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
                </div>
            )
        },
        {
            header: 'Loại HĐ',
            accessorKey: 'contractType',
            cell: (row) => <span className="badge badge-blue">{row.contractType}</span>
        },
        {
            header: 'Thời hạn',
            accessorKey: 'duration',
            cell: (row) => (
                <div className="text-sm">
                    <div>{new Date(row.startDate).toLocaleDateString()}</div>
                    <div className="text-gray-400 text-xs">đến {row.endDate ? new Date(row.endDate).toLocaleDateString() : 'Vô thời hạn'}</div>
                </div>
            )
        },
        {
            header: 'Trạng thái',
            accessorKey: 'status',
            cell: (row) => <span className={`badge ${row.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status}</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => hasRole('MANAGER_HR') && (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => { setSelectedContract(row); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-pen" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.contractId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-trash" />
                    </button>
                </div>
            )
        }
    ];

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.CONTRACTS.DELETE(id)),
        onSuccess: () => {
            showToast('Xóa hợp đồng thành công', 'success');
            queryClient.invalidateQueries(['contracts']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const handleDelete = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Hợp đồng lao động</h1>
                    <p className="text-gray-500 text-sm">Quản lý hồ sơ hợp đồng nhân viên</p>
                </div>
                {hasRole('MANAGER_HR') && (
                    <button onClick={() => { setSelectedContract(null); setShowModal(true); }} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Tạo hợp đồng
                    </button>
                )}
            </div>

            <DataTable
                loading={isLoading}
                columns={columns}
                data={contracts || []}
                totalCount={contracts?.length || 0}
            />

            {showModal && (
                <ContractModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    contract={selectedContract}
                />
            )}
        </div>
    );
}

function ContractModal({ isOpen, onClose, contract }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEdit = !!contract;

    // Fetch Employees for dropdown
    const { data: employees } = useQuery({
        queryKey: ['employees-simple'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.EMPLOYEES.LIST, { params: { size: 100 } })).data?.content || []
    });

    const mutation = useMutation({
        mutationFn: (data) => {
            if (isEdit) return apiClient.put(ENDPOINTS.CONTRACTS.UPDATE(contract.contractId), data);
            return apiClient.post(ENDPOINTS.CONTRACTS.CREATE, data);
        },
        onSuccess: () => {
            showToast(isEdit ? 'Cập nhật thành công' : 'Thêm mới thành công', 'success');
            queryClient.invalidateQueries(['contracts']);
            onClose();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            employeeId: Number(formData.get('employeeId')),
            contractCode: formData.get('contractCode'),
            contractType: formData.get('contractType'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate') || null,
            baseSalary: Number(formData.get('baseSalary')),
            status: formData.get('status')
        };
        mutation.mutate(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                        <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Cập nhật hợp đồng' : 'Tạo hợp đồng mới'}</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark" /></button>
                    </div>

                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="label-required">Nhân viên</label>
                            <select name="employeeId" className="input w-full" defaultValue={contract?.employeeId} required disabled={isEdit}>
                                <option value="">-- Chọn nhân viên --</option>
                                {employees?.map(e => (
                                    <option key={e.employeeId} value={e.employeeId}>{e.fullName} ({e.employeeId})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Mã HĐ</label>
                                <input name="contractCode" className="input w-full" defaultValue={contract?.contractCode} required />
                            </div>
                            <div>
                                <label className="label-required">Loại HĐ</label>
                                <select name="contractType" className="input w-full" defaultValue={contract?.contractType} required>
                                    <option value="DEFINITE">Có thời hạn</option>
                                    <option value="INDEFINITE">Vô thời hạn</option>
                                    <option value="PROBATION">Thử việc</option>
                                    <option value="INTERNSHIP">Thực tập</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Ngày bắt đầu</label>
                                <input type="date" name="startDate" className="input w-full" defaultValue={contract?.startDate?.split('T')[0]} required />
                            </div>
                            <div>
                                <label className="label">Ngày kết thúc</label>
                                <input type="date" name="endDate" className="input w-full" defaultValue={contract?.endDate?.split('T')[0]} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Lương cơ bản</label>
                                <input type="number" name="baseSalary" className="input w-full" defaultValue={contract?.baseSalary} required />
                            </div>
                            <div>
                                <label className="label-required">Trạng thái</label>
                                <select name="status" className="input w-full" defaultValue={contract?.status || 'ACTIVE'} required>
                                    <option value="ACTIVE">Hiệu lực</option>
                                    <option value="EXPIRED">Hết hạn</option>
                                    <option value="TERMINATED">Chấm dứt</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="btn-ghost">Hủy</button>
                        <button type="submit" disabled={mutation.isPending} className="btn-primary">
                            {mutation.isPending ? <i className="fa-solid fa-spinner fa-spin" /> : (isEdit ? 'Lưu' : 'Tạo mới')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
