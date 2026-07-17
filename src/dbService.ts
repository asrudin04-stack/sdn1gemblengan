import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Student, Attendance, ExamScore, Teacher } from './types';

// Collections
const studentsCol = collection(db, 'students');
const attendanceCol = collection(db, 'attendance');
const examScoresCol = collection(db, 'examScores');
const teachersCol = collection(db, 'teachers');

// --- Students ---
export function subscribeStudents(callback: (students: Student[]) => void) {
  return onSnapshot(studentsCol, (snapshot) => {
    const list: Student[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Student);
    });
    callback(list);
  });
}

export async function addStudent(student: Student) {
  return await addDoc(studentsCol, student);
}

export async function updateStudent(id: string, student: Partial<Student>) {
  const docRef = doc(db, 'students', id);
  return await updateDoc(docRef, student);
}

export async function deleteStudent(id: string) {
  const docRef = doc(db, 'students', id);
  return await deleteDoc(docRef);
}

// Bulk save students (used in import)
export async function saveBulkStudents(records: Omit<Student, 'id'>[]) {
  const batch = writeBatch(db);
  for (const record of records) {
    // Check if duplicate NISN exists
    const q = query(studentsCol, where('nisn', '==', record.nisn));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const docRef = doc(db, 'students', docSnap.id);
        batch.update(docRef, record);
      });
    } else {
      const newDocRef = doc(studentsCol);
      batch.set(newDocRef, record);
    }
  }
  await batch.commit();
}

// --- Teachers ---
export function subscribeTeachers(callback: (teachers: Teacher[]) => void) {
  return onSnapshot(teachersCol, (snapshot) => {
    const list: Teacher[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Teacher);
    });
    callback(list);
  });
}

export async function addTeacher(teacher: Teacher) {
  return await addDoc(teachersCol, teacher);
}

export async function updateTeacher(id: string, teacher: Partial<Teacher>) {
  const docRef = doc(db, 'teachers', id);
  return await updateDoc(docRef, teacher);
}

export async function deleteTeacher(id: string) {
  const docRef = doc(db, 'teachers', id);
  return await deleteDoc(docRef);
}

export async function saveBulkTeachers(records: Omit<Teacher, 'id'>[]) {
  const batch = writeBatch(db);
  for (const record of records) {
    // Check if duplicate NIP exists
    const q = query(teachersCol, where('nip', '==', record.nip));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach((docSnap) => {
        const docRef = doc(db, 'teachers', docSnap.id);
        batch.update(docRef, record);
      });
    } else {
      const newDocRef = doc(teachersCol);
      batch.set(newDocRef, record);
    }
  }
  await batch.commit();
}

// --- Attendance ---
export function subscribeAttendance(callback: (attendance: Attendance[]) => void) {
  return onSnapshot(attendanceCol, (snapshot) => {
    const list: Attendance[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Attendance);
    });
    callback(list);
  });
}

export async function saveBulkAttendance(records: Omit<Attendance, 'id'>[]) {
  // To avoid writing records multiple times for the same student + date,
  // we first query if there are existing records and overwrite/update or replace them.
  const batch = writeBatch(db);
  
  for (const record of records) {
    // Check if an attendance record for this student and date already exists
    const q = query(
      attendanceCol, 
      where('studentId', '==', record.studentId),
      where('date', '==', record.date)
    );
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      // Update existing
      snap.forEach((docSnap) => {
        const docRef = doc(db, 'attendance', docSnap.id);
        batch.update(docRef, record);
      });
    } else {
      // Create new
      const newDocRef = doc(attendanceCol);
      batch.set(newDocRef, record);
    }
  }
  
  await batch.commit();
}

export async function deleteAttendance(id: string) {
  const docRef = doc(db, 'attendance', id);
  return await deleteDoc(docRef);
}

// --- Exam Scores ---
export function subscribeExamScores(callback: (scores: ExamScore[]) => void) {
  return onSnapshot(examScoresCol, (snapshot) => {
    const list: ExamScore[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ExamScore);
    });
    callback(list);
  });
}

export async function saveBulkExamScores(records: Omit<ExamScore, 'id'>[]) {
  const batch = writeBatch(db);
  
  for (const record of records) {
    // Check if score exists for student, subject, classLevel, examType
    const q = query(
      examScoresCol,
      where('studentId', '==', record.studentId),
      where('subject', '==', record.subject),
      where('examType', '==', record.examType),
      where('classLevel', '==', record.classLevel)
    );
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      // Update existing
      snap.forEach((docSnap) => {
        const docRef = doc(db, 'examScores', docSnap.id);
        batch.update(docRef, record);
      });
    } else {
      // Create new
      const newDocRef = doc(examScoresCol);
      batch.set(newDocRef, record);
    }
  }
  
  await batch.commit();
}

