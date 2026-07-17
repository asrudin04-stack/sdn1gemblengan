import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  TrendingUp, 
  BarChart2, 
  Save, 
  HelpCircle, 
  Percent, 
  CheckCircle, 
  AlertTriangle,
  User,
  BookOpen,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { Student, ExamScore, SUBJECT_OPTIONS, EXAM_TYPES } from '../types';
import { saveBulkExamScores } from '../dbService';

interface Props {
  students: Student[];
  examScores: ExamScore[];
}

export default function GradeManagement({ students, examScores }: Props) {
  const [selectedClass, setSelectedClass] = useState<number>(4);
  const [selectedSubject, setSelectedSubject] = useState<string>('Matematika');
  const [selectedExamType, setSelectedExamType] = useState<'Harian' | 'UTS' | 'UAS'>('UTS');
  const [kkmThreshold, setKkmThreshold] = useState<number>(75);
  
  // Scoring Input states
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: string; notes: string }>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Active students in selected class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.classLevel === selectedClass && s.status === 'Aktif')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Existing scores map for selected class, subject, examType
  const existingScoresMap = useMemo(() => {
    const scores = examScores.filter(s => 
      s.classLevel === selectedClass && 
      s.subject === selectedSubject && 
      s.examType === selectedExamType
    );
    const map: Record<string, ExamScore> = {};
    scores.forEach(s => {
      map[s.studentId] = s;
    });
    return map;
  }, [examScores, selectedClass, selectedSubject, selectedExamType]);

  // Sync inputs with database
  useEffect(() => {
    const inputs: typeof scoreInputs = {};
    classStudents.forEach(student => {
      if (student.id) {
        const existing = existingScoresMap[student.id];
        inputs[student.id] = {
          score: existing ? existing.score.toString() : '',
          notes: existing?.notes || ''
        };
      }
    });
    setScoreInputs(inputs);
  }, [classStudents, existingScoresMap]);

  // Handle score value change
  const handleScoreChange = (studentId: string, val: string) => {
    // Sanitize input to numbers between 0-100 or empty
    const num = val.replace(/\D/g, '');
    if (num !== '' && (Number(num) < 0 || Number(num) > 100)) return;
    
    setScoreInputs(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: num
      }
    }));
  };

  // Handle individual note change
  const handleNoteChange = (studentId: string, notes: string) => {
    setScoreInputs(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  // Save scores bulk
  const handleSaveScores = async () => {
    if (classStudents.length === 0) {
      alert("Tidak ada siswa aktif di kelas ini.");
      return;
    }

    // Filter only records that have a score inputted
    const recordsToSave: Omit<ExamScore, 'id'>[] = [];
    for (const student of classStudents) {
      if (student.id) {
        const input = scoreInputs[student.id];
        if (input && input.score !== '') {
          recordsToSave.push({
            studentId: student.id,
            classLevel: selectedClass,
            subject: selectedSubject,
            examType: selectedExamType,
            score: Number(input.score),
            date: new Date().toISOString().split('T')[0],
            notes: input.notes
          });
        }
      }
    }

    if (recordsToSave.length === 0) {
      alert("Masukkan setidaknya satu nilai sebelum menyimpan.");
      return;
    }

    setSaving(true);
    try {
      await saveBulkExamScores(recordsToSave);
      setSuccessMsg('Nilai ujian berhasil disimpan & diintegrasikan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan nilai.');
    } finally {
      setSaving(false);
    }
  };

  // Real-time calculation stats
  const calculatedStats = useMemo(() => {
    const scoresList: number[] = [];
    let passedCount = 0;
    
    classStudents.forEach(student => {
      if (student.id) {
        const input = scoreInputs[student.id];
        if (input && input.score !== '') {
          const scoreNum = Number(input.score);
          scoresList.push(scoreNum);
          if (scoreNum >= kkmThreshold) {
            passedCount++;
          }
        }
      }
    });

    const count = scoresList.length;
    const average = count > 0 ? Math.round((scoresList.reduce((sum, s) => sum + s, 0) / count) * 10) / 10 : 0;
    const highest = count > 0 ? Math.max(...scoresList) : 0;
    const lowest = count > 0 ? Math.min(...scoresList) : 0;
    const passingRate = count > 0 ? Math.round((passedCount / count) * 100) : 0;

    return {
      average,
      highest,
      lowest,
      passingRate,
      count
    };
  }, [classStudents, scoreInputs, kkmThreshold]);

  const handlePrintGrades = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (classStudents.length === 0) {
      alert('Tidak ada data siswa untuk diekspor.');
      return;
    }

    const headers = ['Nama Siswa', 'NISN', 'Kelas', 'Mata Pelajaran', 'Jenis Ujian', 'Nilai Ujian', 'Kelulusan', 'Catatan'];
    const rows = classStudents.map((student) => {
      const inputState = scoreInputs[student.id!] || { score: '', notes: '' };
      const isPassed = inputState.score !== '' ? Number(inputState.score) >= kkmThreshold : false;
      return [
        student.name,
        student.nisn,
        `Kelas ${selectedClass}`,
        selectedSubject,
        selectedExamType,
        inputState.score || '-',
        inputState.score !== '' ? (isPassed ? 'Lulus' : 'Remedial') : '-',
        inputState.notes || '-'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nilai_${selectedSubject}_Kelas_${selectedClass}_${selectedExamType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="grade-management-section">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100 dark:border-slate-800 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight font-display">Penginputan Nilai Ujian</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Rekam nilai harian, UTS, dan UAS siswa secara real-time dan hitung kelulusan otomatis.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Ekspor CSV Nilai"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={handlePrintGrades}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 transition flex items-center space-x-1"
            title="Cetak Nilai"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={handleSaveScores}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
            id="save-grades-btn"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
          </button>
        </div>
      </div>

      {/* PRINT ONLY HEADER */}
      <div className="hidden print-only text-center space-y-2 mb-6">
        <h1 className="text-xl font-extrabold uppercase">Daftar Nilai Hasil Ujian</h1>
        <h2 className="text-md font-bold">KELAS {selectedClass} - SDN 1</h2>
        <p className="text-xs text-gray-500">Mata Pelajaran: {selectedSubject} | Jenis Ujian: {selectedExamType} | Batas KKM: {kkmThreshold}</p>
        <div className="text-xs font-bold text-gray-700 flex justify-center space-x-4 pt-2">
          <span>Rata-rata: {calculatedStats.average || '-'}</span>
          <span>Tinggi: {calculatedStats.highest || '-'}</span>
          <span>Rendah: {calculatedStats.lowest || '-'}</span>
          <span>Kelulusan: {calculatedStats.passingRate}%</span>
        </div>
        <hr className="border-gray-200 mt-4" />
      </div>

      {/* Selectors and Threshold Setting */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        {/* Class Level Selector */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Kelas
          </label>
          <div className="grid grid-cols-6 gap-1">
            {[1, 2, 3, 4, 5, 6].map(level => (
              <button
                key={level}
                onClick={() => setSelectedClass(level)}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  selectedClass === level
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                id={`grades-class-${level}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Selector */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Mata Pelajaran
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 text-sm text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
            id="grades-subject-select"
          >
            {SUBJECT_OPTIONS.map(subj => (
              <option key={subj} value={subj}>{subj}</option>
            ))}
          </select>
        </div>

        {/* Exam Type Selector */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Jenis Ujian
          </label>
          <div className="flex space-x-1">
            {EXAM_TYPES.map(type => (
              <button
                key={type}
                onClick={() => setSelectedExamType(type)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                  selectedExamType === type
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                id={`grades-type-${type}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* KKM Threshold Setting */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-center">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
            Kriteria Kelulusan (KKM)
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={0}
              max={100}
              value={kkmThreshold}
              onChange={(e) => setKkmThreshold(Number(e.target.value))}
              className="w-20 px-3 py-2 bg-gray-50 text-center font-bold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              id="kkm-input"
            />
            <span className="text-xs text-gray-400 leading-tight">Batas minimal siswa lulus mata pelajaran</span>
          </div>
        </div>
      </div>

      {/* Live Calculated Stats Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Average Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase font-medium">Rata-rata Kelas</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{calculatedStats.average || '-'}</p>
          </div>
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Passing Rate Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase font-medium">Tingkat Kelulusan</p>
            <p className={`text-2xl font-bold ${calculatedStats.passingRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
              {calculatedStats.count > 0 ? `${calculatedStats.passingRate}%` : '-'}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Highest Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase font-medium">Nilai Tertinggi</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{calculatedStats.highest || '-'}</p>
          </div>
          <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Lowest Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase font-medium">Nilai Terendah</p>
            <p className="text-2xl font-bold text-red-500 dark:text-red-400">{calculatedStats.lowest || '-'}</p>
          </div>
          <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl">
            <BarChart2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 px-4 py-3 rounded-2xl text-sm font-semibold flex items-center space-x-2" id="grades-success-banner">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grading Input Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs overflow-hidden no-print">
        <div className="p-4 bg-gray-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">
            Form Nilai {selectedSubject} - {selectedExamType} (Kelas {selectedClass})
          </h3>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            Ketik nilai 0-100. Status Remedial otomatis dihitung berdasarkan KKM ({kkmThreshold}).
          </span>
        </div>

        {classStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="grades-input-table">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/25 border-b border-gray-100 dark:border-slate-800 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-16">No</th>
                  <th className="py-3.5 px-4">Siswa</th>
                  <th className="py-3.5 px-4 w-32 text-center">Nilai Ujian</th>
                  <th className="py-3.5 px-4 w-40 text-center">Kelulusan (KKM {kkmThreshold})</th>
                  <th className="py-3.5 px-6">Catatan Akademik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/50 text-sm text-gray-700 dark:text-slate-300">
                {classStudents.map((student, idx) => {
                  const inputState = scoreInputs[student.id!] || { score: '', notes: '' };
                  const scoreNum = inputState.score !== '' ? Number(inputState.score) : null;
                  const isPassed = scoreNum !== null ? scoreNum >= kkmThreshold : null;

                  return (
                    <tr key={student.id} className="hover:bg-gray-50/20 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-4 px-6 font-mono text-gray-400 dark:text-slate-500 text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                        {student.name}
                        <p className="text-xxs font-mono text-gray-400 dark:text-slate-500 font-normal mt-0.5">NISN: {student.nisn}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <input
                             type="text"
                             placeholder="Nilai"
                             value={inputState.score}
                             onChange={(e) => handleScoreChange(student.id!, e.target.value)}
                             className="w-20 px-2 py-1.5 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100/50 dark:hover:bg-slate-900 focus:bg-white dark:focus:bg-slate-950 text-center font-mono font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                             id={`score-input-${student.id}`}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {scoreNum === null ? (
                            <span className="text-xs text-gray-400 dark:text-slate-500 italic">Belum Diisi</span>
                          ) : isPassed ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 space-x-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Lulus</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Remedial</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <input
                          type="text"
                          placeholder="Contoh: Sangat baik memahami konsep Aljabar..."
                          value={inputState.notes}
                          onChange={(e) => handleNoteChange(student.id!, e.target.value)}
                          className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-950 hover:bg-gray-100/50 focus:bg-white dark:focus:bg-slate-950 text-xs text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          id={`score-note-${student.id}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center space-y-2">
            <BookOpen className="w-8 h-8 text-gray-300" />
            <p>Tidak ada siswa aktif yang terdaftar di Kelas {selectedClass}.</p>
            <p className="text-xs">Silakan tambahkan siswa baru di tab Siswa terlebih dahulu.</p>
          </div>
        )}
      </div>

      {/* PRINT-ONLY GRADES TABLE */}
      <div className="hidden print-only mt-4">
        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-xs font-bold uppercase">
              <th className="py-2 px-3 border border-gray-300 w-12 text-center">No</th>
              <th className="py-2 px-3 border border-gray-300">Nama Siswa</th>
              <th className="py-2 px-3 border border-gray-300">NISN</th>
              <th className="py-2 px-3 border border-gray-300 text-center w-24">Nilai</th>
              <th className="py-2 px-3 border border-gray-300 text-center w-32">Status (KKM {kkmThreshold})</th>
              <th className="py-2 px-3 border border-gray-300">Catatan Akademik</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {classStudents.map((student, index) => {
              const inputState = scoreInputs[student.id!] || { score: '', notes: '' };
              const scoreNum = inputState.score !== '' ? Number(inputState.score) : null;
              const isPassed = scoreNum !== null ? scoreNum >= kkmThreshold : null;
              return (
                <tr key={student.id} className="border-b border-gray-300">
                  <td className="py-2 px-3 border border-gray-300 text-center">{index + 1}</td>
                  <td className="py-2 px-3 border border-gray-300 font-bold">{student.name}</td>
                  <td className="py-2 px-3 border border-gray-300 font-mono text-xs">{student.nisn}</td>
                  <td className="py-2 px-3 border border-gray-300 text-center font-bold font-mono">{inputState.score || '-'}</td>
                  <td className="py-2 px-3 border border-gray-300 text-center font-bold">
                    {scoreNum === null ? 'Belum Diisi' : isPassed ? 'Lulus' : 'Remedial'}
                  </td>
                  <td className="py-2 px-3 border border-gray-300 italic">{inputState.notes || '-'}</td>
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
            <p className="font-bold mt-16 text-gray-900">Guru Kelas / Pengampu</p>
            <p className="text-xs text-gray-500 font-mono">NIP. .........................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
