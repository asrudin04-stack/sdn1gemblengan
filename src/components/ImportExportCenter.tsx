import React, { useState } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Users, 
  Briefcase,
  CalendarCheck2, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  X,
  FileDown
} from 'lucide-react';
import { Student, Teacher, Attendance, ExamScore } from '../types';
import { saveBulkStudents, saveBulkTeachers } from '../dbService';

interface Props {
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  examScores: ExamScore[];
}

export default function ImportExportCenter({ students, teachers, attendance, examScores }: Props) {
  // Tabs: 'student-import' | 'teacher-import' | 'export-center'
  const [activeSubTab, setActiveSubTab] = useState<'student-import' | 'teacher-import' | 'export-center'>('student-import');
  
  // Importer States
  const [pastedStudentData, setPastedStudentData] = useState('');
  const [pastedTeacherData, setPastedTeacherData] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ type: 'success' | 'error'; message: string }[]>([]);

  // --- Student Importer Logic (Dapodik Compatible) ---
  const handleImportStudents = async () => {
    if (!pastedStudentData.trim()) {
      alert('Mohon tempel data siswa terlebih dahulu.');
      return;
    }

    setLoading(true);
    setLogs([]);
    const tempLogs: { type: 'success' | 'error'; message: string }[] = [];

    try {
      const rows = pastedStudentData.trim().split('\n');
      const parsedStudents: Omit<Student, 'id'>[] = [];

      rows.forEach((row, idx) => {
        const cols = row.includes('\t') ? row.split('\t') : row.split(',');
        
        // Skip header
        if (idx === 0 && (
          cols[0].toLowerCase().includes('nama') || 
          cols[0].toLowerCase().includes('nisn') || 
          cols[0].toLowerCase().includes('jenis')
        )) {
          tempLogs.push({ type: 'success', message: 'Mendeteksi tajuk tabel Dapodik, melompati baris pertama.' });
          return;
        }

        if (cols.length < 5) {
          tempLogs.push({ 
            type: 'error', 
            message: `Baris ${idx + 1} tidak valid. Diperlukan minimal 5 kolom: Nama, NISN, Jenis Kelamin (L/P), Tanggal Lahir (YYYY-MM-DD), Kelas (1-6)` 
          });
          return;
        }

        const name = cols[0]?.trim();
        const nisn = cols[1]?.trim().replace(/\D/g, ''); // Numeric only
        const genderRaw = cols[2]?.trim();
        const dobRaw = cols[3]?.trim();
        const classLevelRaw = Number(cols[4]?.trim());
        const address = cols[5]?.trim() || '';
        const parentPhone = cols[6]?.trim() || '';
        const statusRaw = cols[7]?.trim() || 'Aktif';

        // Gender mapping
        let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
        if (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw === 'P')) {
          gender = 'Perempuan';
        }

        // Status mapping
        let status: 'Aktif' | 'Alumni' | 'Keluar' = 'Aktif';
        if (statusRaw) {
          if (statusRaw.toLowerCase().includes('alumni') || statusRaw.toLowerCase().includes('lulus')) {
            status = 'Alumni';
          } else if (statusRaw.toLowerCase().includes('keluar') || statusRaw.toLowerCase().includes('pindah')) {
            status = 'Keluar';
          }
        }

        // Simple validation
        if (!name || name.length < 2) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Nama tidak boleh kosong / terlalu pendek.` });
          return;
        }

        if (!nisn || nisn.length !== 10) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: NISN [${cols[1]}] harus terdiri dari 10 digit angka.` });
          return;
        }

        if (isNaN(classLevelRaw) || classLevelRaw < 1 || classLevelRaw > 6) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Tingkat Kelas [${cols[4]}] harus berupa angka 1 s.d. 6.` });
          return;
        }

        // Format Date (ensure it is somewhat clean)
        let dob = dobRaw;
        if (!dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // If in DD-MM-YYYY format, convert to YYYY-MM-DD
          const dateParts = dob.split(/[-/]/);
          if (dateParts.length === 3) {
            if (dateParts[2].length === 4) {
              // DD-MM-YYYY -> YYYY-MM-DD
              dob = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            } else if (dateParts[0].length === 4) {
              // YYYY-MM-DD
              dob = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
            }
          } else {
            // Default fallback
            dob = "2015-01-01";
            tempLogs.push({ type: 'error', message: `Baris ${idx + 1} (${name}): Format tgl lahir tidak standar, diubah ke default: 2015-01-01` });
          }
        }

        parsedStudents.push({
          name,
          nisn,
          gender,
          dob,
          classLevel: classLevelRaw,
          address,
          parentPhone,
          status
        });

        tempLogs.push({ type: 'success', message: `Berhasil memproses ${name} (NISN: ${nisn}, Kelas ${classLevelRaw})` });
      });

      if (parsedStudents.length > 0) {
        await saveBulkStudents(parsedStudents);
        tempLogs.push({ type: 'success', message: `TOTAL SUKSES: Berhasil mensinkronisasikan ${parsedStudents.length} data siswa ke Firestore cloud database!` });
        setPastedStudentData('');
      } else {
        tempLogs.push({ type: 'error', message: 'Gagal memproses data. Silakan cek format input Anda.' });
      }

      setLogs(tempLogs);
    } catch (err) {
      console.error(err);
      setLogs([{ type: 'error', message: `Terjadi kesalahan fatal: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Teacher Importer Logic ---
  const handleImportTeachers = async () => {
    if (!pastedTeacherData.trim()) {
      alert('Mohon tempel data guru terlebih dahulu.');
      return;
    }

    setLoading(true);
    setLogs([]);
    const tempLogs: { type: 'success' | 'error'; message: string }[] = [];

    try {
      const rows = pastedTeacherData.trim().split('\n');
      const parsedTeachers: Omit<Teacher, 'id'>[] = [];

      rows.forEach((row, idx) => {
        const cols = row.includes('\t') ? row.split('\t') : row.split(',');
        
        // Skip header
        if (idx === 0 && (cols[0].toLowerCase().includes('nama') || cols[0].toLowerCase().includes('nip'))) {
          tempLogs.push({ type: 'success', message: 'Mendeteksi tajuk guru, melompati baris pertama.' });
          return;
        }

        if (cols.length < 4) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Kolom minimal 4 (Nama, NIP, Jenis Kelamin, Status)` });
          return;
        }

        const name = cols[0]?.trim();
        const nip = cols[1]?.trim().replace(/\D/g, ''); // NIP numeric only
        const genderRaw = cols[2]?.trim();
        const statusRaw = cols[3]?.trim();
        const subject = cols[4]?.trim() || 'Guru Kelas';
        const classLevel = cols[5] ? Number(cols[5].trim()) : 0;
        const phone = cols[6]?.trim() || '';

        let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
        if (genderRaw && (genderRaw.toLowerCase().startsWith('p') || genderRaw.toLowerCase().includes('perempuan') || genderRaw === 'P')) {
          gender = 'Perempuan';
        }

        let status: 'PNS' | 'PPPK' | 'Honorer' = 'PNS';
        if (statusRaw) {
          if (statusRaw.toUpperCase().includes('PPPK')) status = 'PPPK';
          else if (statusRaw.toLowerCase().includes('honor')) status = 'Honorer';
        }

        if (!name || !nip) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Nama atau NIP tidak boleh kosong.` });
          return;
        }

        parsedTeachers.push({
          name,
          nip,
          gender,
          subject,
          classLevel,
          status,
          phone
        });

        tempLogs.push({ type: 'success', message: `Berhasil memproses ${name} (NIP: ${nip})` });
      });

      if (parsedTeachers.length > 0) {
        await saveBulkTeachers(parsedTeachers);
        tempLogs.push({ type: 'success', message: `TOTAL SUKSES: Berhasil menyimpan ${parsedTeachers.length} Guru baru ke database.` });
        setPastedTeacherData('');
      } else {
        tempLogs.push({ type: 'error', message: 'Gagal mengimpor data Guru.' });
      }

      setLogs(tempLogs);
    } catch (err) {
      console.error(err);
      setLogs([{ type: 'error', message: `Gagal impor: ${(err as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Export Report Card & Scores Logic ---
  const exportScoresToCSV = () => {
    if (examScores.length === 0) {
      alert('Tidak ada data nilai ujian untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Mata Pelajaran', 'Jenis Ujian', 'Nilai', 'Tanggal', 'Catatan'];
    const rows = examScores.map(score => {
      const student = students.find(s => s.id === score.studentId);
      return [
        student ? student.name : 'Tidak Dikenal',
        student ? student.nisn : '-',
        `Kelas ${score.classLevel}`,
        score.subject,
        score.examType,
        score.score,
        score.date,
        score.notes || '-'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Use BOM for Excel compatibility with Indonesian characters
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Nilai_Ujian_Siswa_SDN1.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceToCSV = () => {
    if (attendance.length === 0) {
      alert('Tidak ada laporan absensi untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Tanggal', 'Status Kehadiran', 'Keterangan'];
    const rows = attendance.map(att => {
      const student = students.find(s => s.id === att.studentId);
      return [
        student ? student.name : 'Tidak Dikenal',
        student ? student.nisn : '-',
        `Kelas ${att.classLevel}`,
        att.date,
        att.status,
        att.notes || '-'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Presensi_Harian_Siswa_SDN1.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadDapodikTemplate = () => {
    const headers = "Nama Lengkap,NISN,Jenis Kelamin(L/P),Tanggal Lahir(YYYY-MM-DD),Tingkat Kelas(1-6),Alamat Rumah,No Telp Wali,Status(Aktif/Alumni/Keluar)";
    const sample = "Andi Wijaya,0123456789,L,2015-05-14,4,Jl. Sudirman No 15,08123456789,Aktif";
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, sample].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Template_Dapodik_Siswa_SDN1.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="import-export-center">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        <button
          onClick={() => { setActiveSubTab('student-import'); setLogs([]); }}
          className={`px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'student-import'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>Impor Data Siswa (Dapodik)</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('teacher-import'); setLogs([]); }}
          className={`px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'teacher-import'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-4.5 h-4.5" />
          <span>Impor Data Guru</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('export-center'); setLogs([]); }}
          className={`px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'export-center'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
        >
          <Download className="w-4.5 h-4.5" />
          <span>Ekspor Laporan & Nilai</span>
        </button>
      </div>

      {/* --- STUDENT IMPORT SECTION --- */}
      {activeSubTab === 'student-import' && (
        <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">Integrasi Impor Siswa Dapodik</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Tempelkan baris data langsung dari Microsoft Excel Dapodik atau upload berkas CSV untuk mengunggah ratusan siswa secara aman.</p>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">STRUKTUR KOLOM DAPODIK (URUTAN):</span>
              1. Nama Lengkap | 2. NISN (10 Digit) | 3. Jenis Kelamin (L/P) | 4. Tanggal Lahir (YYYY-MM-DD atau DD/MM/YYYY) | 5. Tingkat Kelas (1 s.d. 6) | 6. Alamat Rumah | 7. No HP Orang Tua | 8. Status (Aktif/Alumni/Keluar)
              <p className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold">💡 Tips: Anda dapat menyalin langsung baris-baris dari file excel Dapodik Anda dan menempelkannya di bawah ini!</p>
            </div>
            <button
              onClick={downloadDapodikTemplate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template CSV</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tempelkan Baris Excel / CSV Anda Di Sini *
            </label>
            <textarea
              placeholder="Contoh:&#10;Ahmad Dahlan	0112233445	L	2014-12-05	5	Jl. Ahmad Dahlan 12	08124567812	Aktif&#10;Siti Hartini	0112233446	P	2015-08-20	4	Jl. Sudirman 10	08521234567	Aktif"
              rows={8}
              value={pastedStudentData}
              onChange={(e) => setPastedStudentData(e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none focus:bg-white"
            />
          </div>

          {logs.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 max-h-56 overflow-y-auto space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-1 mb-2">
                <span className="font-bold text-gray-700 dark:text-slate-300">Hasil Analisis Impor:</span>
                <button onClick={() => setLogs([])} className="text-xxs text-gray-400 hover:underline">Bersihkan Log</button>
              </div>
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`flex items-start space-x-1.5 ${
                    log.type === 'error' ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <span className="font-bold shrink-0">{log.type === 'error' ? '✗' : '✓'}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleImportStudents}
              disabled={loading || !pastedStudentData.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition flex items-center space-x-2 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>{loading ? 'Sedang Memproses & Mengunggah...' : 'Unggah & Sinkronisasi Massal'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- TEACHER IMPORT SECTION --- */}
      {activeSubTab === 'teacher-import' && (
        <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">Impor Guru & Tenaga Kependidikan</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Migrasikan data guru SD Negeri 1 secara instan dari spreadsheets.</p>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-800 dark:text-slate-200">STRUKTUR KOLOM:</span> Nama Guru, NIP, Jenis Kelamin (L/P), Status (PNS/PPPK/Honorer), Mapel, Wali Kelas Level (1-6 / 0), No Telepon.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tempelkan Baris Data Guru Anda *
            </label>
            <textarea
              placeholder="Contoh:&#10;Diana Safitri,199208152019032011,P,PPPK,Bahasa Inggris,0,0852000012&#10;Hendra Wijaya,198011242005011003,L,PNS,Penjasorkes,3,0812000044"
              rows={8}
              value={pastedTeacherData}
              onChange={(e) => setPastedTeacherData(e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none focus:bg-white"
            />
          </div>

          {logs.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 max-h-56 overflow-y-auto space-y-1.5 text-xs">
              <h4 className="font-bold text-gray-700 dark:text-slate-300 mb-1">Hasil Analisis Impor Guru:</h4>
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`flex items-start space-x-1.5 ${
                    log.type === 'error' ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <span className="font-bold">{log.type === 'error' ? '✗' : '✓'}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleImportTeachers}
              disabled={loading || !pastedTeacherData.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition flex items-center space-x-2 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>{loading ? 'Menyimpan...' : 'Impor & Simpan Data Guru'}</span>
            </button>
          </div>
        </div>
      )}

      {/* --- EXPORT REPORTS SECTION --- */}
      {activeSubTab === 'export-center' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Export exam scores */}
          <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Unduh Data Nilai Ujian Siswa</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Ekspor nilai ulangan harian, UTS, dan UAS siswa kelas 1-6 untuk seluruh mata pelajaran dalam satu lembar kerja CSV / Excel.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-gray-500">
                <span>Total Rekaman Nilai:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200">{examScores.length} Entri</span>
              </div>
            </div>

            <button
              onClick={exportScoresToCSV}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh Nilai Format CSV</span>
            </button>
          </div>

          {/* Export attendance logs */}
          <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Unduh Laporan Absensi</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Unduh laporan kehadiran harian (Hadir, Sakit, Izin, Alpa) seluruh murid untuk keperluan rekapitulasi bulanan.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-gray-500">
                <span>Total Rekaman Presensi:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200">{attendance.length} Absensi</span>
              </div>
            </div>

            <button
              onClick={exportAttendanceToCSV}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-md shadow-indigo-100 dark:shadow-none"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh Absensi Format CSV</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
