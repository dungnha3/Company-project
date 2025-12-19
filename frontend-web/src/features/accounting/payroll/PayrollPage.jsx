import { useState, useEffect } from 'react'
import { formatCurrency } from '@/shared/utils'
import { payrollService } from '@/shared/services/payroll.service'
import { useToast } from '@/shared/components/ui'

export function PayrollPage() {
    const [payrolls, setPayrolls] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [month, setMonth] = useState(new Date().getMonth() + 1)
    const [year, setYear] = useState(new Date().getFullYear())
    const [calculating, setCalculating] = useState(false)
    const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, totalAmount: 0 })
    const [currentPage, setCurrentPage] = useState(1)
    const ITEMS_PER_PAGE = 10
    const toast = useToast()

    useEffect(() => {
        loadPayrolls()
        setCurrentPage(1)
    }, [month, year])

    const loadPayrolls = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await payrollService.getByPeriod(month, year)
            const payrollList = Array.isArray(data) ? data : []
            setPayrolls(payrollList)

            // Calculate Stats
            const totalAmount = payrollList.reduce((sum, p) => sum + (p.luongThucNhan || 0), 0)
            const paid = payrollList.filter(p => p.trangThai === 'DA_THANH_TOAN').length
            const pending = payrollList.filter(p => p.trangThai === 'CHUA_THANH_TOAN').length

            setStats({
                total: payrollList.length,
                paid,
                pending,
                totalAmount
            })
        } catch (err) {
            console.error('Lỗi tải bảng lương:', err)
            setError('Không thể tải bảng lương. ' + (err.response?.data?.message || err.message))
            setPayrolls([])
        } finally {
            setLoading(false)
        }
    }

    const handleCalculateAll = async () => {
        if (!confirm(`Tính lương tự động tất cả nhân viên tháng ${month}/${year}?\n\nHệ thống sẽ tự động tính dựa trên:\n- Hợp đồng còn hiệu lực\n- Dữ liệu chấm công\n- Bảo hiểm & Thuế TNCN`)) return

        try {
            setCalculating(true)
            const result = await payrollService.autoCalculateAll(month, year)
            toast.success(`Đã tính lương thành công cho ${result.soLuongBangLuong || 0} nhân viên!`)
            loadPayrolls()
        } catch (err) {
            console.error('Lỗi tính lương:', err)
            toast.error(err.response?.data?.message || 'Lỗi tính lương tự động')
        } finally {
            setCalculating(false)
        }
    }

    const handleMarkPaid = async (id, name) => {
        if (!confirm(`Xác nhận đã thanh toán lương cho ${name}?`)) return
        try {
            await payrollService.markAsPaid(id)
            loadPayrolls()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi cập nhật trạng thái')
        }
    }

    const handleCancel = async (id, name) => {
        if (!confirm(`Xác nhận hủy bảng lương của ${name}?`)) return
        try {
            await payrollService.cancel(id)
            loadPayrolls()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi hủy bảng lương')
        }
    }

    const getStatusBadge = (status) => {
        const config = {
            'CHUA_THANH_TOAN': { className: 'badge text-yellow', text: 'Chờ thanh toán' },
            'DA_THANH_TOAN': { className: 'badge text-green', text: 'Đã thanh toán' },
            'DA_HUY': { className: 'badge text-red', text: 'Đã hủy', style: { color: '#ef4444', background: '#fef2f2' } }
        }
        const style = config[status] || { className: 'badge', text: status }

        return (
            <span className={style.className} style={{ ...style.style, whiteSpace: 'nowrap' }}>
                {style.text}
            </span>
        )
    }

    return (
        <div className="accounting-animate-fade-in">
            {/* Filters & Actions */}
            <div className="card" style={{ marginBottom: '25px', padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}>Kỳ lương:</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none' }}
                        >
                            {[2023, 2024, 2025, 2026].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={loadPayrolls}
                        className="icon-btn"
                        title="Làm mới"
                        style={{ width: '36px', height: '36px' }}
                    >
                        <i className="fa-solid fa-sync"></i>
                    </button>
                </div>

                <button
                    onClick={handleCalculateAll}
                    disabled={calculating}
                    className="btn-primary-acc"
                    style={{ padding: '10px 20px', fontSize: '0.9rem', background: calculating ? '#ccc' : undefined }}
                >
                    {calculating ? <><i className="fa-solid fa-spinner fa-spin"></i> Đang tính...</> : <><i className="fa-solid fa-calculator"></i> Tính lương tất cả</>}
                </button>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '25px' }}>
                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="stat-icon bg-purple" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                        <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.total}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Nhân viên</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="stat-icon bg-green" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                        <i className="fa-solid fa-coins"></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(stats.totalAmount)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Tổng chi</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="stat-icon bg-blue" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                        <i className="fa-solid fa-check-double"></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.paid}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Đã thanh toán</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="stat-icon bg-yellow" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                        <i className="fa-solid fa-clock"></i>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.pending}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Chờ xử lý</div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            {['Nhân viên', 'Lương cơ bản', 'Ngày công', 'Phụ cấp/Thưởng', 'Khấu trừ', 'Thực lĩnh', 'Trạng thái', 'Thao tác'].map((h, i) => (
                                <th key={i} style={{
                                    padding: '15px 20px', textAlign: i === 0 ? 'left' : 'center',
                                    fontSize: '0.85rem', fontWeight: 700, color: '#666', textTransform: 'uppercase'
                                }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center' }}><i className="fa-solid fa-spinner fa-spin"></i> Đang tải...</td></tr>
                        ) : payrolls.length === 0 ? (
                            <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Chưa có dữ liệu bảng lương</td></tr>
                        ) : (
                            (() => {
                                const sortedPayrolls = [...payrolls].sort((a, b) => {
                                    const order = { 'CHUA_THANH_TOAN': 0, 'DA_THANH_TOAN': 1, 'DA_HUY': 2 };
                                    return (order[a.trangThai] || 0) - (order[b.trangThai] || 0);
                                });
                                const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                const paginatedPayrolls = sortedPayrolls.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                                return paginatedPayrolls.map(p => (
                                    <tr key={p.bangluongId} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                                        <td style={{ padding: '15px 20px', fontWeight: 600 }}>{p.hoTenNhanVien || 'N/A'}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right' }}>{formatCurrency(p.luongCoBan || 0)}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>{p.ngayCong || 0}/{p.ngayCongChuan || 22}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right', color: '#27ae60' }}>
                                            +{formatCurrency((p.phuCap || 0) + (p.thuong || 0))}
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right', color: '#e74c3c' }}>
                                            -{formatCurrency(p.tongKhauTru || 0)}
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'right', fontWeight: 700, fontSize: '1rem', color: '#2c3e50' }}>{formatCurrency(p.luongThucNhan || 0)}</td>
                                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                            {getStatusBadge(p.trangThai)}
                                        </td>
                                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {p.trangThai === 'CHUA_THANH_TOAN' && (
                                                    <>
                                                        <button onClick={() => handleMarkPaid(p.bangluongId, p.hoTenNhanVien)} className="icon-btn" style={{ width: '32px', height: '32px', color: '#00b894' }} title="Thanh toán">
                                                            <i className="fa-solid fa-money-check"></i>
                                                        </button>
                                                        <button onClick={() => handleCancel(p.bangluongId, p.hoTenNhanVien)} className="icon-btn" style={{ width: '32px', height: '32px', color: '#e74c3c' }} title="Hủy">
                                                            <i className="fa-solid fa-ban"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            })()
                        )}
                    </tbody>
                </table>

                {/* Pagination Simple */}
                {payrolls.length > ITEMS_PER_PAGE && (
                    <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="icon-btn" style={{ width: '30px', height: '30px', opacity: currentPage === 1 ? 0.5 : 1 }}>
                                <i className="fa-solid fa-chevron-left"></i>
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '0.9rem' }}>
                                Trang {currentPage} / {Math.ceil(payrolls.length / ITEMS_PER_PAGE)}
                            </span>
                            <button disabled={currentPage >= Math.ceil(payrolls.length / ITEMS_PER_PAGE)} onClick={() => setCurrentPage(p => p + 1)} className="icon-btn" style={{ width: '30px', height: '30px', opacity: currentPage >= Math.ceil(payrolls.length / ITEMS_PER_PAGE) ? 0.5 : 1 }}>
                                <i className="fa-solid fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
