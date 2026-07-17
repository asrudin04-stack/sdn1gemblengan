import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  UserCheck, 
  Save, 
  Clock, 
  Users,
  Search,
  Check,
  AlertCircle,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { Student, Attendance } from '../types';
import { saveBulkAttendance } from '../dbService';

interface Props {
  students: Student[];
  attendance: Attendance[];
}

export default function AttendanceManagement({ students, attendance }: Props) {
  const [selectedClass, setSelectedClass] = useState<number>(4);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Current date in YYYY-MM-DD
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localDate = new Date(today.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Filtered active students in the selected class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classLevel === selectedClass && s.status === 'Aktif')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Attendance states for form
  const [attendanceStates, setAttendanceStates] = useState<Record<string, { status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'; notes: string }>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Loaded existing attendance records for the selected class and date
  const existingAttendanceMap = useMemo(() => {
    const records = attendance.filter(a => a.classLevel === selectedClass && a.date === selectedDate);
    const map: Record<string, Attendance> = {};
    records.forEach(r => {
      map[r.studentId] = r;
    });
    return map;
  }, [attendance, selectedClass, selectedDate]);

  // Synchronize attendance state when class, date, or database updates
  useEffect(() => {
    const newStates: typeof attendanceStates = {};
    classStudents.forEach(student => {
      if (student.id) {
        const existing = existingAttendanceMap[student.id];
        newStates[student.id] = {
          status: existing ? existing.status : 'Hadir', // default to 'Hadir' if no log
          notes: existing?.notes || ''
        };
      }
    });
    setAttendanceStates(newStates);
  }, [classStudents, existingAttendanceMap]);

  // Set all class students to 'Hadir' as a rapid entry feature
  const handleMarkAllHadir = () => {
    const updated = { ...attendanceStates };
    classStudents.forEach(student => {
      if (student.id && updated[student.id]) {
        updated[student.id].status = 'Hadir';
      }
    });
    setAttendanceStates(updated);
  };

  // Set individual student attendance status
  const handleStatusChange = (studentId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    setAttendanceStates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  // Set individual notes
  const handleNotesChange = (studentId: string, notes: string) => {
    setAttendanceStates(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  // Save changes
  const handleSaveAttendance = async () => {
    if (classStudents.length === 0) {
      alert("Tidak ada siswa aktif di kelas ini.");
      return;
    }

    setSaving(true);
    try {
      const recordsToSave: Omit<Attendance, 'id'>[] = classStudents.map(student => {
        const studentState = attendanceStates[student.id!];
        return {
          studentId: student.id!,
          date: selectedDate,
          classLevel: selectedClass,
          status: studentState?.status || 'Hadir',
          notes: studentState?.notes || ''
        };
      });

      await saveBulkAttendance(recordsToSave);
      setSuccessMsg('Absensi berhasil disimpan ke cloud database!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan absensi.');
    } finally {
      setSaving(false);
    }
  };

  // Today's attendance summary stats for the current class
  const classStats = useMemo(() => {
    let hadir = 0, sakit = 0, izin = 0, alpa = 0;
    classStudents.forEach(s => {
      if (s.id) {
        const st = attendanceStates[s.id];
        if (st) {
          if (st.status === 'Hadir') hadir++;
          else if (st.status === 'Sakit') sakit++;
          else if (st.status === 'Izin') izin++;
          else if (st.status === 'Alpa') alpa++;
        }
      }
    });
    
    const total = classStudents.length;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 0;
    
    return { hadir, sakit, izin, alpa, total, rate };
  }, [classStudents, attendanceStates]);

  const handlePrintAttendance = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (classStudents.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Tanggal', 'Status Kehadiran', 'Keterangan'];
    const rows = classStudents.map((student) => {
      const state = attendanceStates[student.id!] || { status: 'Hadir', notes: '' };
      return [
        student.name,
        student.nisn,
        `Kelas ${selectedClass}`,
        selectedDate,
        state.status,
        state.notes || '-'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Presensi_Kelas_${selectedClass}_Tgl_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="attendance-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100 dark:border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-display">Presensi Kehadiran Siswa</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 font-sans">Kelola dan rekap daftar kehadiran harian siswa secara cepat dan terintegrasi.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Ekspor CSV Presensi"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrintAttendance}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Cetak Presensi Hari Ini"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleMarkAllHadir}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-900/40 transition"
            id="mark-all-hadir-btn"
          >
            Set Semua Hadir
          </button>
          <button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
            id="save-attendance-btn"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print-only text-center space-y-2 mb-6">
        <h1 className="text-xl font-extrabold uppercase">Laporan Presensi Kehadiran Siswa</h1>
        <h2 className="text-md font-bold">KELAS {selectedClass} - SDN 1</h2>
        <p className="text-xs text-gray-500">Tanggal: {selectedDate}</p>
        <div className="text-xs font-bold text-gray-700 flex justify-center space-x-4 pt-2">
          <span>Hadir: {classStats.hadir}</span>
          <span>Sakit: {classStats.sakit}</span>
          <span>Izin: {classStats.izin}</span>
          <span>Alpa: {classStats.alpa}</span>
          <span>Persentase: {classStats.rate}%</span>
        </div>
        <hr className="border-gray-200 mt-4" />
      </div>

      {/* Selectors Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        {/* Class Level Selector */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Tingkatan Kelas
          </label>
          <div className="grid grid-cols-6 gap-1">
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button
                key={level}
                onClick={() => setSelectedClass(level)}
                className={`py-2 text-sm font-bold rounded-xl border transition ${
                  selectedClass === level
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                id={`select-class-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Tanggal Presensi
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <Calendar className="w-4 h-4" />
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold"
              id="attendance-date-picker"
            />
          </div>
        </div>

        {/* Class Stats Summary */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rekap Kelas {selectedClass}</span>
            <span className="text-xs font-bold text-emerald-600">{classStats.rate}% Hadir</span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl text-center">
              <div className="text-lg font-bold">{classStats.hadir}</div>
              <div className="text-xxs uppercase font-medium">Hadir</div>
            </div>
            <div className="bg-amber-50 text-amber-700 p-2 rounded-xl text-center">
              <div className="text-lg font-bold">{classStats.sakit}</div>
              <div className="text-xxs uppercase font-medium">Sakit</div>
            </div>
            <div className="bg-blue-50 text-blue-700 p-2 rounded-xl text-center">
              <div className="text-lg font-bold">{classStats.izin}</div>
              <div className="text-xxs uppercase font-medium">Izin</div>
            </div>
            <div className="bg-red-50 text-red-700 p-2 rounded-xl text-center">
              <div className="text-lg font-bold">{classStats.alpa}</div>
              <div className="text-xxs uppercase font-medium">Alpa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center space-x-2 animate-fade-in" id="success-banner">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Attendance Form Grid/Table */}
      <div className="bg-white rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden no-print">
        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/60 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Daftar Absen Kelas {selectedClass} ({classStudents.length} siswa)</h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">Pilih status kehadiran & berikan keterangan bila sakit/izin</span>
        </div>

        {classStudents.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-slate-800/40">
            {classStudents.map((student, index) => {
              const state = attendanceStates[student.id!] || { status: 'Hadir', notes: '' };
              return (
                <div 
                  key={student.id} 
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/40 dark:hover:bg-slate-900/10 transition-colors"
                >
                  {/* Student Name */}
                  <div className="flex items-center space-x-3 min-w-[200px]">
                    <span className="text-xs font-mono text-gray-400 w-5">{index + 1}.</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{student.name}</h4>
                      <p className="text-xs text-gray-400 dark:text-slate-500">NISN: {student.nisn}</p>
                    </div>
                  </div>

                  {/* Status Options Button Group */}
                  <div className="flex items-center space-x-1" id={`status-group-${student.id}`}>
                    {(['Hadir', 'Sakit', 'Izin', 'Alpa'] as const).map(status => {
                      const isActive = state.status === status;
                      let colorClass = '';
                      if (isActive) {
                        if (status === 'Hadir') colorClass = 'bg-emerald-600 text-white border-emerald-600 shadow-xs';
                        else if (status === 'Sakit') colorClass = 'bg-amber-500 text-white border-amber-500 shadow-xs';
                        else if (status === 'Izin') colorClass = 'bg-blue-500 text-white border-blue-500 shadow-xs';
                        else if (status === 'Alpa') colorClass = 'bg-red-500 text-white border-red-500 shadow-xs';
                      } else {
                        colorClass = 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700';
                      }

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(student.id!, status)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${colorClass}`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>

                  {/* Keterangan / Notes input */}
                  <div className="flex-1 max-w-xs">
                    <input
                      type="text"
                      placeholder="Keterangan tambahan..."
                      value={state.notes}
                      onChange={(e) => handleNotesChange(student.id!, e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100/50 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-950 text-xs text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
            <Users className="w-8 h-8 text-gray-300" />
            <p>Tidak ada siswa aktif yang terdaftar di Kelas {selectedClass}.</p>
            <p className="text-xs">Silakan tambahkan siswa baru di tab Siswa terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* PRINT-ONLY ATTENDANCE TABLE */}
      <div className="hidden print-only mt-4">
        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-xs font-bold uppercase">
              <th className="py-2 px-3 border border-gray-300 w-12 text-center">No</th>
              <th className="py-2 px-3 border border-gray-300">Nama Siswa</th>
              <th className="py-2 px-3 border border-gray-300">NISN</th>
              <th className="py-2 px-3 border border-gray-300 text-center w-32">Status Kehadiran</th>
              <th className="py-2 px-3 border border-gray-300">Keterangan</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {classStudents.map((student, index) => {
              const state = attendanceStates[student.id!] || { status: 'Hadir', notes: '' };
              return (
                <tr key={student.id} className="border-b border-gray-300">
                  <td className="py-2 px-3 border border-gray-300 text-center">{index + 1}</td>
                  <td className="py-2 px-3 border border-gray-300 font-bold">{student.name}</td>
                  <td className="py-2 px-3 border border-gray-300 font-mono text-xs">{student.nisn}</td>
                  <td className="py-2 px-3 border border-gray-300 text-center font-bold">{state.status}</td>
                  <td className="py-2 px-3 border border-gray-300 italic">{state.notes || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Signatures for Print */}
        <div className="mt-12 flex justify-between text-sm">
          <div>
            <p>Mengetahui,</p>
            <p className="font-bold mt-16 text-gray-900">Kepala Sekolah SDN 1</p>
            <p className="text-xs text-gray-500 font-mono">NIP. .........................</p>
          </div>
          <div className="text-right">
            <p>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-16 text-gray-900">Wali Kelas {selectedClass}</p>
            <p className="text-xs text-gray-500 font-mono">NIP. .........................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
