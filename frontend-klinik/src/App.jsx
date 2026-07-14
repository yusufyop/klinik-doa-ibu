import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

// 🌟 AUTO DETECT API URL 🌟
const getApiUrl = () => {
  // Pakai environment variable dari Vercel
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback untuk development lokal
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return `http://${hostname}:5000/api`;
};

const API_URL = getApiUrl();


// 🌟 HELPER FUNCTIONS 🌟
const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return 'Rp 0';
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

const formatTanggal = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTanggalPendek = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// 🌟 TOAST COMPONENT 🌟
const Toast = ({ message, type, onClose }) => {
  useEffect(() => { 
    const t = setTimeout(() => onClose(), 2500); 
    return () => clearTimeout(t); 
  }, [onClose]);
  return <div className={`toast toast-${type}`}>{message}</div>;
};

// 🌟 PAGINATION COMPONENT 🌟
const Pagination = ({ currentPage, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  const pages = [];
  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="card p-4 flex justify-between items-center flex-wrap gap-3 mt-4">
      <p className="text-sm text-slate-600">
        Total <b>{totalItems}</b> data • Halaman <b>{currentPage}</b> dari <b>{totalPages}</b>
      </p>
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => onPageChange(1)} 
          disabled={currentPage === 1} 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 touch-btn"
        >«</button>
        <button 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1} 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 touch-btn"
        >← Prev</button>
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-2 border rounded-lg text-sm font-semibold touch-btn ${
              p === currentPage 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >{p}</button>
        ))}
        <button 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages} 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 touch-btn"
        >Next →</button>
        <button 
          onClick={() => onPageChange(totalPages)} 
          disabled={currentPage === totalPages} 
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 touch-btn"
        >»</button>
      </div>
    </div>
  );
};

