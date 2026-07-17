import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ArrowUpRight, 
  UserPlus, 
  BookOpen, 
  AlertTriangle,
  X,
  Phone,
  MapPin,
  Calendar,
  Check,
  Briefcase
} from 'lucide-react';
import { Student } from '../types';
import { addStudent, updateStudent, deleteStudent } from '../dbService';

interface Props {
  students: Student[];
  onViewProfile: (student: Student) => void;
}

export default function StudentManagement({ students, onViewProfile }: Props) {
  // Filters and Searches
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('Aktif');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Promotion Modal States
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoFromClass, setPromoFromClass] = useState<number>(1);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formGender, setFormGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [formDob, setFormDob] = useState('');
  const [formClass, setFormClass] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Alumni' | 'Keluar'>('Aktif');
  const [formAddress, setFormAddress] = useState('');
  const [formParentPhone, setFormParentPhone] = useState('');

  const [loading, setLoading] = useState(false);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            student.nisn.includes(searchQuery);
      const matchesClass = selectedClass === 'all' ? true : student.classLevel === selectedClass;
      const matchesStatus = selectedStatus === 'all' ? true : student.status === selectedStatus;
      
      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, selectedClass, selectedStatus]);

  // Open Modal for Create or Edit
  const handleOpenModal = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setFormName(student.name);
      setFormNisn(student.nisn);
      setFormGender(student.gender);
      setFormDob(student.dob);
      setFormClass(student.classLevel);
      setFormStatus(student.status);
      setFormAddress(student.address || '');
      setFormParentPhone(student.parentPhone || '');
    } else {
      setEditingStudent(null);
      setFormName('');
      setFormNisn('');
      setFormGender('Laki-laki');
      setFormDob('');
      setFormClass(1);
      setFormStatus('Aktif');
      setFormAddress('');
      setFormParentPhone('');
    }
    setIsModalOpen(true);
  };

  // Submit Handler (Create/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNisn || !formDob) {
      alert('Mohon isi semua field wajib.');
      return;
    }

    setLoading(true);
    try {
      const studentData: Student = {
        name: formName,
        nisn: formNisn,
        gender: formGender,
        dob: formDob,
        classLevel: Number(formClass),
        status: formStatus,
        address: formAddress,
        parentPhone: formParentPhone
      };

      if (editingStudent && editingStudent.id) {
        await updateStudent(editingStudent.id, studentData);
      } else {
        await addStudent(studentData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data siswa.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string | undefined, name: string) => {
    if (!id) return;
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}?`)) {
      try {
        await deleteStudent(id);
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus siswa.');
      }
    }
  };

  // Automatic Batch Promotion (Kenaikan Kelas Massal)
  const handleBatchPromotion = async () => {
    const classToPromote = Number(promoFromClass);
    const studentsInClass = students.filter(s => s.classLevel === classToPromote && s.status === 'Aktif');
    
    if (studentsInClass.length === 0) {
      alert(`Tidak ada siswa aktif di Kelas ${classToPromote} untuk dinaikkan.`);
      return;
    }

    const confirmMsg = classToPromote === 6 
      ? `Apakah Anda yakin ingin meluluskan ${studentsInClass.length} siswa di Kelas 6 menjadi status "Alumni"?`
      : `Apakah Anda yakin ingin menaikkan ${studentsInClass.length} siswa aktif dari Kelas ${classToPromote} ke Kelas ${classToPromote + 1}?`;

    if (confirm(confirmMsg)) {
      setLoading(true);
      try {
        let count = 0;
        for (const student of studentsInClass) {
          if (student.id) {
            if (classToPromote === 6) {
              await updateStudent(student.id, { status: 'Alumni' });
            } else {
              await updateStudent(student.id, { classLevel: classToPromote + 1 });
            }
            count++;
          }
        }
        setPromoSuccessMsg(`Berhasil memproses kenaikan ${count} siswa.`);
        setTimeout(() => {
          setPromoSuccessMsg('');
          setIsPromoModalOpen(false);
        }, 2000);
      } catch (err) {
        console.error(err);
        alert('Gagal memproses kenaikan kelas massal.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6" id="student-management-section">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pengelolaan Data Siswa</h1>
          <p className="text-sm text-gray-500">Tambahkan, sunting, cari, dan kelola kenaikan kelas siswa secara efisien.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button
            id="batch-promote-btn"
            onClick={() => setIsPromoModalOpen(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl border border-indigo-200 transition flex items-center space-x-1.5"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Kenaikan Kelas Massal</span>
          </button>
          <button
            id="add-student-btn"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari nama siswa atau NISN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            id="student-search-input"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="bg-transparent border-none outline-none pr-2 text-gray-700 focus:ring-0"
              id="class-filter-select"
            >
              <option value="all">Semua Kelas</option>
              {[1, 2, 3, 4, 5, 6].map(level => (
                <option key={level} value={level}>Kelas {level}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700">
            <Briefcase className="w-4 h-4 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none outline-none pr-2 text-gray-700 focus:ring-0"
              id="status-filter-select"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Alumni">Status: Alumni</option>
              <option value="Keluar">Status: Keluar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="students-table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-4 px-6">Nama Siswa</th>
                <th className="py-4 px-4">NISN</th>
                <th className="py-4 px-4">Kelas</th>
                <th className="py-4 px-4">Gender</th>
                <th className="py-4 px-4">Kontak Wali</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-50/70 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <button
                            onClick={() => onViewProfile(student)}
                            className="font-medium text-gray-900 hover:text-indigo-600 hover:underline transition text-left"
                          >
                            {student.name}
                          </button>
                          <p className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                            <MapPin className="w-3 h-3 inline" />
                            <span className="truncate max-w-[180px]">{student.address || 'Alamat Belum Diisi'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-gray-500">
                      {student.nisn}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-gray-800">Kelas {student.classLevel}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {student.gender}
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {student.parentPhone ? (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{student.parentPhone}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        student.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' :
                        student.status === 'Alumni' ? 'bg-indigo-50 text-indigo-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onViewProfile(student)}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Lihat Rapor & Detail"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(student)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Tidak ditemukan data siswa yang cocok dengan filter Anda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD / EDIT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingStudent ? 'Sunting Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Saputra"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* NISN & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    NISN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="10 digit nomor"
                    value={formNisn}
                    onChange={(e) => setFormNisn(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Class & Date of Birth */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tingkat Kelas *
                  </label>
                  <select
                    value={formClass}
                    onChange={(e) => setFormClass(Number(e.target.value))}
                    className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6].map(lvl => (
                      <option key={lvl} value={lvl}>Kelas {lvl}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Tanggal Lahir *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Status Siswa *
                </label>
                <div className="flex space-x-2">
                  {['Aktif', 'Alumni', 'Keluar'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st as any)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition ${
                        formStatus === st
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  No. Telepon Orang Tua / Wali
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  value={formParentPhone}
                  onChange={(e) => setFormParentPhone(e.target.value)}
                  className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Alamat Rumah
                </label>
                <textarea
                  placeholder="Tuliskan alamat lengkap siswa..."
                  value={formAddress}
                  rows={2}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-4 py-2 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROMOTION CLASS MODAL --- */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-600" />
                <span>Kenaikan Kelas Massal</span>
              </h3>
              <button 
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {promoSuccessMsg ? (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 py-8">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-semibold text-emerald-900">{promoSuccessMsg}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start space-x-3 text-amber-800 text-xs leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Peringatan:</span> Tindakan ini akan menaikkan tingkat kelas seluruh siswa aktif dari kelas asal secara permanen ke kelas berikutnya. Khusus untuk Kelas 6, siswa akan dinyatakan lulus dan statusnya berubah menjadi <strong>"Alumni"</strong>.
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Pilih Kelas Asal yang Ingin Dinaikkan *
                  </label>
                  <select
                    value={promoFromClass}
                    onChange={(e) => setPromoFromClass(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6].map(lvl => (
                      <option key={lvl} value={lvl}>Kelas {lvl}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Siswa Terdampak:</span>
                  <span className="text-sm font-bold text-gray-900">
                    {students.filter(s => s.classLevel === promoFromClass && s.status === 'Aktif').length} Siswa Aktif
                  </span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setIsPromoModalOpen(false)}
                    className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBatchPromotion}
                    disabled={loading}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition"
                  >
                    {loading ? 'Memproses...' : 'Proses Kenaikan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
