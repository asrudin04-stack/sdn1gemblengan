import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Briefcase,
  X,
  Phone,
  Check,
  Upload,
  Download,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Teacher } from '../types';
import { addTeacher, updateTeacher, deleteTeacher, saveBulkTeachers } from '../dbService';

interface Props {
  teachers: Teacher[];
}

export default function TeacherManagement({ teachers }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  // Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLogs, setImportLogs] = useState<{ type: 'success' | 'error'; message: string }[]>([]);
  const [pastedData, setPastedData] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formGender, setFormGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [formSubject, setFormSubject] = useState('');
  const [formClassLevel, setFormClassLevel] = useState<number>(0); // 0 = not wali kelas
  const [formStatus, setFormStatus] = useState<'PNS' | 'PPPK' | 'Honorer'>('PNS');
  const [formPhone, setFormPhone] = useState('');

  const [loading, setLoading] = useState(false);

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.nip.includes(searchQuery) ||
                            t.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' ? true : t.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [teachers, searchQuery, selectedStatus]);

  // Open Modal for Create or Edit
  const handleOpenModal = (teacher: Teacher | null = null) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormName(teacher.name);
      setFormNip(teacher.nip);
      setFormGender(teacher.gender);
      setFormSubject(teacher.subject);
      setFormClassLevel(teacher.classLevel || 0);
      setFormStatus(teacher.status);
      setFormPhone(teacher.phone || '');
    } else {
      setEditingTeacher(null);
      setFormName('');
      setFormNip('');
      setFormGender('Laki-laki');
      setFormSubject('');
      setFormClassLevel(0);
      setFormStatus('PNS');
      setFormPhone('');
    }
    setIsModalOpen(true);
  };

  // Submit Handler (Create/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNip) {
      alert('Mohon isi nama dan NIP.');
      return;
    }

    setLoading(true);
    try {
      const teacherData: Teacher = {
        name: formName,
        nip: formNip,
        gender: formGender,
        subject: formSubject || 'Guru Kelas',
        classLevel: Number(formClassLevel),
        status: formStatus,
        phone: formPhone
      };

      if (editingTeacher && editingTeacher.id) {
        await updateTeacher(editingTeacher.id, teacherData);
      } else {
        await addTeacher(teacherData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data guru.');
    } finally {
      setLoading(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string | undefined, name: string) => {
    if (!id) return;
    if (confirm(`Apakah Anda yakin ingin menghapus data guru ${name}?`)) {
      try {
        await deleteTeacher(id);
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus data guru.');
      }
    }
  };

  // CSV Import Logic (supports copy paste excel as well)
  const handleImportTeachers = async () => {
    if (!pastedData.trim()) {
      alert('Mohon tempel data CSV atau Excel terlebih dahulu.');
      return;
    }

    setLoading(true);
    setImportLogs([]);
    
    try {
      // Parse CSV or TSV (tab separated)
      const rows = pastedData.trim().split('\n');
      const parsedTeachers: Omit<Teacher, 'id'>[] = [];
      const tempLogs: { type: 'success' | 'error'; message: string }[] = [];

      rows.forEach((row, idx) => {
        // Handle TSV or CSV
        const cols = row.includes('\t') ? row.split('\t') : row.split(',');
        
        // Skip header if detected
        if (idx === 0 && (cols[0].toLowerCase().includes('nama') || cols[0].toLowerCase().includes('nip'))) {
          tempLogs.push({ type: 'success', message: 'Mendeteksi baris tajuk (header) dan melompati.' });
          return;
        }

        if (cols.length < 4) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1} tidak valid (minimal 4 kolom: Nama, NIP, Jenis Kelamin, Status)` });
          return;
        }

        const name = cols[0]?.trim();
        const nip = cols[1]?.trim();
        const genderRaw = cols[2]?.trim();
        const statusRaw = cols[3]?.trim();
        const subject = cols[4]?.trim() || 'Guru Kelas';
        const classLevel = cols[5] ? Number(cols[5].trim()) : 0;
        const phone = cols[6]?.trim() || '';

        // Validate gender
        let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
        if (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw === 'P')) {
          gender = 'Perempuan';
        }

        // Validate status
        let status: 'PNS' | 'PPPK' | 'Honorer' = 'PNS';
        if (statusRaw) {
          if (statusRaw.toUpperCase().includes('PPPK') || statusRaw.toUpperCase().includes('3K')) {
            status = 'PPPK';
          } else if (statusRaw.toLowerCase().includes('honor') || statusRaw.toLowerCase().includes('gtt')) {
            status = 'Honorer';
          }
        }

        if (name && nip) {
          parsedTeachers.push({
            name,
            nip,
            gender,
            subject,
            classLevel,
            status,
            phone
          });
          tempLogs.push({ type: 'success', message: `Berhasil memproses baris ${idx + 1}: ${name} (NIP: ${nip})` });
        } else {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1} dilewati karena Nama atau NIP kosong.` });
        }
      });

      if (parsedTeachers.length > 0) {
        await saveBulkTeachers(parsedTeachers);
        tempLogs.push({ type: 'success', message: `TOTAL: Berhasil mengimpor & menyelaraskan ${parsedTeachers.length} data Guru ke database!` });
        setPastedData('');
      } else {
        tempLogs.push({ type: 'error', message: 'Tidak ada data guru valid yang berhasil diproses.' });
      }

      setImportLogs(tempLogs);
    } catch (err) {
      console.error(err);
      setImportLogs([{ type: 'error', message: `Gagal mengimpor data: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateHeader = "Nama Guru,NIP,Jenis Kelamin(L/P),Status(PNS/PPPK/Honorer),Mata Pelajaran,Wali Kelas Level(1-6 / 0),No Telepon";
    const templateRow1 = "Asrudin S.Pd.,198510122010121005,L,PNS,Guru Kelas,4,08123456789";
    const templateRow2 = "Siti Aminah S.Pd.,199105152020032007,P,PPPK,Matematika,0,08524567890";
    
    const csvContent = "data:text/csv;charset=utf-8," + [templateHeader, templateRow1, templateRow2].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Import_Guru_SDN1.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="teacher-management-section">
      {/* Header and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-display">Pengelolaan Data Guru</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Tambahkan, sunting, cari, dan impor daftar guru pendidik secara otomatis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 text-sm font-semibold rounded-xl border border-indigo-200 dark:border-indigo-900/50 transition flex items-center space-x-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Impor Daftar Guru</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari guru berdasarkan nama, NIP, atau mata pelajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1.5 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm">
          <Briefcase className="w-4 h-4 text-gray-400" />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-transparent border-none outline-none pr-2 text-gray-700 dark:text-slate-300 focus:ring-0"
          >
            <option value="all">Semua Status Kepegawaian</option>
            <option value="PNS">Status: PNS</option>
            <option value="PPPK">Status: PPPK</option>
            <option value="Honorer">Status: Honorer</option>
          </select>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Nama Guru</th>
                <th className="py-4 px-4">NIP</th>
                <th className="py-4 px-4">Gender</th>
                <th className="py-4 px-4">Spesialisasi</th>
                <th className="py-4 px-4">Wali Kelas</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 text-sm text-gray-700 dark:text-slate-300">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/20 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-sm font-display">
                          {t.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{t.name}</p>
                          <p className="text-xs text-gray-400 flex items-center space-x-1 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{t.phone || '-'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono text-xs text-gray-500 dark:text-slate-400">
                      {t.nip}
                    </td>
                    <td className="py-4 px-4">
                      {t.gender}
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-800 dark:text-slate-200">
                      {t.subject}
                    </td>
                    <td className="py-4 px-4">
                      {t.classLevel > 0 ? (
                        <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg text-xs">
                          Kelas {t.classLevel}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Bukan Wali Kelas</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.status === 'PNS' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' :
                        t.status === 'PPPK' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' :
                        'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(t)}
                          className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition"
                          title="Sunting"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id, t.name)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition"
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
                    Tidak ditemukan data guru yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT GURU MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                {editingTeacher ? 'Sunting Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Nama Lengkap (beserta Gelar) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Siti Rahmawati, S.Pd."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    NIP / No Identitas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="18 digit angka"
                    value={formNip}
                    onChange={(e) => setFormNip(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as any)}
                    className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Mata Pelajaran / Tugas
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: IPA, Kelas, PJOK"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Wali Kelas Tingkat
                  </label>
                  <select
                    value={formClassLevel}
                    onChange={(e) => setFormClassLevel(Number(e.target.value))}
                    className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value={0}>Bukan Wali Kelas</option>
                    {[1, 2, 3, 4, 5, 6].map(lvl => (
                      <option key={lvl} value={lvl}>Wali Kelas {lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Status Kepegawaian *
                </label>
                <div className="flex space-x-2">
                  {['PNS', 'PPPK', 'Honorer'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st as any)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition ${
                        formStatus === st
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  No. Telepon Aktif
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 0812345678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-4 py-2 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex space-x-2 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition"
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

      {/* IMPORT TEACHERS CSV MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2 font-display">
                <Upload className="w-5 h-5 text-indigo-600" />
                <span>Impor Guru (Format CSV / Excel)</span>
              </h3>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportLogs([]);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Panduan Impor:</span> Tempelkan baris data dari Excel Anda atau salin file CSV. Urutan kolom: 
                  <code className="block bg-white dark:bg-slate-900 p-1.5 rounded-md mt-1 font-mono text-indigo-600 dark:text-indigo-400">
                    Nama, NIP, Jenis Kelamin(L/P), Status(PNS/PPPK/Honorer), Mapel, Wali Kelas(1-6), No Telp
                  </code>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Tempel Data Guru di Sini (Pemisah Koma atau Tab) *
                </label>
                <textarea
                  placeholder="Contoh:&#10;Bambang,198501102010121004,L,PNS,IPA,5,0812345678&#10;Siti,199002152018032001,P,PPPK,Matematika,0,0852345679"
                  rows={6}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none"
                />
              </div>

              {importLogs.length > 0 && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  <h4 className="font-bold text-gray-700 dark:text-slate-300 mb-1">Log Hasil Pemrosesan:</h4>
                  {importLogs.map((log, lIdx) => (
                    <div 
                      key={lIdx} 
                      className={`flex items-start space-x-1 ${
                        log.type === 'error' ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <span className="font-bold">{log.type === 'error' ? '✗' : '✓'}</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex space-x-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportLogs([]);
                  }}
                  className="flex-1 py-2.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition"
                >
                  Tutup
                </button>
                <button
                  onClick={handleImportTeachers}
                  disabled={loading || !pastedData.trim()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{loading ? 'Sedang Memproses...' : 'Proses & Simpan'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
