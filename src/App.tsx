import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck2, 
  GraduationCap, 
  School,
  ChevronRight,
  Menu,
  X,
  Layers,
  Contact,
  Database,
  Sun,
  Moon,
  Printer
} from 'lucide-react';

import { Student, Attendance, ExamScore, Teacher } from './types';
import { 
  subscribeStudents, 
  subscribeAttendance, 
  subscribeExamScores,
  subscribeTeachers,
  seedDemoDataIfEmpty 
} from './dbService';

import DashboardOverview from './components/DashboardOverview';
import StudentManagement from './components/StudentManagement';
import AttendanceManagement from './components/AttendanceManagement';
import GradeManagement from './components/GradeManagement';
import StudentProfile from './components/StudentProfile';
import ClassListManagement from './components/ClassListManagement';
import TeacherManagement from './components/TeacherManagement';
import ImportExportCenter from './components/ImportExportCenter';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Database States
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [examScores, setExamScores] = useState<ExamScore[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Student for Detailed Profile/Rapor
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return systemPreference ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Toggle Theme
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Setup Database Listeners
  useEffect(() => {
    let unsubscribeStudents: (() => void) | null = null;
    let unsubscribeAttendance: (() => void) | null = null;
    let unsubscribeExamScores: (() => void) | null = null;
    let unsubscribeTeachers: (() => void) | null = null;

    async function init() {
      try {
        // Seed initial data if the database is completely brand new/empty
        await seedDemoDataIfEmpty();
      } catch (err) {
        console.log("Seeding process skipped or already seeded.", err);
      }

      // Establish real-time Firestore synchronization
      unsubscribeStudents = subscribeStudents((data) => {
        setStudents(data);
        setLoading(false);
      });

      unsubscribeAttendance = subscribeAttendance((data) => {
        setAttendance(data);
      });

      unsubscribeExamScores = subscribeExamScores((data) => {
        setExamScores(data);
      });

      unsubscribeTeachers = subscribeTeachers((data) => {
        setTeachers(data);
      });
    }

    init();

    return () => {
      if (unsubscribeStudents) unsubscribeStudents();
      if (unsubscribeAttendance) unsubscribeAttendance();
      if (unsubscribeExamScores) unsubscribeExamScores();
      if (unsubscribeTeachers) unsubscribeTeachers();
    };
  }, []);

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setSelectedStudent(null); // Clear selected student on general tab change
    setMobileMenuOpen(false);
  };

  const handleViewStudentProfile = (student: Student) => {
    setSelectedStudent(student);
    setActiveTab('students'); // Ensure we are on the student section to view profile
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 glass-nav border-r border-slate-200/50 dark:border-slate-800/40 shrink-0 no-print">
        {/* Brand / Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/50 dark:border-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">SD NEGERI 1</span>
              <span className="text-xxs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">ADMINISTRASI KELAS</span>
            </div>
          </div>
        </div>

        {/* Navigation Menus */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-3">
            <span className="text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">MENU UTAMA</span>
            
            {/* Quick Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-1 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
              title="Ganti Mode UI"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
          
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => handleNavigate('classes')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'classes'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4.5 h-4.5" />
            <span>Daftar Kelas (1-6)</span>
          </button>

          <button
            onClick={() => handleNavigate('students')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'students'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4.5 h-4.5" />
            <span>Siswa Kelas 1-6</span>
          </button>

          <button
            onClick={() => handleNavigate('attendance')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-4.5 h-4.5" />
            <span>Presensi Harian (Absensi)</span>
          </button>

          <button
            onClick={() => handleNavigate('grades')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'grades'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4.5 h-4.5" />
            <span>Nilai Ujian & Rapor</span>
          </button>

          <button
            onClick={() => handleNavigate('teachers')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'teachers'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Contact className="w-4.5 h-4.5" />
            <span>Data Guru</span>
          </button>

          <button
            onClick={() => handleNavigate('data-center')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              activeTab === 'data-center'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-4.5 h-4.5" />
            <span>Pusat Impor & Ekspor</span>
          </button>
        </nav>

        {/* Teacher Profile / Footer in sidebar */}
        <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold flex items-center justify-center text-xs">
              TR
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Asrudin, S.Pd.</p>
              <p className="text-xxs font-semibold text-slate-400 dark:text-slate-500 uppercase">Guru Utama / Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 h-16 flex items-center justify-between px-4 sticky top-0 z-40 no-print">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
            <School className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="font-extrabold text-xs tracking-tight text-slate-900 dark:text-white block leading-tight">SD NEGERI 1</span>
            <span className="text-xxs font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-bold">ADMINISTRASI KELAS</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white rounded-lg transition"
            title="Ganti Mode UI"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-30 flex flex-col justify-between animate-fade-in no-print">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => handleNavigate('classes')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'classes' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Layers className="w-5 h-5" />
              <span>Daftar Kelas (1-6)</span>
            </button>
            <button
              onClick={() => handleNavigate('students')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'students' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Siswa Kelas 1-6</span>
            </button>
            <button
              onClick={() => handleNavigate('attendance')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'attendance' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <CalendarCheck2 className="w-5 h-5" />
              <span>Presensi Harian (Absensi)</span>
            </button>
            <button
              onClick={() => handleNavigate('grades')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'grades' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span>Nilai Ujian & Rapor</span>
            </button>
            <button
              onClick={() => handleNavigate('teachers')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'teachers' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Contact className="w-5 h-5" />
              <span>Data Guru</span>
            </button>
            <button
              onClick={() => handleNavigate('data-center')}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-xs font-bold rounded-xl ${
                activeTab === 'data-center' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Database className="w-5 h-5" />
              <span>Pusat Impor & Ekspor</span>
            </button>
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                TR
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Asrudin, S.Pd.</p>
                <p className="text-xxs font-semibold text-slate-400 uppercase">Guru Utama / Admin</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full transition-all">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center space-y-4 no-print">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
            <p className="text-sm text-slate-400 font-medium">Menghubungkan ke cloud database...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {selectedStudent ? (
              <StudentProfile 
                student={selectedStudent} 
                attendance={attendance} 
                examScores={examScores} 
                onBack={() => setSelectedStudent(null)} 
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardOverview 
                    students={students} 
                    attendance={attendance} 
                    examScores={examScores} 
                    onNavigate={handleNavigate}
                  />
                )}
                {activeTab === 'classes' && (
                  <ClassListManagement 
                    students={students}
                    teachers={teachers}
                    attendance={attendance}
                    examScores={examScores}
                    onViewStudent={handleViewStudentProfile}
                  />
                )}
                {activeTab === 'students' && (
                  <StudentManagement 
                    students={students} 
                    onViewProfile={handleViewStudentProfile}
                  />
                )}
                {activeTab === 'attendance' && (
                  <AttendanceManagement 
                    students={students} 
                    attendance={attendance}
                  />
                )}
                {activeTab === 'grades' && (
                  <GradeManagement 
                    students={students} 
                    examScores={examScores}
                  />
                )}
                {activeTab === 'teachers' && (
                  <TeacherManagement 
                    teachers={teachers}
                  />
                )}
                {activeTab === 'data-center' && (
                  <ImportExportCenter 
                    students={students}
                    teachers={teachers}
                    attendance={attendance}
                    examScores={examScores}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

    </div>
  );
}

