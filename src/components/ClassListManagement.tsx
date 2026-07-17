import React, { useState, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  UserMinus, 
  BookOpen, 
  ArrowUpRight, 
  Briefcase,
  Layers,
  ChevronRight,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { Student, Teacher, Attendance, ExamScore } from '../types';

interface Props {
  students: Student[];
  teachers: Teacher[];
  attendance: Attendance[];
  examScores: ExamScore[];
  onViewStudent: (student: Student) => void;
}

export default function ClassListManagement({ students, teachers, attendance, examScores, onViewStudent }: Props) {
  const [selectedClassLevel, setSelectedClassLevel] = useState<number | null>(null);

  // Compute Class aggregates
  const classStats = useMemo(() => {
    return [1, 2, 3, 4, 5, 6].map(level => {
      // Students in this class level
      const classStudents = students.filter(s => s.classLevel === level && s.status === 'Aktif');
      
      // Male vs Female
      const maleCount = classStudents.filter(s => s.gender === 'Laki-laki').length;
      const femaleCount = classStudents.filter(s => s.gender === 'Perempuan').length;
      
      // Find homeroom teacher (wali kelas)
      const homeroomTeacher = teachers.find(t => t.classLevel === level);

      // Average score in this class
      const classScores = examScores.filter(sc => sc.classLevel === level);
      const avgScore = classScores.length > 0 
        ? Math.round(classScores.reduce((sum, current) => sum + current.score, 0) / classScores.length)
        : 0;

      // Attendance rate
      const classAttendance = attendance.filter(att => att.classLevel === level);
      const presentCount = classAttendance.filter(att => att.status === 'Hadir').length;
      const attendanceRate = classAttendance.length > 0
        ? Math.round((presentCount / classAttendance.length) * 100)
        : 100; // Default to 100% if no logs yet

      return {
        level,
        studentsCount: classStudents.length,
        maleCount,
        femaleCount,
        homeroomTeacher,
        avgScore,
        attendanceRate
      };
    });
  }, [students, teachers, attendance, examScores]);

  // Selected Class detailed view
  const selectedClassDetails = useMemo(() => {
    if (selectedClassLevel === null) return null;
    const classStudents = students.filter(s => s.classLevel === selectedClassLevel && s.status === 'Aktif');
    const homeroomTeacher = teachers.find(t => t.classLevel === selectedClassLevel);
    return {
      level: selectedClassLevel,
      students: classStudents,
      homeroomTeacher
    };
  }, [selectedClassLevel, students, teachers]);

  const handlePrintClassList = () => {
    window.print();
  };

  const handleExportCSVClassList = (level: number) => {
    const classStudents = students.filter(s => s.classLevel === level && s.status === 'Aktif');
    if (classStudents.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Jenis Kelamin', 'Tanggal Lahir', 'Alamat', 'No Telp Orang Tua'];
    const rows = classStudents.map(s => [
      s.name,
      s.nisn,
      s.gender,
      s.dob,
      s.address || '-',
      s.parentPhone || '-'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daftar_Siswa_Kelas_${level}_SDN1.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="class-list-section">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-display">Daftar Kelas SD Negeri 1</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Ikhtisar kapasitas kelas, guru pengampu (wali kelas), dan persentase akademik siswa kelas 1-6.</p>
        </div>
      </div>

      {selectedClassLevel === null ? (
        /* GRID VIEW OF CLASSES 1-6 */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classStats.map((cls) => (
            <div 
              key={cls.level} 
              className="glass-card rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Badge & Class Number */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-extrabold text-xl font-display">
                    {cls.level}
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{cls.studentsCount} Siswa Aktif</span>
                  </span>
                </div>

                {/* Class Title */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-display mb-1">
                  Kelas {cls.level}
                </h3>

                {/* Homeroom Teacher */}
                <div className="flex items-center space-x-2.5 py-3 border-b border-gray-50 dark:border-slate-800/60 mb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold">
                    {cls.homeroomTeacher ? cls.homeroomTeacher.name.substring(0, 2).toUpperCase() : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wider">Wali Kelas</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-slate-200 truncate">
                      {cls.homeroomTeacher ? cls.homeroomTeacher.name : 'Belum Ditentukan'}
                    </p>
                  </div>
                </div>

                {/* Visual Stats Bar */}
                <div className="space-y-2.5 mb-6">
                  {/* Attendance Rate */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-gray-500 dark:text-slate-400">Kehadiran Rata-rata</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{cls.attendanceRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" 
                        style={{ width: `${cls.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Average grade */}
                  <div className="flex justify-between items-center text-xs pt-1.5">
                    <span className="text-gray-500 dark:text-slate-400 font-semibold">Rata-rata Nilai Ujian</span>
                    <span className="font-extrabold text-sm text-gray-800 dark:text-slate-200">
                      {cls.avgScore > 0 ? `${cls.avgScore} / 100` : '-'}
                    </span>
                  </div>

                  {/* Gender Distribution */}
                  <div className="flex justify-between items-center text-xs text-gray-400 dark:text-slate-500">
                    <span>Laki-laki: <strong className="text-gray-700 dark:text-slate-300">{cls.maleCount}</strong></span>
                    <span>Perempuan: <strong className="text-gray-700 dark:text-slate-300">{cls.femaleCount}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-50 dark:border-slate-800/50">
                <button
                  onClick={() => handleExportCSVClassList(cls.level)}
                  className="p-2 bg-gray-50 hover:bg-gray-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-gray-600 dark:text-slate-300 rounded-xl transition"
                  title="Ekspor CSV Siswa"
                >
                  <FileSpreadsheet className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={() => setSelectedClassLevel(cls.level)}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <span>Lihat Rincian Siswa</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* DETAILED CLASS VIEW (no-print layout handles print gracefully) */
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between no-print">
            <button
              onClick={() => setSelectedClassLevel(null)}
              className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>← Kembali ke Daftar Kelas</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintClassList}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF Kelas {selectedClassLevel}</span>
              </button>
              <button
                onClick={() => handleExportCSVClassList(selectedClassLevel)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh CSV</span>
              </button>
            </div>
          </div>

          {/* PRINT-ONLY HEADER FOR BEAUTIFUL REPORTS */}
          <div className="hidden print-only text-center space-y-2 mb-8">
            <h1 className="text-2xl font-extrabold uppercase">Daftar Siswa Aktif - SD Negeri 1</h1>
            <h2 className="text-lg font-bold">KELAS {selectedClassLevel}</h2>
            <div className="text-sm text-gray-500">
              Wali Kelas: {selectedClassDetails?.homeroomTeacher ? selectedClassDetails.homeroomTeacher.name : 'Belum Ditentukan'} | NIP: {selectedClassDetails?.homeroomTeacher?.nip || '-'}
            </div>
            <hr className="border-gray-300 mt-4" />
          </div>

          {/* Class Header Card */}
          <div className="glass-card rounded-2xl p-6 border border-gray-100 dark:border-slate-800 shadow-xs print-card no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-2xl font-display">
                  {selectedClassLevel}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white font-display">Siswa Kelas {selectedClassLevel}</h2>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Wali Kelas: <strong className="text-gray-800 dark:text-slate-200">{selectedClassDetails?.homeroomTeacher ? selectedClassDetails.homeroomTeacher.name : 'Belum Ditentukan'}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-800/40 px-5 py-3 rounded-2xl border border-gray-100 dark:border-slate-800/60">
                <div>
                  <span className="text-xs text-gray-400 block">Total Siswa</span>
                  <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{selectedClassDetails?.students.length} Orang</span>
                </div>
                <div className="border-l border-gray-200 dark:border-slate-700 pl-4">
                  <span className="text-xs text-gray-400 block">Laki-laki</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{selectedClassDetails?.students.filter(s => s.gender === 'Laki-laki').length}</span>
                </div>
                <div className="border-l border-gray-200 dark:border-slate-700 pl-4">
                  <span className="text-xs text-gray-400 block">Perempuan</span>
                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">{selectedClassDetails?.students.filter(s => s.gender === 'Perempuan').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden print:border-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-6 w-12 text-center">No</th>
                    <th className="py-4 px-6">Nama Siswa</th>
                    <th className="py-4 px-4">NISN</th>
                    <th className="py-4 px-4">Gender</th>
                    <th className="py-4 px-4">Tanggal Lahir</th>
                    <th className="py-4 px-4">Alamat</th>
                    <th className="py-4 px-6 no-print text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 text-sm text-gray-700 dark:text-slate-300">
                  {selectedClassDetails && selectedClassDetails.students.length > 0 ? (
                    selectedClassDetails.students.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 text-center font-semibold text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-gray-900 dark:text-white">{student.name}</span>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs text-slate-500">
                          {student.nisn}
                        </td>
                        <td className="py-4 px-4">
                          {student.gender}
                        </td>
                        <td className="py-4 px-4">
                          {student.dob}
                        </td>
                        <td className="py-4 px-4 max-w-[200px] truncate">
                          {student.address || '-'}
                        </td>
                        <td className="py-4 px-6 no-print text-right">
                          <button
                            onClick={() => onViewStudent(student)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-lg transition"
                          >
                            Buka Rapor
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        Belum ada data siswa aktif terdaftar di Kelas {selectedClassLevel}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures for Print */}
          <div className="hidden print-only mt-12 flex justify-between text-sm">
            <div>
              <p>Mengetahui,</p>
              <p className="font-bold mt-16 text-gray-900">Kepala Sekolah SDN 1</p>
              <p className="text-xs text-gray-500 font-mono">NIP. .........................</p>
            </div>
            <div className="text-right">
              <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold mt-16 text-gray-900 font-display">Wali Kelas {selectedClassLevel}</p>
              <p className="text-xs text-gray-500 font-mono">NIP. {selectedClassDetails?.homeroomTeacher?.nip || '.........................'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
