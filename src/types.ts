export interface Student {
  id?: string;
  name: string;
  nisn: string;
  gender: 'Laki-laki' | 'Perempuan';
  dob: string; // YYYY-MM-DD
  classLevel: number; // 1-6
  status: 'Aktif' | 'Alumni' | 'Keluar';
  address: string;
  parentPhone: string;
}

export interface Attendance {
  id?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  classLevel: number;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  notes?: string;
}

export interface ExamScore {
  id?: string;
  studentId: string;
  classLevel: number;
  subject: string;
  examType: 'Harian' | 'UTS' | 'UAS';
  score: number;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface Teacher {
  id?: string;
  name: string;
  nip: string; // National Teacher ID Number
  gender: 'Laki-laki' | 'Perempuan';
  subject: string; // Subject taught
  classLevel: number; // Wali Kelas level (1-6, or 0 for none)
  status: 'PNS' | 'PPPK' | 'Honorer';
  phone: string;
}

export const SUBJECT_OPTIONS = [
  'Matematika',
  'IPA',
  'IPS',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Pancasila',
  'PJOK',
  'Seni Budaya'
];

export const EXAM_TYPES = ['Harian', 'UTS', 'UAS'] as const;

export interface StudentStats {
  attendanceRate: number; // percentage
  averageScore: number;
  scoresCount: number;
  attendanceCounts: {
    Hadir: number;
    Sakit: number;
    Izin: number;
    Alpa: number;
  };
}