export default function App() {
  // 🌟 STATE MANAGEMENT 🌟
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [page, setPage] = useState(() => localStorage.getItem('currentPage') || 'dashboard');
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ pasien_hari_ini: 0, obat_populer: [], pasien_per_dokter: [] });
  const [financeData, setFinanceData] = useState({ data: [], pemasukan: [], pengeluaran: [], calendar: {}, total_pemasukan: 0, total_pengeluaran: 0, saldo: 0 });
  
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  
  const [showModal, setShowModal] = useState(null);
  const [editingData, setEditingData] = useState(null);
  const [paymentVisitId, setPaymentVisitId] = useState(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });

  // 🌟 FORM STATES 🌟
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [patientForm, setPatientForm] = useState({ nama: '', nik: '', kota_lahir: '', tgl_lahir: '', jk: 'L', alamat: '', telp: '', gol_darah: '-', alergi: '', kontak_nama: '', kontak_telp: '' });
  const [userForm, setUserForm] = useState({ nama: '', username: '', password: '', role: 'dokter' });
  const [medForm, setMedForm] = useState({ nama: '', kategori: '', stok: 0, harga_beli: 0, harga_jual: 0, expired: '' });
  const [examForm, setExamForm] = useState({ dokter_id: 1, keluhan: '', tensi: '', suhu: '', nadi: '', napas: '', berat: '', tinggi: '', catatan_fisik: '', diagnosa: '', catatan: '', status: 'mengantri' });
  const [paymentForm, setPaymentForm] = useState({ biaya_konsul: 50000, biaya_obat: 0, metode: 'tunai' });
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', confirmPassword: '' });
  
  const [cartObat, setCartObat] = useState([]);
  const [selectedMedId, setSelectedMedId] = useState('');
  const [medQty, setMedQty] = useState(1);
  const [medRule, setMedRule] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('nama');
  const [medSearch, setMedSearch] = useState('');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [financeMonth, setFinanceMonth] = useState(new Date().toISOString().slice(0, 7));

  const [financeFilter, setFinanceFilter] = useState('semua');
  const [financeSort, setFinanceSort] = useState({ column: 'tanggal', order: 'DESC' });

  const [auditFilter, setAuditFilter] = useState({ user_id: '', action_type: '', start_date: '', end_date: '' });
  const [patientSort, setPatientSort] = useState({ column: 'id', order: 'DESC' });

  const [allRecords, setAllRecords] = useState([]);
  const [recordsPagination, setRecordsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [recordsFilter, setRecordsFilter] = useState({ status: '', doctor_id: '', start_date: '', end_date: '' });
  const [recordsSort, setRecordsSort] = useState({ column: 'tanggal_kunjungan', order: 'DESC' });
  const [recordsSearch, setRecordsSearch] = useState('');

  // 🌟 PAGINATION STATES 🌟
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [medicinesPagination, setMedicinesPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [usersPagination, setUsersPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0 });

  // 🌟 RESPONSIVE HOOK 🌟
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth <= 1024;

  // 🌟 EFFECTS 🌟
  useEffect(() => { 
    const timer = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timer); 
  }, []);
  
  useEffect(() => {
    localStorage.setItem('currentPage', page);
  }, [page]);
  
  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  // 🌟 AUTO FETCH SAAT PAGINATION/SEARCH BERUBAH 🌟
  useEffect(() => {
    if (page === 'rm_pasien' && !selectedPatient && isLoggedIn) {
      fetchPatients();
    }
  }, [patientsPagination.page, searchQuery, searchType, page, selectedPatient, isLoggedIn]);

  useEffect(() => {
    if (page === 'pharmacy' && isLoggedIn) {
      fetchMedicines();
    }
  }, [medicinesPagination.page, medSearch, page, isLoggedIn]);

  useEffect(() => {
    if (page === 'users' && isLoggedIn) {
      fetchUsers();
    }
  }, [usersPagination.page, page, isLoggedIn]);

  useEffect(() => {
    if (page === 'audit' && isLoggedIn) {
      fetchAuditLogs();
    }
  }, [auditPagination.page, auditFilter, page, isLoggedIn]);

  const axiosWithUser = () => ({
    headers: {
      'X-User-Id': currentUser?.id || '',
      'X-User-Name': currentUser?.name || 'Guest',
      'X-User-Role': currentUser?.role || ''
    }
  });

  // 🌟 FORMAT FUNCTIONS 🌟
  const formatTimeWIB = (date) => date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDateWIB = (date) => date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const calcAge = (d) => { 
    if (!d) return 0;
    const t = new Date(), b = new Date(d); 
    let a = t.getFullYear() - b.getFullYear(); 
    if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; 
    return a; 
  };

  // 🌟 EXPORT EXCEL 🌟
  const exportToExcel = (data, filename, sheetName = 'Data') => {
    if (!data || data.length === 0) {
      showToast('Tidak ada data untuk di-export', 'warning');
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Data berhasil di-export ke Excel!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Gagal export ke Excel', 'error');
    }
  };

  // 🌟 FETCH FUNCTIONS 🌟
  const fetchPatients = async () => {
    try {
      const res = await axios.get(`${API_URL}/patients?page=${patientsPagination.page}&limit=${patientsPagination.limit}&search=${searchQuery}&search_type=${searchType}`);
      const data = res.data.data || res.data || [];
      setPatients(Array.isArray(data) ? data : []);
      if (res.data.total !== undefined) {
        setPatientsPagination(prev => ({ ...prev, total: res.data.total }));
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchMedicines = async () => {
    try {
      const res = await axios.get(`${API_URL}/medicines?page=${medicinesPagination.page}&limit=${medicinesPagination.limit}&search=${medSearch}`);
      const data = res.data.data || res.data || [];
      setMedicines(Array.isArray(data) ? data : []);
      if (res.data.total !== undefined) {
        setMedicinesPagination(prev => ({ ...prev, total: res.data.total }));
      }
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/users?page=${usersPagination.page}&limit=${usersPagination.limit}`);
      const data = res.data.data || res.data || [];
      setUsers(Array.isArray(data) ? data : []);
      if (res.data.total !== undefined) {
        setUsersPagination(prev => ({ ...prev, total: res.data.total }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchPatients(), fetchMedicines(), fetchUsers()]);
    fetchDashboardStats();
  };
  
  const fetchDashboardStats = async () => { 
    const res = await axios.get(`${API_URL}/dashboard/stats?tanggal=${dashboardDate}`); 
    setDashboardStats(res.data); 
  };
  
  const fetchFinance = async () => { 
    const res = await axios.get(`${API_URL}/finance?month=${financeMonth}`); 
    setFinanceData(res.data); 
  };
  
  const fetchAuditLogs = async () => {
    const params = new URLSearchParams();
    if (auditFilter.user_id) params.append('user_id', auditFilter.user_id);
    if (auditFilter.action_type) params.append('action_type', auditFilter.action_type);
    if (auditFilter.start_date) params.append('start_date', auditFilter.start_date);
    if (auditFilter.end_date) params.append('end_date', auditFilter.end_date);
    params.append('page', auditPagination.page);
    params.append('limit', auditPagination.limit);
    
    try {
      const res = await axios.get(`${API_URL}/audit-logs?${params.toString()}`);
      const data = res.data.data || res.data || [];
      setAuditLogs(Array.isArray(data) ? data : []);
      if (res.data.total !== undefined) {
        setAuditPagination(prev => ({ ...prev, total: res.data.total }));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  const fetchAllRecords = async () => {
    const params = new URLSearchParams();
    if (recordsFilter.status) params.append('status', recordsFilter.status);
    if (recordsFilter.doctor_id) params.append('doctor_id', recordsFilter.doctor_id);
    if (recordsFilter.start_date) params.append('start_date', recordsFilter.start_date);
    if (recordsFilter.end_date) params.append('end_date', recordsFilter.end_date);
    if (recordsSort.column) params.append('sort_by', recordsSort.column);
    if (recordsSort.order) params.append('sort_order', recordsSort.order);
    params.append('page', recordsPagination.page);
    params.append('limit', recordsPagination.limit);
    
    try {
      const res = await axios.get(`${API_URL}/all-medical-records?${params.toString()}`);
      setAllRecords(res.data.data || []);
      setRecordsPagination(prev => ({ ...prev, total: res.data.total || 0 }));
    } catch (error) {
      showToast('Gagal memuat data rekam medis', 'error');
    }
  };

  const handleFinanceSort = (column) => {
    const newOrder = financeSort.column === column && financeSort.order === 'ASC' ? 'DESC' : 'ASC';
    setFinanceSort({ column, order: newOrder });
  };

  const handleSortRecords = (column) => {
    const newOrder = recordsSort.column === column && recordsSort.order === 'ASC' ? 'DESC' : 'ASC';
    setRecordsSort({ column, order: newOrder });
  };

  const handleSortPatient = (column) => {
    const newOrder = patientSort.column === column && patientSort.order === 'ASC' ? 'DESC' : 'ASC';
    setPatientSort({ column, order: newOrder });
  };

  const getSortIcon = (column, sortState) => {
    if (sortState.column !== column) return '↕️';
    return sortState.order === 'ASC' ? '↑' : '↓';
  };

  const robustSort = (arr, column, order, valueExtractor = null) => {
    return [...arr].sort((a, b) => {
      let valA = valueExtractor ? valueExtractor(a) : a[column];
      let valB = valueExtractor ? valueExtractor(b) : b[column];
      if (valA === null || valA === undefined || valA === '') valA = '';
      if (valB === null || valB === undefined || valB === '') valB = '';
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (order === 'ASC') return valA > valB ? 1 : valA < valB ? -1 : 0;
      else return valA < valB ? 1 : valA > valB ? -1 : 0;
    });
  };

  const handleEditRecordFromList = async (record) => {
    const patient = patients.find(p => p.no_rm === record.no_rm);
    if (!patient) {
      showToast('Data pasien tidak ditemukan', 'error');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/patients/${patient.id}/history`);
      const visitData = res.data.find(v => v.visit_id === record.visit_id);
      if (visitData) {
        setSelectedPatient(patient);
        setEditingData(visitData);
        setExamForm({
          dokter_id: visitData.doctor_id, keluhan: visitData.keluhan || '', tensi: visitData.tensi || '',
          suhu: visitData.suhu || '', nadi: visitData.nadi || '', napas: visitData.napas || '',
          berat: visitData.berat || '', tinggi: visitData.tinggi || '', catatan_fisik: visitData.catatan_fisik || '',
          diagnosa: visitData.diagnosa || '', catatan: visitData.catatan || '', status: visitData.status
        });
        setCartObat(visitData.obat || []);
        setShowModal('exam');
      }
    } catch (error) {
      showToast('Gagal memuat detail rekam medis', 'error');
    }
  };

  const handlePayFromList = (record) => {
    setPaymentVisitId(record.visit_id);
    setPaymentForm({ biaya_konsul: 50000, biaya_obat: 0, metode: 'tunai' });
    setShowModal('payment');
  };

  const handleResetPassword = async () => {
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      showToast('Password tidak cocok!', 'error');
      return;
    }
    if (resetPasswordForm.password.length < 4) {
      showToast('Password minimal 4 karakter!', 'error');
      return;
    }
    try {
      await axios.put(`${API_URL}/users/${editingData.id}/password`, { 
        new_password: resetPasswordForm.password 
      }, axiosWithUser());
      showToast('Password berhasil direset!', 'success');
      setShowModal(null);
      setResetPasswordForm({ password: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal reset password', 'error');
    }
  };
  
  useEffect(() => { if (isLoggedIn) fetchDashboardStats(); }, [dashboardDate, isLoggedIn]);
  useEffect(() => { if (page === 'finance') fetchFinance(); }, [financeMonth, page]);
  useEffect(() => { if (page === 'all_records') fetchAllRecords(); }, [page, recordsFilter, recordsSort, recordsPagination.page]);
  useEffect(() => { setRecordsPagination(prev => ({ ...prev, page: 1 })); }, [recordsFilter, recordsSort]);

  // 🌟 CRUD HANDLERS 🌟
  const handleSavePatient = async (e) => { 
    e.preventDefault(); 
    try { 
      const payload = { 
        nama_pasien: patientForm.nama, nik: patientForm.nik, kota_lahir: patientForm.kota_lahir, 
        tanggal_lahir: patientForm.tgl_lahir, jenis_kelamin: patientForm.jk, alamat: patientForm.alamat, 
        no_telepon: patientForm.telp, golongan_darah: patientForm.gol_darah, riwayat_alergi: patientForm.alergi, 
        kontak_darurat_nama: patientForm.kontak_nama, kontak_darurat_telp: patientForm.kontak_telp 
      }; 
      if (editingData) await axios.put(`${API_URL}/patients/${editingData.id}`, payload, axiosWithUser()); 
      else await axios.post(`${API_URL}/patients`, payload, axiosWithUser()); 
      showToast('Pasien disimpan!', 'success'); 
      setShowModal(null); 
      fetchPatients();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal simpan pasien', 'error');
    } 
  };

  const handleDeletePatient = async (id) => { 
    if(!confirm('Hapus pasien?')) return; 
    try {
      await axios.delete(`${API_URL}/patients/${id}`, axiosWithUser()); 
      showToast('Pasien dihapus', 'success'); 
      fetchPatients();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal hapus pasien', 'error');
    }
  };

  const handleViewHistory = async (patient) => { 
    setSelectedPatient(patient); 
    const res = await axios.get(`${API_URL}/patients/${patient.id}/history`); 
    setPatientHistory(res.data); 
  };

  const handleSaveExam = async (e) => { 
  e.preventDefault(); 
  
  try { 
    const payload = { 
      patient_id: selectedPatient.id,
      dokter_id: examForm.dokter_id,
      keluhan: examForm.keluhan,
      tensi: examForm.tensi,
      suhu: examForm.suhu,
      nadi: examForm.nadi,
      napas: examForm.napas,
      berat: examForm.berat,
      tinggi: examForm.tinggi,
      catatan_fisik: examForm.catatan_fisik,
      diagnosa: examForm.diagnosa,
      catatan: examForm.catatan,
      status: examForm.status,
      // 🌟 FORMAT OBAT DENGAN BENAR 🌟
      obat_list: cartObat.map(o => ({
        medicine_id: parseInt(o.medicine_id),
        jumlah: parseInt(o.jumlah) || 1,
        aturan: o.aturan || ''
      }))
    };
    
    console.log('Saving examination with obat_list:', payload.obat_list);
    
    if (editingData) {
      await axios.put(`${API_URL}/examination/${editingData.visit_id}`, payload, axiosWithUser()); 
    } else {
      await axios.post(`${API_URL}/examination`, payload, axiosWithUser()); 
    }
    
    showToast('Rekam medis disimpan!', 'success'); 
    setShowModal(null); 
    setCartObat([]); 
    
    if (page === 'rm_pasien') handleViewHistory(selectedPatient);
    if (page === 'all_records') fetchAllRecords();
    fetchMedicines();
  } catch (err) { 
    console.error('Error save exam:', err);
    showToast(err.response?.data?.error || 'Gagal simpan RM', 'error'); 
  } 
};
  
  const handleStartEdit = (h) => {
    setEditingData(h);
    setExamForm({ 
      dokter_id: h.doctor_id, keluhan: h.keluhan || '', tensi: h.tensi || '', 
      suhu: h.suhu || '', nadi: h.nadi || '', napas: h.napas || '', 
      berat: h.berat || '', tinggi: h.tinggi || '', catatan_fisik: h.catatan_fisik || '', 
      diagnosa: h.diagnosa || '', catatan: h.catatan || '', status: h.status 
    });
    setCartObat(h.obat || []);
    setShowModal('exam');
  };

  const handlePay = async () => { 
    const grandTotal = (parseInt(paymentForm.biaya_konsul) || 0) + (parseInt(paymentForm.biaya_obat) || 0); 
    try { 
      await axios.post(`${API_URL}/transactions`, { 
        visit_id: paymentVisitId, total_biaya_konsultasi: paymentForm.biaya_konsul, 
        total_biaya_obat: paymentForm.biaya_obat, grand_total: grandTotal, metode_bayar: paymentForm.metode 
      }, axiosWithUser()); 
      showToast('Pembayaran berhasil!', 'success'); 
      setShowModal(null); 
      if (page === 'rm_pasien' && selectedPatient) handleViewHistory(selectedPatient);
      if (page === 'all_records') fetchAllRecords();
      fetchFinance(); 
    } catch (err) { 
      showToast(err.response?.data?.error || 'Gagal bayar', 'error'); 
    } 
  };

  const handleSaveUser = async (e) => { 
  e.preventDefault(); 
  
  // 🌟 VALIDASI FIELD WAJIB 🌟
  if (!userForm.nama || !userForm.username || !userForm.role) {
    showToast('Nama, username, dan role wajib diisi!', 'error');
    return;
  }
  
  try { 
    const payload = {
      nama_lengkap: userForm.nama,
      username: userForm.username,
      role: userForm.role
    };
    
    // 🌟 TAMBAH PASSWORD HANYA JIKA ADA 🌟
    if (userForm.password) {
      payload.password = userForm.password;
    }
    
    if (editingData) {
      await axios.put(`${API_URL}/users/${editingData.id}`, payload, axiosWithUser()); 
    } else {
      await axios.post(`${API_URL}/users`, payload, axiosWithUser()); 
    }
    
    showToast('User disimpan!', 'success'); 
    setShowModal(null); 
    setUserForm({ nama: '', username: '', password: '', role: 'dokter' });
    fetchUsers();
  } catch (err) { 
    showToast(err.response?.data?.error || 'Gagal simpan user', 'error'); 
  } 
};

  const handleDeleteUser = async (id) => { 
    if(!confirm('Hapus user?')) return; 
    try {
      await axios.delete(`${API_URL}/users/${id}`, axiosWithUser()); 
      showToast('User dihapus', 'success'); 
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal hapus user', 'error');
    }
  };

  const handleSaveMed = async (e) => { 
    e.preventDefault(); 
    try { 
      if (editingData) await axios.put(`${API_URL}/medicines/${editingData.id}`, { 
        nama_obat: medForm.nama, kategori: medForm.kategori, stok: medForm.stok, 
        harga_beli: medForm.harga_beli, harga_jual: medForm.harga_jual, tanggal_kedaluwarsa: medForm.expired 
      }, axiosWithUser()); 
      else await axios.post(`${API_URL}/medicines`, { 
        nama_obat: medForm.nama, kategori: medForm.kategori, stok: medForm.stok, 
        harga_beli: medForm.harga_beli, harga_jual: medForm.harga_jual, tanggal_kedaluwarsa: medForm.expired 
      }, axiosWithUser()); 
      showToast('Obat disimpan!', 'success'); 
      setShowModal(null); 
      fetchMedicines();
    } catch (err) { 
      showToast(err.response?.data?.error || 'Gagal simpan obat', 'error'); 
    } 
  };

  const handleDeleteMed = async (id) => { 
    if(!confirm('Hapus obat?')) return; 
    try {
      await axios.delete(`${API_URL}/medicines/${id}`, axiosWithUser()); 
      showToast('Obat dihapus', 'success'); 
      fetchMedicines();
    } catch (err) {
      showToast(err.response?.data?.error || 'Gagal hapus obat', 'error');
    }
  };

  // 🌟 SORT PASIEN (CLIENT-SIDE untuk data yang sudah di-fetch) 🌟
  const filteredAndSortedPatients = robustSort(
    patients, patientSort.column, patientSort.order,
    (p) => patientSort.column === 'umur' ? calcAge(p.tanggal_lahir) : p[patientSort.column]
  );

  // 🌟 MENU ITEMS 🌟
  const menuItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', shortLabel: 'Home' },
    { id: 'rm_pasien', icon: '🏥', label: 'Rekam Medis Pasien', shortLabel: 'Pasien' },
    { id: 'all_records', icon: '📋', label: 'List Rekam Medis', shortLabel: 'RM' },
    { id: 'pharmacy', icon: '💊', label: 'Obat', shortLabel: 'Obat' },
    { id: 'finance', icon: '💰', label: 'Keuangan', shortLabel: 'Keuangan' },
    ...(currentUser?.role === 'admin' ? [
      { id: 'users', icon: '⚙️', label: 'Manage User', shortLabel: 'User' },
      { id: 'audit', icon: '📝', label: 'Audit Log', shortLabel: 'Log' }
    ] : [])
  ];

  // 🌟 LOGIN PAGE 🌟
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="card p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">DI</div>
            <h1 className="text-2xl font-bold text-slate-800">Klinik Pratama Doa Ibu</h1>
          </div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try { 
              const res = await axios.post(`${API_URL}/login`, loginData); 
              if (res.data.success) { 
                setIsLoggedIn(true); 
                setCurrentUser(res.data.user);
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('currentUser', JSON.stringify(res.data.user));
                fetchData(); 
                showToast('Login berhasil!', 'success'); 
              } 
            } catch { 
              showToast('Username/Password salah!', 'error'); 
            }
          }} className="space-y-4">
            <input type="text" placeholder="Username" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} required />
            <input type="password" placeholder="Password" className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} required />
            <button type="submit" className="btn-primary w-full">Masuk</button>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // 🌟 MAIN LAYOUT 🌟
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 🌟 DESKTOP SIDEBAR 🌟 */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col desktop-sidebar">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold">DI</div>
            <div>
              <h2 className="font-bold text-slate-800">Klinik Doa Ibu</h2>
              <p className="text-xs text-slate-500">Stabat, Langkat</p>
            </div>
          </div>
        </div>
        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => { setPage(item.id); setSelectedPatient(null); }} className={`w-full text-left px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${page === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold">{currentUser?.name?.charAt(0)}</div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser?.role}</p>
            </div>
          </div>
          <button onClick={() => {
            setIsLoggedIn(false);
            setCurrentUser(null);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentPage');
            showToast('Logout berhasil', 'info');
          }} className="w-full bg-red-50 text-red-600 py-2 rounded-xl text-sm font-semibold hover:bg-red-100">Logout</button>
        </div>
      </aside>

      {/* 🌟 MOBILE TOP BAR 🌟 */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-40 px-4 flex items-center justify-between" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-top))', paddingTop: 'calc(12px + env(safe-area-inset-top))' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">DI</div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Klinik Doa Ibu</h2>
              <p className="text-xs text-slate-500">{currentUser?.name}</p>
            </div>
          </div>
          <button onClick={() => {
            setIsLoggedIn(false);
            setCurrentUser(null);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('currentPage');
            showToast('Logout berhasil', 'info');
          }} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold">Logout</button>
        </div>
      )}

      {/* 🌟 MOBILE BOTTOM NAV 🌟 */}
      <nav className="bottom-nav">
        {menuItems.slice(0, 5).map(item => (
          <button 
            key={item.id} 
            onClick={() => { setPage(item.id); setSelectedPatient(null); }} 
            className={`bottom-nav-item ${page === item.id ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* 🌟 MAIN CONTENT 🌟 */}
      <main className={`flex-grow overflow-auto main-content ${isMobile ? 'pt-20' : 'p-8'}`}>
        
        {/* 🌟 DASHBOARD 🌟 */}
        {page === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <div className="text-right">
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{formatTimeWIB(currentTime)} WIB</p>
                <p className="text-xs md:text-sm text-slate-500">{formatDateWIB(currentTime)}</p>
              </div>
            </div>
            <div className="card p-4 mb-6 flex gap-4 items-center flex-wrap">
              <label className="text-sm font-semibold text-slate-700">Filter Tanggal:</label>
              <input type="date" className="flex-grow md:flex-none px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={dashboardDate} onChange={e => setDashboardDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="card p-6"><p className="text-slate-500 text-sm">Pasien Hari Ini</p><p className="text-3xl font-bold text-blue-600 mt-2">{dashboardStats.pasien_hari_ini}</p></div>
              <div className="card p-6"><p className="text-slate-500 text-sm">Total Pasien</p><p className="text-3xl font-bold text-emerald-600 mt-2">{patientsPagination.total || patients.length}</p></div>
              <div className="card p-6"><p className="text-slate-500 text-sm">Total Obat</p><p className="text-3xl font-bold text-purple-600 mt-2">{medicinesPagination.total || medicines.length}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="font-bold text-slate-800 mb-4">Obat Populer</h3>
                {dashboardStats.obat_populer?.length > 0 ? dashboardStats.obat_populer.map((o, i) => (
                  <div key={i} className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">{o.nama_obat}</span>
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">{o.total}x</span>
                  </div>
                )) : <p className="text-slate-400 text-sm">Belum ada data.</p>}
              </div>
              <div className="card p-6">
                <h3 className="font-bold text-slate-800 mb-4">Pasien per Dokter</h3>
                {dashboardStats.pasien_per_dokter?.length > 0 ? dashboardStats.pasien_per_dokter.map((d, i) => (
                  <div key={i} className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">{d.nama_lengkap}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold">{d.total} pasien</span>
                  </div>
                )) : <p className="text-slate-400 text-sm">Belum ada data.</p>}
              </div>
            </div>
          </div>
        )}

        {/* 🌟 AUDIT LOG 🌟 */}
        {page === 'audit' && currentUser?.role === 'admin' && (
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-6">Audit Log - Activity Tracking</h1>
            <div className="card p-4 mb-6">
              <h3 className="font-semibold text-slate-700 mb-3">Filter Log</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">User</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={auditFilter.user_id} onChange={e => setAuditFilter({...auditFilter, user_id: e.target.value})}>
                    <option value="">Semua User</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.nama_lengkap}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tipe Aksi</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={auditFilter.action_type} onChange={e => setAuditFilter({...auditFilter, action_type: e.target.value})}>
                    <option value="">Semua Aksi</option>
                    <option value="login">Login</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dari Tanggal</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={auditFilter.start_date} onChange={e => setAuditFilter({...auditFilter, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sampai Tanggal</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={auditFilter.end_date} onChange={e => setAuditFilter({...auditFilter, end_date: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="card overflow-hidden mobile-card-view">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Waktu</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Target</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Tidak ada log aktivitas</td></tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-700">{new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{log.user_name || 'Guest'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.action_type === 'login' ? 'bg-blue-100 text-blue-700' :
                            log.action_type === 'create' ? 'bg-emerald-100 text-emerald-700' :
                            log.action_type === 'update' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{log.action_type.toUpperCase()}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{log.target_table} #{log.target_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{log.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="card-list p-4 space-y-3">
                {auditLogs.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Tidak ada log aktivitas</p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.action_type === 'login' ? 'bg-blue-100 text-blue-700' :
                          log.action_type === 'create' ? 'bg-emerald-100 text-emerald-700' :
                          log.action_type === 'update' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{log.action_type.toUpperCase()}</span>
                        <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</span>
                      </div>
                      <p className="font-semibold text-slate-800 mb-1">{log.user_name || 'Guest'}</p>
                      <p className="text-xs text-slate-500 mb-1">{log.target_table} #{log.target_id}</p>
                      <p className="text-sm text-slate-700">{log.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Pagination 
              currentPage={auditPagination.page}
              totalPages={Math.ceil(auditPagination.total / auditPagination.limit)}
              totalItems={auditPagination.total}
              onPageChange={(newPage) => setAuditPagination(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}

        {/* 🌟 KEUANGAN 🌟 */}
        {page === 'finance' && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">Keuangan</h1>
              <div className="flex gap-2 flex-wrap-mobile">
                <input type="month" className="px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 touch-btn" value={financeMonth} onChange={e => setFinanceMonth(e.target.value)} />
                <button onClick={() => { setEditingData({ tipe: 'pemasukan' }); setShowModal('finance'); }} className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition touch-btn">+ Masuk</button>
                <button onClick={() => { setEditingData({ tipe: 'pengeluaran' }); setShowModal('finance'); }} className="bg-red-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-red-700 transition touch-btn">+ Keluar</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="card p-5" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                <p className="text-sm text-white opacity-90">Total Pemasukan</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-white">{formatRupiah(financeData.total_pemasukan)}</p>
              </div>
              <div className="card p-5" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #e11d48 100%)' }}>
                <p className="text-sm text-white opacity-90">Total Pengeluaran</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-white">{formatRupiah(financeData.total_pengeluaran)}</p>
              </div>
              <div className="card p-5" style={{ background: financeData.saldo >= 0 
                ? 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)' 
                : 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)' }}>
                <p className="text-sm text-white opacity-90">Saldo Bersih</p>
                <p className="text-2xl md:text-3xl font-bold mt-2 text-white">{formatRupiah(financeData.saldo)}</p>
              </div>
            </div>

            <div className="card p-4 md:p-6 mb-6">
              <h3 className="font-bold text-slate-800 mb-4">📅 Kalender Keuangan</h3>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="min-w-[600px] md:min-w-0">
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center font-semibold text-slate-500 text-sm">
                    <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div><div>Min</div>
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {(() => {
                      const [year, month] = financeMonth.split('-').map(Number);
                      const firstDay = new Date(year, month - 1, 1).getDay();
                      const daysInMonth = new Date(year, month, 0).getDate();
                      const cells = [];
                      const startOffset = (firstDay + 6) % 7;
                      for (let i = 0; i < startOffset; i++) cells.push(<div key={`e-${i}`} className="p-2"></div>);
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const dayData = financeData.calendar?.[dateStr] || { pemasukan: 0, pengeluaran: 0 };
                        cells.push(
                          <div key={d} className="border border-slate-200 rounded-lg p-2 min-h-[80px] md:min-h-[90px] flex flex-col bg-white hover:border-blue-300 transition">
                            <span className="text-sm font-semibold text-slate-700">{d}</span>
                            <div className="mt-auto space-y-1">
                              {dayData.pemasukan > 0 && (
                                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1 rounded text-center truncate">
                                  +{formatRupiah(dayData.pemasukan).replace('Rp ', '')}
                                </div>
                              )}
                              {dayData.pengeluaran > 0 && (
                                <div className="text-xs font-bold text-red-600 bg-red-50 px-1 rounded text-center truncate">
                                  -{formatRupiah(dayData.pengeluaran).replace('Rp ', '')}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-4 md:p-6">
              <div className="flex justify-between items-center mb-4 mobile-header-action">
                <h3 className="font-bold text-slate-800">📋 Rincian Transaksi</h3>
                <button onClick={() => exportToExcel(financeData.data || [], 'keuangan_' + financeMonth, 'Transaksi')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition text-sm touch-btn">📥 Export</button>
              </div>

              <div className="flex gap-2 mb-4 border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setFinanceFilter('semua')} className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap ${financeFilter === 'semua' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  Semua ({financeData.data?.length || 0})
                </button>
                <button onClick={() => setFinanceFilter('pemasukan')} className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap ${financeFilter === 'pemasukan' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  Pemasukan ({financeData.pemasukan?.length || 0})
                </button>
                <button onClick={() => setFinanceFilter('pengeluaran')} className={`px-4 py-2 font-semibold text-sm transition whitespace-nowrap ${financeFilter === 'pengeluaran' ? 'text-red-600 border-b-2 border-red-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  Pengeluaran ({financeData.pengeluaran?.length || 0})
                </button>
              </div>

              <div className="overflow-x-auto mobile-card-view">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleFinanceSort('tanggal')}>Tanggal {getSortIcon('tanggal', financeSort)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleFinanceSort('kategori')}>Kategori {getSortIcon('kategori', financeSort)}</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleFinanceSort('nominal')}>Nominal {getSortIcon('nominal', financeSort)}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Keterangan</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Tipe</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      let filtered = financeData.data || [];
                      if (financeFilter === 'pemasukan') filtered = filtered.filter(t => t.tipe === 'pemasukan');
                      if (financeFilter === 'pengeluaran') filtered = filtered.filter(t => t.tipe === 'pengeluaran');
                      const sorted = [...filtered].sort((a, b) => {
                        let valA, valB;
                        if (financeSort.column === 'tanggal') {
                          valA = new Date(a.tanggal_transaksi || a.tanggal_kunjungan || 0);
                          valB = new Date(b.tanggal_transaksi || b.tanggal_kunjungan || 0);
                        } else if (financeSort.column === 'kategori') {
                          valA = (a.kategori || '').toLowerCase();
                          valB = (b.kategori || '').toLowerCase();
                        } else if (financeSort.column === 'nominal') {
                          valA = parseFloat(a.grand_total || 0);
                          valB = parseFloat(b.grand_total || 0);
                        }
                        if (valA < valB) return financeSort.order === 'ASC' ? -1 : 1;
                        if (valA > valB) return financeSort.order === 'ASC' ? 1 : -1;
                        return 0;
                      });
                      if (sorted.length === 0) {
                        return <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-400">Tidak ada transaksi</td></tr>;
                      }
                      return sorted.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">{formatTanggalPendek(t.tanggal_transaksi || t.tanggal_kunjungan)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${t.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.kategori}</span>
                          </td>
                          <td className={`px-4 py-3 text-sm font-bold text-right ${t.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {t.tipe === 'pengeluaran' ? '-' : '+'}{formatRupiah(t.grand_total)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate hidden md:table-cell">{t.keterangan || '-'}</td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className={`text-xs font-semibold ${t.tipe === 'pemasukan' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {t.tipe === 'pemasukan' ? '↗️ Masuk' : '↘️ Keluar'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.visit_id ? (
                              <span className="text-xs text-slate-400">Otomatis</span>
                            ) : (
                              <button onClick={async () => {
                                if (!confirm('Hapus transaksi ini?')) return;
                                try {
                                  await axios.delete(`${API_URL}/finance/${t.id}`, axiosWithUser());
                                  showToast('Transaksi dihapus', 'success');
                                  fetchFinance();
                                } catch (err) {
                                  showToast('Gagal hapus', 'error');
                                }
                              }} className="text-xs text-red-500 hover:underline touch-btn">Hapus</button>
                            )}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>

                <div className="card-list p-4 space-y-3">
                  {(() => {
                    let filtered = financeData.data || [];
                    if (financeFilter === 'pemasukan') filtered = filtered.filter(t => t.tipe === 'pemasukan');
                    if (financeFilter === 'pengeluaran') filtered = filtered.filter(t => t.tipe === 'pengeluaran');
                    if (filtered.length === 0) return <p className="text-center text-slate-400 py-8">Tidak ada transaksi</p>;
                    return filtered.map(t => (
                      <div key={t.id} className={`rounded-xl p-4 border ${t.tipe === 'pemasukan' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${t.tipe === 'pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{t.kategori}</span>
                          <span className={`text-base font-bold ${t.tipe === 'pemasukan' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {t.tipe === 'pengeluaran' ? '-' : '+'}{formatRupiah(t.grand_total)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{formatTanggalPendek(t.tanggal_transaksi || t.tanggal_kunjungan)}</p>
                        {t.keterangan && <p className="text-sm text-slate-700 mb-2">📝 {t.keterangan}</p>}
                        {!t.visit_id && (
                          <button onClick={async () => {
                            if (!confirm('Hapus transaksi ini?')) return;
                            try {
                              await axios.delete(`${API_URL}/finance/${t.id}`, axiosWithUser());
                              showToast('Transaksi dihapus', 'success');
                              fetchFinance();
                            } catch (err) {
                              showToast('Gagal hapus', 'error');
                            }
                          }} className="text-xs text-red-500 hover:underline touch-btn">🗑️ Hapus</button>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 REKAM MEDIS PASIEN 🌟 */}
        {page === 'rm_pasien' && !selectedPatient && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">Rekam Medis Pasien</h1>
              <div className="flex gap-2 flex-wrap-mobile">
                <button onClick={() => exportToExcel(patients, 'daftar_pasien', 'Pasien')} className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition touch-btn">📥 Export</button>
                <button onClick={() => { setEditingData(null); setPatientForm({ nama: '', nik: '', kota_lahir: '', tgl_lahir: '', jk: 'L', alamat: '', telp: '', gol_darah: '-', alergi: '', kontak_nama: '', kontak_telp: '' }); setShowModal('patient'); }} className="btn-primary touch-btn">+ Tambah</button>
              </div>
            </div>
            <div className="card p-4 mb-6">
              <div className="flex gap-4 mobile-header-action">
                <select value={searchType} onChange={e => setSearchType(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 touch-btn">
                  <option value="nama">Cari Nama</option>
                  <option value="nik">Cari NIK</option>
                  <option value="telp">Cari No. Telp</option>
                </select>
                <input type="text" placeholder="Kata kunci..." className="flex-grow px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 touch-btn" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="card overflow-hidden mobile-card-view">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortPatient('nik')}>NIK {getSortIcon('nik', patientSort)}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortPatient('nama_pasien')}>Nama {getSortIcon('nama_pasien', patientSort)}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hidden md:table-cell" onClick={() => handleSortPatient('tanggal_lahir')}>Tgl Lahir {getSortIcon('tanggal_lahir', patientSort)}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortPatient('umur')}>Umur {getSortIcon('umur', patientSort)}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hidden lg:table-cell" onClick={() => handleSortPatient('no_telepon')}>No. HP {getSortIcon('no_telepon', patientSort)}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAndSortedPatients.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">Tidak ada data pasien</td></tr>
                  ) : (
                    filteredAndSortedPatients.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{p.nik}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{p.nama_pasien}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 hidden md:table-cell">{formatTanggal(p.tanggal_lahir)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{calcAge(p.tanggal_lahir)} th</td>
                        <td className="px-6 py-4 text-sm text-slate-700 hidden lg:table-cell">{p.no_telepon || '-'}</td>
                        <td className="px-6 py-4 flex gap-2 flex-wrap">
                          <button onClick={() => handleViewHistory(p)} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-100 touch-btn">Buka RM</button>
                          <button onClick={() => { 
                            setEditingData(p); 
                            setPatientForm({ 
                              nama: p.nama_pasien, nik: p.nik, kota_lahir: p.kota_lahir || '', 
                              tgl_lahir: p.tanggal_lahir ? new Date(p.tanggal_lahir).toISOString().split('T')[0] : '', 
                              jk: p.jenis_kelamin, alamat: p.alamat || '', telp: p.no_telepon || '', 
                              gol_darah: p.golongan_darah || '-', alergi: p.riwayat_alergi || '', 
                              kontak_nama: p.kontak_darurat_nama || '', kontak_telp: p.kontak_darurat_telp || '' 
                            }); 
                            setShowModal('patient'); 
                          }} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-amber-100 touch-btn">Edit</button>
                          <button onClick={() => handleDeletePatient(p.id)} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-100 touch-btn">Hapus</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="card-list p-4 space-y-3">
                {filteredAndSortedPatients.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Tidak ada data pasien</p>
                ) : (
                  filteredAndSortedPatients.map(p => (
                    <div key={p.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 truncate">{p.nama_pasien}</h3>
                          <p className="text-xs text-slate-500">NIK: {p.nik}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold ml-2">{calcAge(p.tanggal_lahir)} th</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Tanggal Lahir</p>
                          <p className="font-semibold text-slate-700">{formatTanggal(p.tanggal_lahir)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">No. HP</p>
                          <p className="font-semibold text-slate-700 truncate">{p.no_telepon || '-'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleViewHistory(p)} className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">📋 Buka RM</button>
                        <button onClick={() => { 
                          setEditingData(p); 
                          setPatientForm({ 
                            nama: p.nama_pasien, nik: p.nik, kota_lahir: p.kota_lahir || '', 
                            tgl_lahir: p.tanggal_lahir ? new Date(p.tanggal_lahir).toISOString().split('T')[0] : '', 
                            jk: p.jenis_kelamin, alamat: p.alamat || '', telp: p.no_telepon || '', 
                            gol_darah: p.golongan_darah || '-', alergi: p.riwayat_alergi || '', 
                            kontak_nama: p.kontak_darurat_nama || '', kontak_telp: p.kontak_darurat_telp || '' 
                          }); 
                          setShowModal('patient'); 
                        }} className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">✏️ Edit</button>
                        <button onClick={() => handleDeletePatient(p.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Pagination 
              currentPage={patientsPagination.page}
              totalPages={Math.ceil(patientsPagination.total / patientsPagination.limit)}
              totalItems={patientsPagination.total}
              onPageChange={(newPage) => setPatientsPagination(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}

        {/* 🌟 DETAIL PASIEN 🌟 */}
        {page === 'rm_pasien' && selectedPatient && (
          <div>
            <button onClick={() => setSelectedPatient(null)} className="mb-4 text-blue-600 hover:text-blue-800 font-semibold touch-btn">&larr; Kembali</button>
            <div className="card p-6 mb-6">
              <div className="flex justify-between items-start mb-4 mobile-header-action">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{selectedPatient.nama_pasien}</h2>
                  <p className="text-sm text-slate-500 mt-1">No. RM: {selectedPatient.no_rm}</p>
                </div>
                <button onClick={() => { 
                  setEditingData(selectedPatient); 
                  setPatientForm({ 
                    nama: selectedPatient.nama_pasien, nik: selectedPatient.nik, 
                    kota_lahir: selectedPatient.kota_lahir || '', 
                    tgl_lahir: selectedPatient.tanggal_lahir ? new Date(selectedPatient.tanggal_lahir).toISOString().split('T')[0] : '', 
                    jk: selectedPatient.jenis_kelamin, alamat: selectedPatient.alamat || '', 
                    telp: selectedPatient.no_telepon || '', gol_darah: selectedPatient.golongan_darah || '-', 
                    alergi: selectedPatient.riwayat_alergi || '', kontak_nama: selectedPatient.kontak_darurat_nama || '', 
                    kontak_telp: selectedPatient.kontak_darurat_telp || '' 
                  }); 
                  setShowModal('patient'); 
                }} className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-100 touch-btn whitespace-nowrap">Edit Profil</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t pt-4">
                <div><p className="text-xs text-slate-500">NIK</p><p className="font-semibold text-slate-800 break-all">{selectedPatient.nik}</p></div>
                <div><p className="text-xs text-slate-500">Tanggal Lahir</p><p className="font-semibold text-slate-800">{formatTanggal(selectedPatient.tanggal_lahir)} ({calcAge(selectedPatient.tanggal_lahir)} th)</p></div>
                <div><p className="text-xs text-slate-500">No. HP</p><p className="font-semibold text-slate-800">{selectedPatient.no_telepon || '-'}</p></div>
                <div><p className="text-xs text-slate-500">Gol. Darah</p><p className="font-semibold text-slate-800">{selectedPatient.golongan_darah || '-'}</p></div>
              </div>
              {selectedPatient.alamat && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-xs text-slate-500">Alamat</p>
                  <p className="font-semibold text-slate-800">{selectedPatient.alamat}</p>
                </div>
              )}
              {selectedPatient.riwayat_alergi && (
                <div className="mt-4 border-t pt-4">
                  <p className="text-red-600 font-semibold">⚠️ Alergi: {selectedPatient.riwayat_alergi}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-4 mobile-header-action">
              <h3 className="text-lg font-bold text-slate-800">Riwayat Rekam Medis</h3>
              <button onClick={() => { 
                const firstDoc = users.find(u => u.role === 'dokter'); 
                setEditingData(null); 
                setExamForm({ dokter_id: firstDoc ? firstDoc.id : 1, keluhan: '', tensi: '', suhu: '', nadi: '', napas: '', berat: '', tinggi: '', catatan_fisik: '', diagnosa: '', catatan: '', status: 'mengantri' }); 
                setCartObat([]); 
                setShowModal('exam'); 
              }} className="btn-primary touch-btn">+ Buat RM</button>
            </div>
            {patientHistory.length === 0 ? <div className="card p-8 text-center text-slate-400">Belum ada riwayat.</div> : (
              <div className="space-y-3">
                {patientHistory.map(h => (
                  <div key={h.visit_id} className="card p-4 hover:border-blue-300 transition">
                    <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { setEditingData(h); setShowModal('detail'); }}>
                        <p className="font-semibold text-slate-800">{h.tanggal}</p>
                        <p className="text-sm text-blue-600 truncate">Diagnosa: {h.diagnosa || 'Belum diagnosa'}</p>
                        <p className="text-sm text-slate-500 truncate">Keluhan: {h.keluhan || '-'}</p>
                      </div>
                      <span className={`status-badge status-${h.status} whitespace-nowrap`}>{h.status.replace('_', ' ')}</span>
                    </div>
                    {h.status !== 'sudah_bayar' && h.status !== 'batal' && (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={(e) => { e.stopPropagation(); handleStartEdit(h); }} className="flex-1 bg-amber-50 text-amber-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-100 touch-btn">✏️ Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); setPaymentVisitId(h.visit_id); setPaymentForm({ biaya_konsul: 50000, biaya_obat: 0, metode: 'tunai' }); setShowModal('payment'); }} className="flex-1 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-100 touch-btn">💰 Bayar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 🌟 LIST REKAM MEDIS 🌟 */}
        {page === 'all_records' && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">List Rekam Medis</h1>
              <button onClick={() => exportToExcel(allRecords, 'rekam_medis', 'Rekam Medis')} className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition touch-btn">📥 Export</button>
            </div>
            
            <div className="card p-4 mb-6">
              <h3 className="font-semibold text-slate-700 mb-3">🔍 Filter & Pencarian</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Cari (Nama/RM)</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Kata kunci..." value={recordsSearch} onChange={e => setRecordsSearch(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Status</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={recordsFilter.status} onChange={e => setRecordsFilter({...recordsFilter, status: e.target.value})}>
                    <option value="">Semua Status</option>
                    <option value="mengantri">Mengantri</option>
                    <option value="diperiksa">Diperiksa</option>
                    <option value="batal">Batal</option>
                    <option value="sudah_bayar">Sudah Bayar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dokter</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={recordsFilter.doctor_id} onChange={e => setRecordsFilter({...recordsFilter, doctor_id: e.target.value})}>
                    <option value="">Semua Dokter</option>
                    {users.filter(u => u.role === 'dokter').map(d => <option key={d.id} value={d.id}>{d.nama_lengkap}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dari Tanggal</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={recordsFilter.start_date} onChange={e => setRecordsFilter({...recordsFilter, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sampai Tanggal</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" value={recordsFilter.end_date} onChange={e => setRecordsFilter({...recordsFilter, end_date: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="card overflow-hidden mb-4 mobile-card-view">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortRecords('tanggal_kunjungan')}>Tanggal {getSortIcon('tanggal_kunjungan', recordsSort)}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortRecords('nama_pasien')}>Pasien {getSortIcon('nama_pasien', recordsSort)}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">No. RM</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hidden lg:table-cell" onClick={() => handleSortRecords('nama_dokter')}>Dokter {getSortIcon('nama_dokter', recordsSort)}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 hidden lg:table-cell" onClick={() => handleSortRecords('diagnosa_utama')}>Diagnosa {getSortIcon('diagnosa_utama', recordsSort)}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer hover:bg-slate-100" onClick={() => handleSortRecords('status')}>Status {getSortIcon('status', recordsSort)}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    let filtered = allRecords;
                    if (recordsSearch) {
                      const q = recordsSearch.toLowerCase();
                      filtered = filtered.filter(r => r.nama_pasien?.toLowerCase().includes(q) || r.no_rm?.toLowerCase().includes(q));
                    }
                    if (filtered.length === 0) {
                      return <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">Tidak ada data rekam medis</td></tr>;
                    }
                    return filtered.map(r => (
                      <tr key={r.visit_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">{r.tanggal_formatted}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.nama_pasien}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 hidden md:table-cell">{r.no_rm}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 hidden lg:table-cell">{r.nama_dokter}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 hidden lg:table-cell">{r.diagnosa_utama || '-'}</td>
                        <td className="px-4 py-3"><span className={`status-badge status-${r.status}`}>{r.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => { 
                              const patient = patients.find(p => p.no_rm === r.no_rm);
                              if (patient) {
                                axios.get(`${API_URL}/patients/${patient.id}/history`).then(res => {
                                  const visitData = res.data.find(v => v.visit_id === r.visit_id);
                                  if (visitData) { setEditingData(visitData); setShowModal('detail'); }
                                });
                              } else { setEditingData(r); setShowModal('detail'); }
                            }} className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-blue-100 touch-btn">Detail</button>
                            {r.status !== 'sudah_bayar' && r.status !== 'batal' && (
                              <>
                                <button onClick={() => handleEditRecordFromList(r)} className="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-amber-100 touch-btn">Edit</button>
                                <button onClick={() => handlePayFromList(r)} className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg text-xs font-semibold hover:bg-emerald-100 touch-btn">Bayar</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              <div className="card-list p-4 space-y-3">
                {(() => {
                  let filtered = allRecords;
                  if (recordsSearch) {
                    const q = recordsSearch.toLowerCase();
                    filtered = filtered.filter(r => r.nama_pasien?.toLowerCase().includes(q) || r.no_rm?.toLowerCase().includes(q));
                  }
                  if (filtered.length === 0) return <p className="text-center text-slate-400 py-8">Tidak ada data rekam medis</p>;
                  return filtered.map(r => (
                    <div key={r.visit_id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 truncate">{r.nama_pasien}</h3>
                          <p className="text-xs text-slate-500">RM: {r.no_rm}</p>
                        </div>
                        <span className={`status-badge status-${r.status} whitespace-nowrap ml-2`}>{r.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{r.tanggal_formatted}</p>
                      <p className="text-sm text-slate-700 mb-1">👨‍⚕️ {r.nama_dokter}</p>
                      <p className="text-sm text-blue-600 mb-3 truncate">🔬 {r.diagnosa_utama || 'Belum diagnosa'}</p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { 
                          const patient = patients.find(p => p.no_rm === r.no_rm);
                          if (patient) {
                            axios.get(`${API_URL}/patients/${patient.id}/history`).then(res => {
                              const visitData = res.data.find(v => v.visit_id === r.visit_id);
                              if (visitData) { setEditingData(visitData); setShowModal('detail'); }
                            });
                          } else { setEditingData(r); setShowModal('detail'); }
                        }} className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">📋 Detail</button>
                        {r.status !== 'sudah_bayar' && r.status !== 'batal' && (
                          <>
                            <button onClick={() => handleEditRecordFromList(r)} className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">✏️ Edit</button>
                            <button onClick={() => handlePayFromList(r)} className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">💰 Bayar</button>
                          </>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            <Pagination 
              currentPage={recordsPagination.page}
              totalPages={Math.ceil(recordsPagination.total / recordsPagination.limit)}
              totalItems={recordsPagination.total}
              onPageChange={(newPage) => setRecordsPagination(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}

        {/* 🌟 APOTEK 🌟 */}
        {page === 'pharmacy' && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">Manajemen Obat</h1>
              <div className="flex gap-2 flex-wrap-mobile">
                <button onClick={() => exportToExcel(medicines, 'daftar_obat', 'Obat')} className="bg-emerald-600 text-white px-3 py-2 rounded-xl font-semibold hover:bg-emerald-700 transition touch-btn">📥 Export</button>
                <button onClick={() => { setEditingData(null); setMedForm({ nama: '', kategori: '', stok: 0, harga_beli: 0, harga_jual: 0, expired: '' }); setShowModal('med'); }} className="btn-primary touch-btn">+ Tambah</button>
              </div>
            </div>
            <div className="card p-4 mb-6">
              <input type="text" placeholder="Cari nama obat..." className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={medSearch} onChange={e => setMedSearch(e.target.value)} />
            </div>
            <div className="card overflow-hidden mobile-card-view">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Stok</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Harga</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">Tidak ada data obat</td></tr>
                  ) : (
                    medicines.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{m.kode_obat}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{m.nama_obat}</td>
                        <td className={`px-6 py-4 text-sm font-bold ${m.stok < 10 ? 'text-red-600' : 'text-slate-700'}`}>{m.stok}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatRupiah(m.harga_jual)}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button onClick={() => { 
                            setEditingData(m); 
                            setMedForm({ 
                              nama: m.nama_obat, kategori: m.kategori || '', stok: m.stok, 
                              harga_beli: m.harga_beli, harga_jual: m.harga_jual, 
                              expired: m.tanggal_kedaluwarsa ? new Date(m.tanggal_kedaluwarsa).toISOString().split('T')[0] : '' 
                            }); 
                            setShowModal('med'); 
                          }} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-amber-100 touch-btn">Edit</button>
                          <button onClick={() => handleDeleteMed(m.id)} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-100 touch-btn">Hapus</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="card-list p-4 space-y-3">
                {medicines.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Tidak ada obat</p>
                ) : (
                  medicines.map(m => (
                    <div key={m.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 truncate">{m.nama_obat}</h3>
                          <p className="text-xs text-slate-500">{m.kode_obat}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${m.stok < 10 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>Stok: {m.stok}</span>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">💰 {formatRupiah(m.harga_jual)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { 
                          setEditingData(m); 
                          setMedForm({ 
                            nama: m.nama_obat, kategori: m.kategori || '', stok: m.stok, 
                            harga_beli: m.harga_beli, harga_jual: m.harga_jual, 
                            expired: m.tanggal_kedaluwarsa ? new Date(m.tanggal_kedaluwarsa).toISOString().split('T')[0] : '' 
                          }); 
                          setShowModal('med'); 
                        }} className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">✏️ Edit</button>
                        <button onClick={() => handleDeleteMed(m.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">🗑️ Hapus</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Pagination 
              currentPage={medicinesPagination.page}
              totalPages={Math.ceil(medicinesPagination.total / medicinesPagination.limit)}
              totalItems={medicinesPagination.total}
              onPageChange={(newPage) => setMedicinesPagination(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}

        {/* 🌟 USERS 🌟 */}
        {page === 'users' && currentUser?.role === 'admin' && (
          <div>
            <div className="flex justify-between items-center mb-6 mobile-header-action">
              <h1 className="text-2xl font-bold text-slate-800">Manage User</h1>
              <button onClick={() => { setEditingData(null); setUserForm({ nama: '', email: '', password: '', role: 'dokter' }); setShowModal('user'); }} className="btn-primary touch-btn">+ Tambah User</button>
            </div>
            <div className="card overflow-hidden mobile-card-view">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">Tidak ada user</td></tr>
                  ) : (
                    users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{u.nama_lengkap}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{u.username}</td>
                        <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold capitalize">{u.role}</span></td>
                        <td className="px-6 py-4 flex gap-2 flex-wrap">
                          <button onClick={() => { setEditingData(u); setUserForm({ nama: u.nama_lengkap, username: u.username, password: '', role: u.role }); setShowModal('user'); }} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-amber-100 touch-btn">Edit</button>
                          <button onClick={() => { setEditingData(u); setResetPasswordForm({ password: '', confirmPassword: '' }); setShowModal('resetPassword'); }} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-purple-100 touch-btn">Reset</button>
                          <button onClick={() => handleDeleteUser(u.id)} className="bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-100 touch-btn">Hapus</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="card-list p-4 space-y-3">
                {users.length === 0 ? (
                  <p className="text-center text-slate-400 py-8">Tidak ada user</p>
                ) : (
                  users.map(u => (
                    <div key={u.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-800 truncate">{u.nama_lengkap}</h3>
                          <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold capitalize ml-2">{u.role}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setEditingData(u); setUserForm({ nama: u.nama_lengkap, username: u.username, password: '', role: u.role }); setShowModal('user'); }} className="flex-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">✏️ Edit</button>
                        <button onClick={() => { setEditingData(u); setResetPasswordForm({ password: '', confirmPassword: '' }); setShowModal('resetPassword'); }} className="flex-1 bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">🔐 Reset</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold touch-btn">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Pagination 
              currentPage={usersPagination.page}
              totalPages={Math.ceil(usersPagination.total / usersPagination.limit)}
              totalItems={usersPagination.total}
              onPageChange={(newPage) => setUsersPagination(prev => ({ ...prev, page: newPage }))}
            />
          </div>
        )}
      </main>

      {/* 🌟 MODAL PASIEN 🌟 */}
      {showModal === 'patient' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-2xl mx-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-slate-800">{editingData ? 'Edit Profil' : 'Tambah Pasien'}</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
            </div>
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Nama</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={patientForm.nama} onChange={e => setPatientForm({...patientForm, nama: e.target.value})} required /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">NIK</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={patientForm.nik} onChange={e => setPatientForm({...patientForm, nik: e.target.value})} required /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Kota Lahir</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.kota_lahir} onChange={e => setPatientForm({...patientForm, kota_lahir: e.target.value})} /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Tgl Lahir</label><input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.tgl_lahir} onChange={e => setPatientForm({...patientForm, tgl_lahir: e.target.value})} required /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">JK</label><select className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.jk} onChange={e => setPatientForm({...patientForm, jk: e.target.value})}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Gol Darah</label><select className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.gol_darah} onChange={e => setPatientForm({...patientForm, gol_darah: e.target.value})}><option value="-">-</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option></select></div>
              </div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Alamat</label><textarea className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" rows="2" value={patientForm.alamat} onChange={e => setPatientForm({...patientForm, alamat: e.target.value})}></textarea></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">No. HP</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.telp} onChange={e => setPatientForm({...patientForm, telp: e.target.value})} /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Alergi</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none text-red-600" value={patientForm.alergi} onChange={e => setPatientForm({...patientForm, alergi: e.target.value})} /></div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-800 mb-3">Kontak Darurat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Nama</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.kontak_nama} onChange={e => setPatientForm({...patientForm, kontak_nama: e.target.value})} /></div>
                  <div><label className="text-sm font-semibold text-slate-700 mb-1 block">No. Telp</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={patientForm.kontak_telp} onChange={e => setPatientForm({...patientForm, kontak_telp: e.target.value})} /></div>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 MODAL REKAM MEDIS - SCROLLABLE 🌟 */}
{showModal === 'exam' && (
  <div className="modal-overlay" onClick={() => setShowModal(null)}>
    <div className="card w-full max-w-3xl mx-4" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Sticky */}
      <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-white sticky top-0 z-10">
        <h2 className="text-lg md:text-xl font-bold text-slate-800">
          {editingData ? 'Edit Rekam Medis' : 'Buat Rekam Medis'}
        </h2>
        <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
      </div>
      
      {/* Content Scrollable */}
      <form onSubmit={handleSaveExam} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Dokter</label>
            <select className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={examForm.dokter_id} onChange={e => setExamForm({...examForm, dokter_id: e.target.value})}>
              {users.filter(u => u.role === 'dokter').map(d => <option key={d.id} value={d.id}>{d.nama_lengkap}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Status</label>
            <select className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={examForm.status} onChange={e => setExamForm({...examForm, status: e.target.value})}>
              <option value="mengantri">Mengantri</option>
              <option value="diperiksa">Diperiksa</option>
              <option value="batal">Batal</option>
              <option value="sudah_bayar">Sudah Bayar</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Keluhan Utama</label>
          <textarea className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" rows="2" value={examForm.keluhan} onChange={e => setExamForm({...examForm, keluhan: e.target.value})}></textarea>
        </div>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Pemeriksaan Fisik</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="text-xs text-slate-500">Tensi</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.tensi} onChange={e => setExamForm({...examForm, tensi: e.target.value})} /></div>
            <div><label className="text-xs text-slate-500">Suhu</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.suhu} onChange={e => setExamForm({...examForm, suhu: e.target.value})} /></div>
            <div><label className="text-xs text-slate-500">Nadi</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.nadi} onChange={e => setExamForm({...examForm, nadi: e.target.value})} /></div>
            <div><label className="text-xs text-slate-500">Napas</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.napas} onChange={e => setExamForm({...examForm, napas: e.target.value})} /></div>
            <div><label className="text-xs text-slate-500">Berat</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.berat} onChange={e => setExamForm({...examForm, berat: e.target.value})} /></div>
            <div><label className="text-xs text-slate-500">Tinggi</label><input type="text" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={examForm.tinggi} onChange={e => setExamForm({...examForm, tinggi: e.target.value})} /></div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-slate-500">Catatan Fisik</label>
            <textarea className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" rows="2" value={examForm.catatan_fisik} onChange={e => setExamForm({...examForm, catatan_fisik: e.target.value})}></textarea>
          </div>
        </div>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Diagnosa</label>
          <input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={examForm.diagnosa} onChange={e => setExamForm({...examForm, diagnosa: e.target.value})} />
        </div>
        
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Catatan Dokter</label>
          <textarea className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" rows="2" value={examForm.catatan} onChange={e => setExamForm({...examForm, catatan: e.target.value})}></textarea>
        </div>
        
        <div className="border-t pt-4">
          <label className="text-sm font-semibold text-slate-700 mb-2 block">Resep Obat</label>
          <div className="flex gap-2 items-end flex-wrap">
            <select className="flex-grow px-4 py-2 border border-slate-200 rounded-xl outline-none min-w-[200px]" value={selectedMedId} onChange={e => setSelectedMedId(e.target.value)}>
              <option value="">-- Pilih Obat --</option>
              {medicines.map(m => <option key={m.id} value={m.id}>{m.nama_obat} (Stok: {m.stok})</option>)}
            </select>
            <input type="number" min="1" placeholder="Jml" className="w-20 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none" value={medQty} onChange={e => setMedQty(e.target.value)} />
            <input type="text" placeholder="3x1" className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none" value={medRule} onChange={e => setMedRule(e.target.value)} />
            <button 
  type="button" 
  onClick={() => { 
    if(!selectedMedId) {
      showToast('Pilih obat dulu!', 'warning');
      return;
    }
    
    const med = medicines.find(m => m.id === parseInt(selectedMedId));
    if (!med) {
      showToast('Obat tidak ditemukan!', 'error');
      return;
    }
    
    const newObat = {
      medicine_id: med.id,
      nama: med.nama_obat,
      jumlah: parseInt(medQty) || 1,
      aturan: medRule || '-'
    };
    
    console.log('Menambahkan obat:', newObat);
    
    setCartObat([...cartObat, newObat]);
    setSelectedMedId('');
    setMedQty(1);
    setMedRule('');
    
    showToast(`Obat ${med.nama_obat} ditambahkan!`, 'success');
  }} 
  className="bg-slate-100 px-4 py-2 rounded-xl font-semibold hover:bg-slate-200 touch-btn"
>
  +
</button>
          </div>
          {cartObat.length > 0 && (
            <ul className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {cartObat.map((o, i) => (
                <li key={i} className="flex justify-between text-sm mb-1">
                  <span>💊 {o.nama} - {o.jumlah} unit ({o.aturan})</span>
                  <button type="button" onClick={() => setCartObat(cartObat.filter((_, idx) => idx !== i))} className="text-red-500 touch-btn">x</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Tombol Simpan Sticky di Bawah */}
        <div className="sticky bottom-0 bg-white pt-4 pb-2 -mx-4 px-4 md:-mx-6 md:px-6 border-t border-slate-100">
          <button type="submit" className="btn-primary w-full">💾 Simpan Rekam Medis</button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* 🌟 MODAL DETAIL 🌟 */}
      {showModal === 'detail' && editingData && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-3xl mx-4" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0 bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-800">📋 Detail Rekam Medis</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="flex justify-between items-center pb-4 border-b flex-wrap gap-2">
                <div>
                  <p className="text-sm text-slate-500">Tanggal Kunjungan</p>
                  <p className="font-bold text-lg text-slate-800">{editingData.tanggal || editingData.tanggal_formatted}</p>
                </div>
                <span className={`status-badge status-${editingData.status}`}>{editingData.status.replace('_', ' ')}</span>
              </div>

              {(editingData.nama_pasien || editingData.no_rm) && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-800 mb-2">👤 Data Pasien</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <p>Nama: <b>{editingData.nama_pasien || '-'}</b></p>
                    <p>No. RM: <b>{editingData.no_rm || '-'}</b></p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-xl">
                <h3 className="font-semibold text-slate-800 mb-3">🩺 Pemeriksaan Fisik</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Tekanan Darah</p><p className="font-bold text-slate-800">{editingData.tensi || '-'}</p></div>
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Suhu Tubuh</p><p className="font-bold text-slate-800">{editingData.suhu || '-'}°C</p></div>
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Denyut Nadi</p><p className="font-bold text-slate-800">{editingData.nadi || '-'}/mnt</p></div>
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Pernapasan</p><p className="font-bold text-slate-800">{editingData.napas || '-'}/mnt</p></div>
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Berat Badan</p><p className="font-bold text-slate-800">{editingData.berat || '-'} kg</p></div>
                  <div className="bg-white p-3 rounded-lg border"><p className="text-xs text-slate-500">Tinggi Badan</p><p className="font-bold text-slate-800">{editingData.tinggi || '-'} cm</p></div>
                </div>
                {editingData.catatan_fisik && (
                  <div className="mt-3 bg-white p-3 rounded-lg border">
                    <p className="text-xs text-slate-500 mb-1">Catatan Kondisi Fisik</p>
                    <p className="text-sm text-slate-700">{editingData.catatan_fisik}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">📝 Keluhan Utama</h3>
                <div className="bg-amber-50 p-4 rounded-xl border-l-4 border-amber-400">
                  <p className="text-sm text-slate-700">{editingData.keluhan || editingData.keluhan_utama || 'Tidak ada keluhan'}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-800 mb-2">🔬 Diagnosa Dokter</h3>
                <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-500">
                  <p className="text-base font-bold text-blue-700">{editingData.diagnosa || editingData.diagnosa_utama || 'Belum ada diagnosa'}</p>
                </div>
              </div>

              {(editingData.catatan || editingData.catatan_dokter) && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">👨‍⚕️ Catatan Dokter</h3>
                  <div className="bg-purple-50 p-4 rounded-xl border-l-4 border-purple-400">
                    <p className="text-sm text-slate-700">{editingData.catatan || editingData.catatan_dokter}</p>
                  </div>
                </div>
              )}

              {editingData.obat && editingData.obat.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">💊 Resep Obat ({editingData.obat.length} item)</h3>
                  <div className="bg-emerald-50 p-4 rounded-xl">
                    <div className="space-y-2">
                      {editingData.obat.map((o, i) => (
                        <div key={i} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800">💊 {o.nama}</p>
                            <p className="text-xs text-slate-500 mt-1">Aturan: <b>{o.aturan || '-'}</b></p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-bold ml-2">{o.jumlah} unit</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editingData.total_pembayaran && editingData.status === 'sudah_bayar' && (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 rounded-xl text-white">
                  <p className="text-sm opacity-80">Total Pembayaran</p>
                  <p className="text-2xl font-bold mt-1">{formatRupiah(editingData.total_pembayaran)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL PEMBAYARAN 🌟 */}
      {showModal === 'payment' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Pembayaran</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Biaya Konsul</label><input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={paymentForm.biaya_konsul} onChange={e => setPaymentForm({...paymentForm, biaya_konsul: e.target.value})} /></div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Biaya Obat</label><input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={paymentForm.biaya_obat} onChange={e => setPaymentForm({...paymentForm, biaya_obat: e.target.value})} /></div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Metode</label><select className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={paymentForm.metode} onChange={e => setPaymentForm({...paymentForm, metode: e.target.value})}><option value="tunai">Tunai</option><option value="transfer">Transfer</option><option value="qris">QRIS</option></select></div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-blue-700">{formatRupiah((parseInt(paymentForm.biaya_konsul) || 0) + (parseInt(paymentForm.biaya_obat) || 0))}</p>
              </div>
              <button onClick={handlePay} className="btn-primary w-full !bg-emerald-600 hover:!bg-emerald-700">💳 Proses</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL USER 🌟 */}
      {showModal === 'user' && (
  <div className="modal-overlay" onClick={() => setShowModal(null)}>
    <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{editingData ? 'Edit User' : 'Tambah User'}</h2>
        <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
      </div>
      <form onSubmit={handleSaveUser} className="p-6 space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Nama</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" 
            value={userForm.nama} 
            onChange={e => setUserForm({...userForm, nama: e.target.value})} 
            required 
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Username</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" 
            value={userForm.username} 
            onChange={e => setUserForm({...userForm, username: e.target.value})} 
            required 
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">
            Password {editingData ? '(Kosongkan jika tidak diubah)' : ''}
          </label>
          <input 
            type="password" 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" 
            value={userForm.password} 
            onChange={e => setUserForm({...userForm, password: e.target.value})} 
            required={!editingData}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-1 block">Role</label>
          <select 
            className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" 
            value={userForm.role} 
            onChange={e => setUserForm({...userForm, role: e.target.value})}
          >
            <option value="admin">Admin</option>
            <option value="dokter">Dokter</option>
            <option value="perawat">Perawat</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full">Simpan</button>
      </form>
    </div>
  </div>
)}

      {/* 🌟 MODAL RESET PASSWORD 🌟 */}
      {showModal === 'resetPassword' && editingData && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">🔐 Reset Password</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-slate-600">User</p>
                <p className="font-bold text-slate-800">{editingData.nama_lengkap}</p>
                <p className="text-xs text-slate-500 mt-1">@{editingData.username}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Password Baru</label>
                <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={resetPasswordForm.password} onChange={e => setResetPasswordForm({...resetPasswordForm, password: e.target.value})} placeholder="Minimal 4 karakter" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Konfirmasi Password</label>
                <input type="password" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" value={resetPasswordForm.confirmPassword} onChange={e => setResetPasswordForm({...resetPasswordForm, confirmPassword: e.target.value})} placeholder="Ulangi password" required />
              </div>
              <button onClick={handleResetPassword} className="btn-primary w-full !bg-purple-600 hover:!bg-purple-700">🔐 Reset Password</button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODAL OBAT 🌟 */}
      {showModal === 'med' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingData ? 'Edit Obat' : 'Tambah Obat'}</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl text-slate-400 touch-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveMed} className="p-6 space-y-4">
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Nama Obat</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.nama} onChange={e => setMedForm({...medForm, nama: e.target.value})} required /></div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Kategori</label><input type="text" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.kategori} onChange={e => setMedForm({...medForm, kategori: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Stok</label><input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.stok} onChange={e => setMedForm({...medForm, stok: e.target.value})} required /></div>
                <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Hrg Beli</label><input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.harga_beli} onChange={e => setMedForm({...medForm, harga_beli: e.target.value})} required /></div>
              </div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Hrg Jual</label><input type="number" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.harga_jual} onChange={e => setMedForm({...medForm, harga_jual: e.target.value})} required /></div>
              <div><label className="text-sm font-semibold text-slate-700 mb-1 block">Expired</label><input type="date" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none" value={medForm.expired} onChange={e => setMedForm({...medForm, expired: e.target.value})} /></div>
              <button type="submit" className="btn-primary w-full">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 MODAL KEUANGAN 🌟 */}
      {showModal === 'finance' && editingData && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b flex justify-between items-center ${editingData.tipe === 'pemasukan' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'}`}>
              <h2 className="text-xl font-bold">{editingData.tipe === 'pemasukan' ? '💰 Tambah Pemasukan' : '💸 Tambah Pengeluaran'}</h2>
              <button onClick={() => setShowModal(null)} className="text-2xl touch-btn">&times;</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                await axios.post(`${API_URL}/finance/manual`, {
                  tipe: editingData.tipe,
                  kategori: formData.get('kategori'),
                  keterangan: formData.get('keterangan'),
                  jumlah: parseInt(formData.get('jumlah')),
                  tanggal: formData.get('tanggal')
                }, axiosWithUser());
                showToast('Transaksi ditambahkan!', 'success');
                setShowModal(null);
                fetchFinance();
              } catch (err) {
                showToast(err.response?.data?.error || 'Gagal tambah transaksi', 'error');
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Tanggal</label>
                <input type="date" name="tanggal" defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Kategori</label>
                <input type="text" name="kategori" placeholder="Contoh: Jual obat, Listrik, Gaji" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Jumlah (Rp)</label>
                <input type="number" name="jumlah" placeholder="50000" min="1" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Keterangan (Opsional)</label>
                <textarea name="keterangan" placeholder="Catatan tambahan..." rows="3" className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
              <button type="submit" className={`btn-primary w-full ${editingData.tipe === 'pemasukan' ? '!bg-emerald-600 hover:!bg-emerald-700' : '!bg-red-600 hover:!bg-red-700'}`}>
                💾 Simpan {editingData.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

