import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/providers/ToastProvider';
import apiClient from '@shared/api/client';
import { ENDPOINTS } from '@shared/api/endpoints';
import DataTable from '@shared/components/ui/DataTable';
import { useWorkspaceStore } from '@shared/stores/workspaceStore';

export default function PositionsPage() {
    const { hasRole } = useWorkspaceStore();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [showModal, setShowModal] = useState(false);
    const [selectedPos, setSelectedPos] = useState(null);

    const { data: positions, isLoading } = useQuery({
        queryKey: ['positions'],
        queryFn: async () => (await apiClient.get(ENDPOINTS.POSITIONS.LIST)).data,
    });

    const columns = [
        {
            header: 'Tên chức vụ',
            accessorKey: 'name',
            cell: (row) => <span className="font-semibold text-gray-900">{row.name || row.tenChucVu}</span>
        },
        {
            header: 'Hệ số lương',
            accessorKey: 'salaryCoefficient',
            cell: (row) => <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">{row.salaryCoefficient || row.heSoLuong}x</span>
        },
        {
            header: 'Cấp bậc',
            accessorKey: 'level',
            cell: (row) => <span className="badge badge-gray">Level {row.level || 1}</span>
        },
        {
            header: '',
            accessorKey: 'actions',
            cell: (row) => hasRole('MANAGER_HR') && (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => { setSelectedPos(row); setShowModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-pen" />
                    </button>
                    <button
                        onClick={() => handleDelete(row.positionId || row.chucvuId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <i className="fa-solid fa-trash" />
                    </button>
                </div>
            )
        }
    ];

    const deleteMutation = useMutation({
        mutationFn: (id) => apiClient.delete(ENDPOINTS.POSITIONS.DELETE(id)),
        onSuccess: () => {
            showToast('Xóa chức vụ thành công', 'success');
            queryClient.invalidateQueries(['positions']);
        },
        onError: (err) => showToast(err.response?.data?.message || 'Có lỗi xảy ra', 'error')
    });

    const handleDelete = (id) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa chức vụ này?')) {
            deleteMutation.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Chức vụ & Vị trí</h1>
                    <p className="text-gray-500 text-sm">Quản lý các vị trí công việc và hệ số lương</p>
                </div>
                {hasRole('MANAGER_HR') && (
                    <button onClick={() => { setSelectedPos(null); setShowModal(true); }} className="btn-primary">
                        <i className="fa-solid fa-plus mr-2" /> Thêm chức vụ
                    </button>
                )}
            </div>

            <DataTable
                loading={isLoading}
                columns={columns}
                data={positions || []}
                totalCount={positions?.length || 0}
            />

            {showModal && (
                <PositionModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    position={selectedPos}
                />
            )}
        </div>
    );
}

function PositionModal({ isOpen, onClose, position }) {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const isEdit = !!position;

    const mutation = useMutation({
        mutationFn: (data) => {
            if (isEdit) return apiClient.put(ENDPOINTS.POSITIONS.UPDATE(position.positionId || position.chucvuId), data);
            return apiClient.post(ENDPOINTS.POSITIONS.CREATE, data);
        },
        onSuccess: () => {
            showToast(isEdit ? 'Cập nhật thành công' : 'Thêm mới thành công', 'success');
            queryClient.invalidateQueries(['positions']);
            onClose();
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            salaryCoefficient: Number(formData.get('salaryCoefficient')),
            level: Number(formData.get('level'))
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
                        <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Cập nhật chức vụ' : 'Thêm chức vụ'}</h2>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark" /></button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="label-required">Tên chức vụ</label>
                            <input name="name" className="input w-full" defaultValue={position?.name || position?.tenChucVu} required placeholder="VD: Senior Developer" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-required">Hệ số lương</label>
                                <input type="number" step="0.1" name="salaryCoefficient" className="input w-full" defaultValue={position?.salaryCoefficient || position?.heSoLuong || 1.0} required />
                            </div>
                            <div>
                                <label className="label-required">Level</label>
                                <input type="number" name="level" className="input w-full" defaultValue={position?.level || 1} required min="1" max="10" />
                            </div>
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
