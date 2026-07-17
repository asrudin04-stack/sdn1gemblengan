import React, { useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Award, 
  CheckCircle,
  TrendingUp,
  PieChart as PieIcon,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';
import { Student, Attendance, ExamScore } from '../types';

interface Props {
  students: Student[];
  attendance: Attendance[];
  examScores: ExamScore[];
  onNavigate: (tab: string) => void;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function DashboardOverview({ students, attendance, examScores, onNavigate }: Props) {
  // Memoized stats
  const stats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === 'Aktif');
    const totalCount = activeStudents.length;
    
    // Male & Female
    const maleCount = activeStudents.filter(s => s.gender === 'Laki-laki').length;
    const femaleCount = activeStudents.filter(s => s.gender === 'Perempuan').length;

    // Student count per class
    const classCounts = Array.from({ length: 6 }, (_, i) => {
      const level = i + 1;
      return {
        classLabel: `Kelas ${level}`,
        count: activeStudents.filter(s => s.classLevel === level).length,
        level
      };
    });

    // Attendance rate (Monthly based)
    // For each monthly record, we calculate individual attendance rate and find the overall average.
    let totalPossibleDays = 0;
    let totalAbsentDays = 0;
    attendance.forEach(a => {
      totalPossibleDays += 20; // Assume 20 days per monthly record
      totalAbsentDays += (a.sakit ?? 0) + (a.izin ?? 0) + (a.alpa ?? 0);
    });
    const attendanceRate = totalPossibleDays > 0 
      ? Math.max(0, Math.round(((totalPossibleDays - totalAbsentDays) / totalPossibleDays) * 100))
      : 100;

    // Class level attendance rates
    const classAttendanceRates = Array.from({ length: 6 }, (_, i) => {
      const level = i + 1;
      const classAtts = attendance.filter(a => a.classLevel === level);
      let classPossible = 0;
      let classAbsent = 0;
      classAtts.forEach(a => {
        classPossible += 20; // Assume 20 days per monthly record
        classAbsent += (a.sakit ?? 0) + (a.izin ?? 0) + (a.alpa ?? 0);
      });
      const rate = classPossible > 0
        ? Math.max(0, Math.round(((classPossible - classAbsent) / classPossible) * 100))
        : 100; // default 100 if no data
      return {
        classLabel: `Kelas ${level}`,
        rate
      };
    });

    // Average Exam Scores
    const totalScores = examScores.length;
    const averageScore = totalScores > 0 
      ? Math.round((examScores.reduce((sum, s) => sum + s.score, 0) / totalScores) * 10) / 10 
      : 0;

    // Class average score
    const classAverageScores = Array.from({ length: 6 }, (_, i) => {
      const level = i + 1;
      const classSc = examScores.filter(s => s.classLevel === level);
      const avg = classSc.length > 0 
        ? Math.round((classSc.reduce((sum, s) => sum + s.score, 0) / classSc.length) * 10) / 10 
        : 0;
      return {
        classLabel: `Kelas ${level}`,
        average: avg
      };
    });

    // Gender breakdown
    const genderData = [
      { name: 'Laki-laki', value: maleCount },
      { name: 'Perempuan', value: femaleCount }
    ];

    return {
      totalCount,
      maleCount,
      femaleCount,
      attendanceRate,
      averageScore,
      classCounts,
      classAttendanceRates,
      classAverageScores,
      genderData
    };
  }, [students, attendance, examScores]);

  return (
    <div className="space-y-6" id="dashboard-overview">
      {/* Page Title & Headline */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight" id="dashboard-title">Ikhtisar Administrasi Sekolah</h1>
          <p className="text-sm text-gray-500">Pantau dan kelola data siswa, kehadiran harian, serta perkembangan prestasi belajar siswa kelas 1-6.</p>
        </div>
        <div className="mt-2 md:mt-0 text-xs font-mono text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
          Tahun Ajaran: 2026/2027
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="stat-students">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Siswa Aktif</span>
            <h3 className="text-3xl font-bold text-gray-900">{stats.totalCount}</h3>
            <p className="text-xs text-gray-400">
              {stats.maleCount} Laki-laki / {stats.femaleCount} Perempuan
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Attendance Rate Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="stat-attendance">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Kehadiran</span>
            <h3 className="text-3xl font-bold text-emerald-600">{stats.attendanceRate}%</h3>
            <p className="text-xs text-gray-400">
              Dari seluruh kelas 1-6
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Average Scores Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="stat-scores">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rata-rata Nilai Ujian</span>
            <h3 className="text-3xl font-bold text-amber-500">{stats.averageScore}</h3>
            <p className="text-xs text-gray-400">
              Skala 0 - 100
            </p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Classes Info Card */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between" id="stat-classes">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tingkatan Kelas</span>
            <h3 className="text-3xl font-bold text-purple-600">6 Kelas</h3>
            <p className="text-xs text-gray-400">
              Kelas 1 s/d Kelas 6 SD
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Student Distribution & Gender */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900">Distribusi Jumlah Siswa per Tingkat Kelas</h2>
            <span className="text-xs font-mono bg-indigo-50 text-indigo-700 px-2 py-1 rounded">Aktif</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="classLabel" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB' }}
                  cursor={{ fill: '#F9FAFB' }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={36} name="Jumlah Siswa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <h2 className="text-base font-semibold text-gray-900">Proporsi Gender Siswa</h2>
          <div className="h-44 relative flex items-center justify-center">
            {stats.totalCount > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#4F46E5" />
                    <Cell fill="#EC4899" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 text-sm">Tidak ada data siswa</div>
            )}
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900">{stats.totalCount}</span>
              <span className="text-xxs text-gray-400 uppercase">Siswa</span>
            </div>
          </div>
          <div className="flex justify-around border-t border-gray-50 pt-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
              <span>Laki-laki ({stats.maleCount})</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 rounded-full bg-pink-500"></div>
              <span>Perempuan ({stats.femaleCount})</span>
            </div>
          </div>
        </div>

      </div>

      {/* Performance & Attendance Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance Rates by Class */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Persentase Kehadiran per Tingkat Kelas</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.classAttendanceRates}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="classLabel" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                <Line type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} name="Kehadiran" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Academic Score averages by Class */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Rata-rata Nilai Ujian per Tingkat Kelas</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classAverageScores}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="classLabel" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                <Bar dataKey="average" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Nilai Rata-rata" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Quick Access/Guide */}
      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-semibold text-indigo-900">Sistem Otomatisasi Administrasi Kelas</h3>
          <p className="text-sm text-indigo-700">Gunakan fitur presensi kelas & penilaian ujian pintar untuk menghemat waktu pengelolaan sekolah.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            id="quick-nav-students"
            onClick={() => onNavigate('students')} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-xs transition flex items-center space-x-1"
          >
            <span>Daftar Siswa</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            id="quick-nav-attendance"
            onClick={() => onNavigate('attendance')} 
            className="px-4 py-2 bg-white hover:bg-gray-50 text-indigo-700 text-sm font-medium rounded-xl border border-indigo-200 shadow-xs transition flex items-center space-x-1"
          >
            <span>Input Absen</span>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button 
            id="quick-nav-grades"
            onClick={() => onNavigate('grades')} 
            className="px-4 py-2 bg-white hover:bg-gray-50 text-indigo-700 text-sm font-medium rounded-xl border border-indigo-200 shadow-xs transition flex items-center space-x-1"
          >
            <span>Input Nilai</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
