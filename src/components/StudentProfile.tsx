import React, { useMemo } from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Phone, 
  Calendar as CalendarIcon, 
  Award, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle,
  Printer,
  ChevronLeft,
  FileText
} from 'lucide-react';
import { Student, Attendance, ExamScore, SUBJECT_OPTIONS } from '../types';

interface Props {
  student: Student;
  attendance: Attendance[];
  examScores: ExamScore[];
  onBack: () => void;
}

export default function StudentProfile({ student, attendance, examScores, onBack }: Props) {
  // 1. Calculate Student Attendance Rates
  const studentAttendance = useMemo(() => {
    const logs = attendance.filter(a => a.studentId === student.id);
    const total = logs.length;
    const hadir = logs.filter(l => l.status === 'Hadir').length;
    const sakit = logs.filter(l => l.status === 'Sakit').length;
    const izin = logs.filter(l => l.status === 'Izin').length;
    const alpa = logs.filter(l => l.status === 'Alpa').length;
    const rate = total > 0 ? Math.round((hadir / total) * 100) : 100; // default 100% if no data

    return { total, hadir, sakit, izin, alpa, rate, logs };
  }, [attendance, student.id]);

  // 2. Calculate Subject Wise Report Card (Rapor Akademik)
  const academicReport = useMemo(() => {
    const studentScores = examScores.filter(s => s.studentId === student.id);
    
    const subjectsReport = SUBJECT_OPTIONS.map(subject => {
      const subjScores = studentScores.filter(s => s.subject === subject);
      
      const harian = subjScores.find(s => s.examType === 'Harian')?.score ?? null;
      const uts = subjScores.find(s => s.examType === 'UTS')?.score ?? null;
      const uas = subjScores.find(s => s.examType === 'UAS')?.score ?? null;
      
      // Calculate weighted average (Harian: 40%, UTS: 30%, UAS: 30%)
      const scoresCount = [harian, uts, uas].filter(s => s !== null).length;
      let average = 0;
      if (scoresCount > 0) {
        let sum = 0;
        let weightSum = 0;
        if (harian !== null) { sum += harian * 0.4; weightSum += 0.4; }
        if (uts !== null) { sum += uts * 0.3; weightSum += 0.3; }
        if (uas !== null) { sum += uas * 0.3; weightSum += 0.3; }
        average = Math.round(sum / weightSum);
      } else {
        average = 0;
      }

      const notes = subjScores.map(s => s.notes).filter(Boolean).join(' | ');

      return {
        subject,
        harian,
        uts,
        uas,
        average,
        hasScores: scoresCount > 0,
        notes
      };
    });

    const activeSubjects = subjectsReport.filter(r => r.hasScores);
    const overallAverage = activeSubjects.length > 0 
      ? Math.round(activeSubjects.reduce((sum, r) => sum + r.average, 0) / activeSubjects.length) 
      : 0;

    return { subjectsReport, overallAverage, activeSubjectsCount: activeSubjects.length };
  }, [examScores, student.id]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="student-profile-section">
      {/* Back Button & Print Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 print:hidden">
        <button
          onClick={onBack}
          className="px-3.5 py-2 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl border border-gray-200 transition flex items-center space-x-1"
          id="profile-back-btn"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition flex items-center space-x-1.5"
          id="profile-print-btn"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Lembar Rapor</span>
        </button>
      </div>

      {/* Main Container - Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card & Bio */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-gray-50">
            <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-700 font-black text-2xl flex items-center justify-center">
              {student.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              <p className="text-sm font-semibold text-indigo-600">Siswa Kelas {student.classLevel}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              student.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700' :
              student.status === 'Alumni' ? 'bg-indigo-50 text-indigo-700' :
              'bg-red-50 text-red-700'
            }`}>
              Status: {student.status}
            </span>
          </div>

          {/* Student Biodata */}
          <div className="space-y-4 text-sm text-gray-700">
            <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Biodata Siswa</h3>
            
            <div className="flex items-start space-x-2.5">
              <FileText className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">NISN</p>
                <p className="font-mono font-bold text-gray-900">{student.nisn}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <User className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Jenis Kelamin</p>
                <p className="font-semibold text-gray-900">{student.gender}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <CalendarIcon className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Tanggal Lahir</p>
                <p className="font-semibold text-gray-900">{student.dob}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <Phone className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Telepon Wali</p>
                <p className="font-semibold text-gray-900">{student.parentPhone || '-'}</p>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <MapPin className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400">Alamat</p>
                <p className="font-semibold text-gray-900 leading-relaxed">{student.address || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Log and Statistics Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6 lg:col-span-2">
          <div className="flex justify-between items-center pb-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 text-lg">Rekapitulasi Kehadiran</h3>
            <span className="text-sm font-mono font-bold text-emerald-600">{studentAttendance.rate}% Kehadiran</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100/50 text-center">
              <p className="text-2xl font-bold text-emerald-700">{studentAttendance.hadir}</p>
              <p className="text-xs text-emerald-600 uppercase font-semibold tracking-wider">Hadir</p>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-100/50 text-center">
              <p className="text-2xl font-bold text-amber-600">{studentAttendance.sakit}</p>
              <p className="text-xs text-amber-600 uppercase font-semibold tracking-wider">Sakit</p>
            </div>
            <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100/50 text-center">
              <p className="text-2xl font-bold text-blue-600">{studentAttendance.izin}</p>
              <p className="text-xs text-blue-600 uppercase font-semibold tracking-wider">Izin</p>
            </div>
            <div className="bg-red-50/70 p-4 rounded-xl border border-red-100/50 text-center">
              <p className="text-2xl font-bold text-red-600">{studentAttendance.alpa}</p>
              <p className="text-xs text-red-600 uppercase font-semibold tracking-wider">Alpa</p>
            </div>
          </div>

          {/* Quick list of recent absences */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Catatan Ketidakhadiran (Sakit / Izin / Alpa)</h4>
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 text-sm">
              {studentAttendance.logs.filter(l => l.status !== 'Hadir').length > 0 ? (
                studentAttendance.logs.filter(l => l.status !== 'Hadir').map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'Sakit' ? 'bg-amber-500' :
                        log.status === 'Izin' ? 'bg-blue-500' : 'bg-red-500'
                      }`}></span>
                      <span className="font-bold text-gray-700">{log.status}</span>
                      {log.notes && <span className="text-gray-400">({log.notes})</span>}
                    </div>
                    <span className="text-xs font-mono text-gray-400">{log.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">Siswa memiliki rekam kehadiran 100% prima.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Academic Report Card (Rapor Kelas) - Wide Section */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-gray-50 gap-2">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Kartu Hasil Studi (Rapor Siswa)</h3>
            <p className="text-xs text-gray-400">Gabungan nilai ujian harian, UTS, dan UAS tahun akademik berjalan.</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-xl flex items-center space-x-3 shrink-0">
            <span className="text-xs font-semibold text-indigo-700">Rata-rata Keseluruhan:</span>
            <span className="text-xl font-black text-indigo-900">{academicReport.overallAverage}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="academic-report-table">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4 text-center">Nilai Harian (40%)</th>
                <th className="py-3 px-4 text-center">Nilai UTS (30%)</th>
                <th className="py-3 px-4 text-center">Nilai UAS (30%)</th>
                <th className="py-3 px-4 text-center">Rata-rata Terbobot</th>
                <th className="py-3 px-4 text-center">Status Kelulusan (KKM 75)</th>
                <th className="py-3 px-6">Catatan Guru</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
              {academicReport.subjectsReport.map((row, idx) => {
                const isPassed = row.average >= 75;
                return (
                  <tr key={idx} className="hover:bg-gray-50/20 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900">
                      {row.subject}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-semibold">
                      {row.harian !== null ? row.harian : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-semibold">
                      {row.uts !== null ? row.uts : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-semibold">
                      {row.uas !== null ? row.uas : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-base font-bold text-indigo-600">
                      {row.hasScores ? row.average : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex justify-center">
                        {!row.hasScores ? (
                          <span className="text-xxs text-gray-400 italic">Belum Ada Nilai</span>
                        ) : isPassed ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-bold bg-emerald-50 text-emerald-700 space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Lulus KKM</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-bold bg-red-50 text-red-700 space-x-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Remedial</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 italic max-w-xs truncate" title={row.notes}>
                      {row.notes || <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