export async function deleteExamScore(id: string) {
  const docRef = doc(db, 'examScores', id);
  return await deleteDoc(docRef);
}

// --- Demo Data Seeding ---
// We can seed a few demo students so the user doesn't start with a blank screen!
// This makes the app immediately look beautiful and populated.
export async function seedDemoDataIfEmpty() {
  const snap = await getDocs(studentsCol);
  if (snap.empty) {
    const demoStudents: Student[] = [
      { name: "Andi Saputra", nisn: "0123456781", gender: "Laki-laki", dob: "2015-04-12", classLevel: 4, status: "Aktif", address: "Jl. Merdeka No. 10", parentPhone: "081234567890" },
      { name: "Budi Wijaya", nisn: "0123456782", gender: "Laki-laki", dob: "2015-08-22", classLevel: 4, status: "Aktif", address: "Jl. Sudirman No. 22", parentPhone: "081234567891" },
      { name: "Citra Lestari", nisn: "0123456783", gender: "Perempuan", dob: "2015-01-05", classLevel: 4, status: "Aktif", address: "Jl. Diponegoro No. 5", parentPhone: "081234567892" },
      { name: "Dewi Sartika", nisn: "0123456784", gender: "Perempuan", dob: "2014-11-15", classLevel: 5, status: "Aktif", address: "Jl. Kartini No. 8", parentPhone: "081234567893" },
      { name: "Eko Prasetyo", nisn: "0123456785", gender: "Laki-laki", dob: "2014-03-30", classLevel: 5, status: "Aktif", address: "Jl. Ahmad Yani No. 15", parentPhone: "081234567894" },
      { name: "Fanya Aurelia", nisn: "0123456786", gender: "Perempuan", dob: "2016-06-18", classLevel: 3, status: "Aktif", address: "Jl. Gatot Subroto No. 12", parentPhone: "081234567895" },
      { name: "Gilang Ramadhan", nisn: "0123456787", gender: "Laki-laki", dob: "2016-10-09", classLevel: 3, status: "Aktif", address: "Jl. Sisingamangaraja No. 3", parentPhone: "081234567896" },
      { name: "Hana Salsabila", nisn: "0123456788", gender: "Perempuan", dob: "2017-02-14", classLevel: 2, status: "Aktif", address: "Jl. Gajah Mada No. 44", parentPhone: "081234567897" },
      { name: "Irfan Hakim", nisn: "0123456789", gender: "Laki-laki", dob: "2017-09-01", classLevel: 2, status: "Aktif", address: "Jl. Hayam Wuruk No. 18", parentPhone: "081234567898" },
      { name: "Joko Widodo", nisn: "0123456790", gender: "Laki-laki", dob: "2018-05-20", classLevel: 1, status: "Aktif", address: "Jl. Slamet Riyadi No. 1", parentPhone: "081234567899" }
    ];

    for (const student of demoStudents) {
      await addStudent(student);
    }
    console.log("Demo students seeded successfully.");
  }

  const tSnap = await getDocs(teachersCol);
  if (tSnap.empty) {
    const demoTeachers: Teacher[] = [
      { name: "Siti Rahmawati, S.Pd.", nip: "198205122009122001", gender: "Perempuan", subject: "Bahasa Indonesia", classLevel: 1, status: "PNS", phone: "085234567111" },
      { name: "Bambang Susilo, M.Pd.", nip: "197804032005011002", gender: "Laki-laki", subject: "Matematika", classLevel: 6, status: "PNS", phone: "085234567222" },
      { name: "Rina Wijayanti, S.Pd.", nip: "199009152019032003", gender: "Perempuan", subject: "IPA", classLevel: 4, status: "PPPK", phone: "085234567333" },
      { name: "Agus Harimurti, S.Pd.", nip: "198501012010121004", gender: "Laki-laki", subject: "IPS", classLevel: 5, status: "PNS", phone: "085234567444" },
      { name: "Eka Putri, S.Pd.", nip: "199511202022212005", gender: "Perempuan", subject: "Bahasa Inggris", classLevel: 2, status: "Honorer", phone: "085234567555" },
      { name: "Yudi Kristanto, S.Pd.", nip: "198808082015031006", gender: "Laki-laki", subject: "PJOK", classLevel: 3, status: "PPPK", phone: "085234567666" }
    ];

    for (const teacher of demoTeachers) {
      await addTeacher(teacher);
    }
    console.log("Demo teachers seeded successfully.");
  }
}
