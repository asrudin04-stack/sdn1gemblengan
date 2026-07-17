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
import * as XLSX from 'xlsx';
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

  // Drag and drop states
  const [isDraggingStudent, setIsDraggingStudent] = useState(false);
  const [isDraggingTeacher, setIsDraggingTeacher] = useState(false);

  // --- Excel/CSV File Uploader ---
  const handleFileUpload = (file: File, type: 'student' | 'teacher') => {
    setLoading(true);
    setLogs([]);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet data to tab-separated text (TSV)
        const text = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
        
        if (!text.trim()) {
          alert('File Excel/CSV kosong atau tidak dapat dibaca.');
          setLoading(false);
          return;
        }

        const lines = text.trim().split('\n');
        
        if (type === 'student') {
          setPastedStudentData(text);
          setLogs([
            { 
              type: 'success', 
              message: `Berhasil membaca berkas "${file.name}". Terdeteksi ${lines.length} baris data (termasuk tajuk jika ada). Silakan periksa kolom di bawah ini dan klik "Unggah & Sinkronisasi Massal" untuk menyimpan.` 
            }
          ]);
        } else {
          setPastedTeacherData(text);
          setLogs([
            { 
              type: 'success', 
              message: `Berhasil membaca berkas "${file.name}". Terdeteksi ${lines.length} baris data (termasuk tajuk jika ada). Silakan periksa kolom di bawah ini dan klik "Impor & Simpan Data Guru" untuk menyimpan.` 
            }
          ]);
        }
      } catch (err) {
        console.error(err);
        alert('Gagal mengurai file Excel/CSV. Pastikan format berkas didukung (.xlsx, .xls, .csv).');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      alert('Gagal membaca file.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // --- Student Importer Logic (Dapodik Compatible) ---
  const handleImportStudents = async () => {
    if (!pastedStudentData.trim()) {
      alert('Mohon tempel data siswa terlebih dahulu atau unggah file Excel.');
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
        
        // Skip header row if it contains descriptive words
        if (idx === 0 && (
          cols[0].toLowerCase().includes('nama') || 
          cols[0].toLowerCase().includes('nisn') || 
          cols[0].toLowerCase().includes('jenis')
        )) {
          tempLogs.push({ type: 'success', message: 'Mendeteksi tajuk tabel, melompati baris pertama.' });
          return;
        }

        // Clean up columns
        const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

        if (cleanCols.length < 5) {
          tempLogs.push({ 
            type: 'error', 
            message: `Baris ${idx + 1} tidak valid. Diperlukan minimal 5 kolom: Nama, NISN, Jenis Kelamin (L/P), Tanggal Lahir (YYYY-MM-DD), Kelas (1-6)` 
          });
          return;
        }

        const name = cleanCols[0];
        const nisn = cleanCols[1].replace(/\D/g, ''); // Numeric only
        const genderRaw = cleanCols[2];
        const dobRaw = cleanCols[3];
        const classLevelRaw = Number(cleanCols[4]);
        const address = cleanCols[5] || '';
        const parentPhone = cleanCols[6] || '';
        const statusRaw = cleanCols[7] || 'Aktif';

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
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: NISN [${cleanCols[1]}] harus terdiri dari 10 digit angka.` });
          return;
        }

        if (isNaN(classLevelRaw) || classLevelRaw < 1 || classLevelRaw > 6) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Tingkat Kelas [${cleanCols[4]}] harus berupa angka 1 s.d. 6.` });
          return;
        }

        // Format Date (ensure it is clean)
        let dob = dobRaw;
        if (!dob.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // If in DD-MM-YYYY or DD/MM/YYYY format, convert to YYYY-MM-DD
          const dateParts = dob.split(/[-/.]/);
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
      alert('Mohon tempel data guru terlebih dahulu atau unggah file Excel.');
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

        // Clean columns
        const cleanCols = cols.map(c => c.trim().replace(/^"|"$/g, ''));

        if (cleanCols.length < 4) {
          tempLogs.push({ type: 'error', message: `Baris ${idx + 1}: Kolom minimal 4 (Nama, NIP, Jenis Kelamin, Status)` });
          return;
        }

        const name = cleanCols[0];
        const nip = cleanCols[1].replace(/\D/g, ''); // NIP numeric only
        const genderRaw = cleanCols[2];
        const statusRaw = cleanCols[3];
        const subject = cleanCols[4] || 'Guru Kelas';
        const classLevel = cleanCols[5] ? Number(cleanCols[5]) : 0;
        const phone = cleanCols[6] || '';

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

  // --- Real Excel Template Generator using SheetJS ---
  const downloadStudentExcelTemplate = () => {
    const headers = [
      'Nama Lengkap',
      'NISN',
      'Jenis Kelamin (L/P)',
      'Tanggal Lahir (YYYY-MM-DD)',
      'Tingkat Kelas (1-6)',
      'Alamat Rumah',
      'No Telp Wali',
      'Status (Aktif/Alumni/Keluar)'
    ];
    const sampleRow = [
      'Andi Wijaya',
      '0123456789',
      'L',
      '2015-05-14',
      '4',
      'Jl. Sudirman No 15',
      '08123456789',
      'Aktif'
    ];
    const data = [headers, sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    XLSX.writeFile(wb, 'Template_Dapodik_Siswa_SDN1.xlsx');
  };

  const downloadTeacherExcelTemplate = () => {
    const headers = [
      'Nama Guru',
      'NIP',
      'Jenis Kelamin (L/P)',
      'Status (PNS/PPPK/Honorer)',
      'Mata Pelajaran',
      'Wali Kelas Level (1-6, atau 0)',
      'No Telepon'
    ];
    const sampleRow = [
      'Diana Safitri',
      '199208152019032011',
      'P',
      'PPPK',
      'Bahasa Inggris',
      '0',
      '0852000012'
    ];
    const data = [headers, sampleRow];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
    XLSX.writeFile(wb, 'Template_Guru_SDN1.xlsx');
  };

  // --- Excel/CSV Exporters ---
  const exportScoresToExcel = () => {
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

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nilai Ujian');
    XLSX.writeFile(wb, 'Laporan_Nilai_Ujian_Siswa_SDN1.xlsx');
  };

  const exportAttendanceToExcel = () => {
    if (attendance.length === 0) {
      alert('Tidak ada laporan absensi untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Semester', 'Bulan', 'Tahun Ajaran', 'Sakit (Hari)', 'Izin (Hari)', 'Alpa (Hari)', 'Keterangan'];
    const rows = attendance.map(att => {
      const student = students.find(s => s.id === att.studentId);
      return [
        student ? student.name : 'Tidak Dikenal',
        student ? student.nisn : '-',
        `Kelas ${att.classLevel}`,
        att.semester || 'Ganjil',
        att.month || '-',
        att.academicYear || '2026/2027',
        att.sakit ?? 0,
        att.izin ?? 0,
        att.alpa ?? 0,
        att.notes || '-'
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presensi Bulanan');
    XLSX.writeFile(wb, 'Laporan_Rekap_Presensi_Bulanan_Siswa_SDN1.xlsx');
  };

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

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Nilai_Ujian_Siswa_SDN1.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceToCSV = () => {
    if (attendance.length === 0) {
      alert('Tidak ada laporan absensi untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Semester', 'Bulan', 'Tahun Ajaran', 'Sakit (Hari)', 'Izin (Hari)', 'Alpa (Hari)', 'Keterangan'];
    const rows = attendance.map(att => {
      const student = students.find(s => s.id === att.studentId);
      return [
        student ? student.name : 'Tidak Dikenal',
        student ? student.nisn : '-',
        `Kelas ${att.classLevel}`,
        att.semester || 'Ganjil',
        att.month || '-',
        att.academicYear || '2026/2027',
        att.sakit ?? 0,
        att.izin ?? 0,
        att.alpa ?? 0,
        att.notes || '-'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Laporan_Rekap_Presensi_Bulanan_Siswa_SDN1.csv");
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
          id="student-import-tab"
        >
          <Users className="w-4.5 h-4.5" />
          <span>Impor Data Siswa (Excel/CSV)</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('teacher-import'); setLogs([]); }}
          className={`px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'teacher-import'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          id="teacher-import-tab"
        >
          <Briefcase className="w-4.5 h-4.5" />
          <span>Impor Data Guru (Excel/CSV)</span>
        </button>

        <button
          onClick={() => { setActiveSubTab('export-center'); setLogs([]); }}
          className={`px-5 py-3 text-sm font-semibold transition-all shrink-0 border-b-2 flex items-center space-x-2 ${
            activeSubTab === 'export-center'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-slate-200'
          }`}
          id="export-center-tab"
        >
          <Download className="w-4.5 h-4.5" />
          <span>Ekspor Laporan & Nilai</span>
        </button>
      </div>

      {/* --- STUDENT IMPORT SECTION --- */}
      {activeSubTab === 'student-import' && (
        <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">Integrasi Impor Siswa Dapodik (Excel)</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">Unggah berkas Microsoft Excel (.xlsx, .xls) atau CSV untuk memasukkan ratusan siswa secara aman dan instan.</p>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">STRUKTUR KOLOM EXCEL DAPODIK (URUTAN):</span>
              1. Nama Lengkap | 2. NISN (10 Digit) | 3. Jenis Kelamin (L/P) | 4. Tanggal Lahir (YYYY-MM-DD atau DD/MM/YYYY) | 5. Tingkat Kelas (1 s.d. 6) | 6. Alamat Rumah | 7. No HP Orang Tua | 8. Status (Aktif/Alumni/Keluar)
              <p className="mt-2 text-indigo-600 dark:text-indigo-400 font-semibold">💡 Tips: Anda dapat mengunggah file Excel langsung atau menyalin baris dari Excel dan menempelkannya di bawah.</p>
            </div>
            <button
              onClick={downloadStudentExcelTemplate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center space-x-1.5"
              id="download-student-template-btn"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDraggingStudent(true); }}
            onDragLeave={() => setIsDraggingStudent(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingStudent(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0], 'student');
              }
            }}
            onClick={() => document.getElementById('student-file-picker')?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
              isDraggingStudent 
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]' 
                : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/40'
            }`}
            id="student-dropzone"
          >
            <input 
              type="file" 
              id="student-file-picker" 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'student');
                }
              }}
            />
            <Upload className="w-10 h-10 text-indigo-500" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300">
                Seret & letakkan berkas Excel (.xlsx, .xls) atau CSV di sini
              </p>
              <p className="text-xs text-gray-400">
                atau klik untuk menelusuri berkas dari komputer Anda
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              Format kompatibel dengan Dapodik Kemendikbud
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Pratinjau Data Impor (Bisa Diubah Manual)
            </label>
            <textarea
              placeholder="Data yang dimuat dari berkas Excel atau ditempel secara manual akan muncul di sini..."
              rows={6}
              value={pastedStudentData}
              onChange={(e) => setPastedStudentData(e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none focus:bg-white"
              id="student-data-textarea"
            />
          </div>

          {logs.length > 0 && (
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 max-h-56 overflow-y-auto space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-1 mb-2">
                <span className="font-bold text-gray-700 dark:text-slate-300">Hasil Analisis Impor Siswa:</span>
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
              id="submit-student-import-btn"
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
            <p className="text-sm text-gray-500 dark:text-slate-400">Migrasikan data guru SD Negeri 1 secara instan dari berkas Excel atau spreadsheet sekolah.</p>
          </div>

          <div className="flex flex-col lg:flex-row justify-between items-start gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-800 dark:text-slate-200">STRUKTUR KOLOM:</span> Nama Guru, NIP, Jenis Kelamin (L/P), Status (PNS/PPPK/Honorer), Mapel, Wali Kelas Level (1-6 / 0), No Telepon.
            </div>
            <button
              onClick={downloadTeacherExcelTemplate}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center space-x-1.5"
              id="download-teacher-template-btn"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDraggingTeacher(true); }}
            onDragLeave={() => setIsDraggingTeacher(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingTeacher(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0], 'teacher');
              }
            }}
            onClick={() => document.getElementById('teacher-file-picker')?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
              isDraggingTeacher 
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01]' 
                : 'border-gray-200 hover:border-indigo-400 hover:bg-gray-50/50 dark:border-slate-800 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/40'
            }`}
            id="teacher-dropzone"
          >
            <input 
              type="file" 
              id="teacher-file-picker" 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 'teacher');
                }
              }}
            />
            <Upload className="w-10 h-10 text-indigo-500" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300">
                Seret & letakkan berkas Excel (.xlsx, .xls) atau CSV di sini
              </p>
              <p className="text-xs text-gray-400">
                atau klik untuk menelusuri berkas dari komputer Anda
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              Unggah massal data pengajar & wali kelas
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Pratinjau Data Guru (Bisa Diubah Manual)
            </label>
            <textarea
              placeholder="Data yang dimuat dari berkas Excel atau ditempel secara manual akan muncul di sini..."
              rows={6}
              value={pastedTeacherData}
              onChange={(e) => setPastedTeacherData(e.target.value)}
              className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none focus:bg-white"
              id="teacher-data-textarea"
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
              id="submit-teacher-import-btn"
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
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Unduh Laporan Nilai Akademik</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Ekspor nilai ulangan harian, UTS, dan UAS siswa kelas 1-6 untuk seluruh mata pelajaran dalam format Excel (.xlsx) atau CSV.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-gray-500">
                <span>Total Rekaman Nilai:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200">{examScores.length} Entri</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportScoresToExcel}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm"
                id="export-scores-xlsx-btn"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Format Excel (.xlsx)</span>
              </button>
              <button
                onClick={exportScoresToCSV}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                id="export-scores-csv-btn"
              >
                <FileDown className="w-4 h-4" />
                <span>Format CSV</span>
              </button>
            </div>
          </div>

          {/* Export attendance logs */}
          <div className="glass-card rounded-3xl p-6 border border-gray-100 dark:border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display">Unduh Laporan Presensi Semester</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Unduh kumulatif kehadiran semester siswa (Sakit, Izin, Alpa) seluruh murid untuk keperluan pengisian Rapor.</p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 flex justify-between text-xs text-gray-500">
                <span>Total Rekaman Presensi:</span>
                <span className="font-bold text-gray-800 dark:text-slate-200">{attendance.length} Absensi</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={exportAttendanceToExcel}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-sm"
                id="export-attendance-xlsx-btn"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Format Excel (.xlsx)</span>
              </button>
              <button
                onClick={exportAttendanceToCSV}
                className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5"
                id="export-attendance-csv-btn"
              >
                <FileDown className="w-4 h-4" />
                <span>Format CSV</span>
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
