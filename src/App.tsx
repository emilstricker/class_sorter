import React, { useState, useRef, useEffect } from 'react';
import { Student, ClassInfo, Gender, Level, Workspace, JoinRequest } from './types';
import { StudentCard } from './components/StudentCard';
import { ClassBoard } from './components/ClassBoard';
import { EditModal } from './components/EditModal';
import { StatsModal } from './components/StatsModal';
import { StudentTableView } from './components/StudentTableView';
import { SmartImportModal } from './components/SmartImportModal';
import { Upload, Users, AlertCircle, Trash2, Loader2, List, Wand2, RotateCcw, Eye, EyeOff, Download, UploadCloud, ShieldCheck, Settings, X, ArrowUpDown, Search, BarChart3, Printer, Layout, LogOut, Share2, Bell, Check, Eraser } from 'lucide-react';
import CleanupNamesModal from './components/CleanupNamesModal';
import { EditClassModal } from './components/EditClassModal';
import { useAuth } from './AuthContext';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch, getDocs, query, where, updateDoc } from 'firebase/firestore';

type SortField = 'name' | 'abilityLevel' | 'socialSkill' | 'behavioralIntensity' | 'supportLevel';

const processImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Resize to a maximum of 140x200 to keep the base64 string small for localStorage and Firestore
        const MAX_WIDTH = 140;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress to 80% quality JPEG
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function App() {
  const { user, signOut } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspacesLoaded, setWorkspacesLoaded] = useState(false);
  const prevWorkspaces = useRef<Workspace[]>([]);
  const [joinDialogDetails, setJoinDialogDetails] = useState<{ id: string, requested: boolean, error?: string } | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [userSettings, setUserSettings] = useState<{ activeWorkspaceId?: string } | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [hideCardDetails, setHideCardDetails] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showPrintHint, setShowPrintHint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Listen to workspaces
  useEffect(() => {
    if (!user) return;
    
    // Listen to settings
    const unsubSettings = onSnapshot(doc(db, 'users', user.uid, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setUserSettings(docSnap.data() as any);
      }
      setSettingsLoaded(true);
    }, (error) => {
      console.error("Settings error:", error);
      setSettingsLoaded(true); // Don't block
    });

    const q = query(collection(db, 'workspaces'), where('members', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const w: Workspace[] = [];
      snapshot.forEach(doc => w.push(doc.data() as Workspace));
      
      // Auto-switch to newly joined workspaces (if we already loaded at least once)
      if (prevWorkspaces.current.length > 0 && w.length > prevWorkspaces.current.length) {
         const newIds = w.map(x => x.id);
         const oldIds = prevWorkspaces.current.map(x => x.id);
         const addedId = newIds.find(id => !oldIds.includes(id));
         if (addedId) {
            const addedWorkspace = w.find(x => x.id === addedId);
            if (addedWorkspace) {
               setActiveWorkspace(addedWorkspace);
               showToast(`Skiftede til det nye arbejdsrum: ${addedWorkspace.name}`);
            }
         }
      } else {
         // Update activeWorkspace if its properties changed
         setActiveWorkspace(prev => {
            if (!prev) return null;
            const updated = w.find(x => x.id === prev.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(prev)) {
               return updated;
            }
            return prev;
         });
      }
      prevWorkspaces.current = w;
      
      setWorkspaces(w);
      setWorkspacesLoaded(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workspaces');
    });
    return () => {
      unsubscribe();
      unsubSettings();
    };
  }, [user]);

  // Handle active workspace and join logic
  useEffect(() => {
    if (!user || !workspacesLoaded || !settingsLoaded) return;
    
    // Process URL parameter
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');

    if (joinId) {
      if (workspaces.some(w => w.id === joinId)) {
        // Already a member, select it
        setActiveWorkspace(workspaces.find(w => w.id === joinId)!);
        window.history.replaceState({}, '', '/');
        showToast("Du er allerede medlem af dette arbejdsrum.");
      } else {
        // Show join dialog if not requested yet
        setJoinDialogDetails({ id: joinId, requested: false });
        window.history.replaceState({}, '', '/'); // Remove from URL to avoid loop
      }
    } else {
      // Normal flow - select workspace if nothing active
      if (workspaces.length > 0 && (!activeWorkspace || !workspaces.some(w => w.id === activeWorkspace.id))) {
        let savedWorkspace = null;
        if (userSettings?.activeWorkspaceId) {
          savedWorkspace = workspaces.find(w => w.id === userSettings.activeWorkspaceId);
        }
        if (!savedWorkspace) {
          const savedId = localStorage.getItem(`activeWorkspace_${user.uid}`);
          savedWorkspace = savedId ? workspaces.find(w => w.id === savedId) : null;
        }
        setActiveWorkspace(savedWorkspace || workspaces[0]);
      } else if (workspaces.length === 0) {
        // Create new default workspace if user literally has none
        const createDefault = async () => {
          const newId = doc(collection(db, 'workspaces')).id;
          const newWs: Workspace = {
             id: newId,
             name: 'Min Skole',
             ownerId: user.uid,
             members: [user.uid],
             numClasses: 3
          };
          try {
            await setDoc(doc(db, 'workspaces', newId), newWs);
            const oldQuery = await getDocs(collection(db, 'users', user.uid, 'students'));
            if (!oldQuery.empty) {
              const batch = writeBatch(db);
              let count = 0;
              oldQuery.forEach(docSnap => {
                const data = docSnap.data() as Student;
                data.workspaceId = newId;
                data.members = [user.uid];
                batch.set(doc(db, 'workspaces', newId, 'students', data.id), data);
                count++;
              });
              if (count > 0) {
                await batch.commit();
                showToast(`Migrerede ${count} elever til dit nye arbejdsrum!`);
              }
            }
          } catch (e) {
            console.error(e);
          }
        };
        createDefault();
      }
    }
  }, [user, workspacesLoaded, workspaces.length, activeWorkspace]);

  useEffect(() => {
    if (user && activeWorkspace) {
      localStorage.setItem(`activeWorkspace_${user.uid}`, activeWorkspace.id);
      if (userSettings?.activeWorkspaceId !== activeWorkspace.id) {
         setDoc(doc(db, 'users', user.uid, 'settings', 'main'), { activeWorkspaceId: activeWorkspace.id }, { merge: true }).catch(console.error);
      }
    }
  }, [user, activeWorkspace, userSettings?.activeWorkspaceId]);

  useEffect(() => {
    if (!user || !activeWorkspace) return;
    
    // Listen to students
    const qStudents = query(collection(db, 'workspaces', activeWorkspace.id, 'students'), where('members', 'array-contains', user.uid));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const loaded: Student[] = [];
      snapshot.forEach(doc => {
        loaded.push(doc.data() as Student);
      });
      setStudents(loaded);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    // Listen to join requests if owner
    let unsubReq = () => {};
    if (activeWorkspace.ownerId === user.uid) {
      unsubReq = onSnapshot(collection(db, 'workspaces', activeWorkspace.id, 'joinRequests'), (snapshot) => {
        const reqs: JoinRequest[] = [];
        snapshot.forEach(d => reqs.push(d.data() as JoinRequest));
        setJoinRequests(reqs);
      });
    } else {
      setJoinRequests([]); // Clear if switching workspace
    }

    return () => {
      unsubStudents();
      unsubReq();
    };
  }, [user, activeWorkspace]);

  const updateSettingInFirestore = async (newNumClasses: number) => {
    if (!user || !activeWorkspace) return;
    try {
      await updateDoc(doc(db, 'workspaces', activeWorkspace.id), { numClasses: newNumClasses });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}`);
    }
  };

  const syncStudentToFirestore = async (student: Student) => {
    if (!user || !activeWorkspace) return;
    try {
      const s = { ...student, workspaceId: activeWorkspace.id, members: activeWorkspace.members };
      await setDoc(doc(db, 'workspaces', activeWorkspace.id, 'students', student.id), s);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}/students/${student.id}`);
    }
  };

  const deleteStudentFromFirestore = async (studentId: string) => {
    if (!user || !activeWorkspace) return;
    try {
      await deleteDoc(doc(db, 'workspaces', activeWorkspace.id, 'students', studentId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `workspaces/${activeWorkspace.id}/students/${studentId}`);
    }
  };

  const deleteAllStudentsFromFirestore = async (studentsList: Student[]) => {
    if (!user || !activeWorkspace) return;
    try {
      const batch = writeBatch(db);
      studentsList.forEach(s => {
        batch.delete(doc(db, 'workspaces', activeWorkspace.id, 'students', s.id));
      });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}/students`);
    }
  };

  const CLASSES: ClassInfo[] = Array.from({ length: Math.max(0, (activeWorkspace?.numClasses || 3) - 1) }, (_, i) => {
    const classId = `class-${String.fromCharCode(97 + i)}`;
    const settings = activeWorkspace?.classSettings?.[classId];
    return {
      id: classId,
      name: settings?.name || `Klasse ${String.fromCharCode(65 + i)}`,
      teacherName: settings?.teacherName
    };
  });

  const nestSettings = activeWorkspace?.classSettings?.['class-nest'];
  CLASSES.push({ 
    id: 'class-nest', 
    name: nestSettings?.name || 'NEST-klasse', 
    teacherName: nestSettings?.teacherName,
    maxInternal: 16, 
    externalSlots: 5 
  });

  const handleUpdateClassSettings = async (classId: string, name: string, teacherName: string) => {
    if (!user || !activeWorkspace) return;
    try {
      const updatedSettings = {
        ...(activeWorkspace.classSettings || {}),
        [classId]: { name, teacherName }
      };
      await updateDoc(doc(db, 'workspaces', activeWorkspace.id), { classSettings: updatedSettings });
      showToast(`Klasseoplysninger opdateret`);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}`);
    }
  };

  const sortStudents = (a: Student, b: Student) => {
    let comparison = 0;
    if (sortField === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = a[sortField] - b[sortField];
      // If the primary sort is equal, fallback to name
      if (comparison === 0) {
        return a.name.localeCompare(b.name);
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  };

  const globalSearchLower = globalSearch.toLowerCase();

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(globalSearchLower)
  );

  const unassignedStudents = filteredStudents
    .filter(s => s.classId === null)
    .sort(sortStudents);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const batchCommitAll = async (newStudentsList: Student[]) => {
    if (!user || !activeWorkspace) return;
    try {
      for (let i = 0; i < newStudentsList.length; i += 400) {
        const chunk = newStudentsList.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(s => {
          const mapped = { ...s, workspaceId: activeWorkspace.id, members: activeWorkspace.members };
          batch.set(doc(db, 'workspaces', activeWorkspace.id, 'students', mapped.id), mapped);
        });
        await batch.commit();
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}/students-batch`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    try {
      const newStudentsPromises = Array.from(files).map(async (file: File, index) => {
        const base64Url = await processImage(file);
        const nameMatch = file.name.replace(/\.[^/.]+$/, "");
        
        return {
          id: crypto.randomUUID(),
          name: nameMatch || `Student ${students.length + index + 1}`,
          photoUrl: base64Url,
          gender: 'Unknown',
          abilityLevel: 3,
          socialSkill: 3,
          behavioralIntensity: 3,
          supportLevel: 3,
          friendships: [],
          conflicts: [],
          classId: null,
        } as Student;
      });

      const newStudents = await Promise.all(newStudentsPromises);
      await batchCommitAll(newStudents);
      showToast(`Behandlede ${newStudents.length} billeder.`);
    } catch (error) {
      showToast("Fejl ved behandling af nogle billeder.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragStart = (e: React.DragEvent, studentId: string) => {
    if (isBulkMode) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('studentId', studentId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetClassId: string | null) => {
    e.preventDefault();
    if (isBulkMode || !user) return;
    
    const studentId = e.dataTransfer.getData('studentId');
    if (!studentId) return;

    if (targetClassId) {
      const targetClass = CLASSES.find(c => c.id === targetClassId);
      const movingStudent = students.find(s => s.id === studentId);

      // If student is NestExternal, they MUST stay in NEST class
      if (movingStudent?.isNestExternal && targetClassId !== 'class-nest') {
        showToast("Visiterede elever skal blive i NEST-klassen.");
        return;
      }

      if (targetClass?.maxInternal) {
        const currentInternalCount = students.filter(s => s.classId === targetClassId && s.id !== studentId && !s.isNestExternal).length;
        if (currentInternalCount >= targetClass.maxInternal && !movingStudent?.isNestExternal) {
          showToast(`Kan ikke tilføje til ${targetClass.name}. Maksimal kapacitet på ${targetClass.maxInternal} nået.`);
          return;
        }
      }
    }

    const student = students.find(s => s.id === studentId);
    if (student) {
      await syncStudentToFirestore({ ...student, classId: targetClassId });
    }
  };

  const handleSaveStudent = async (updated: Student) => {
    if (!user || !activeWorkspace) return;
    
    // If marked as NEST-external, auto-assign to NEST class
    if (updated.isNestExternal) {
      updated.classId = 'class-nest';
    }

    const batch = writeBatch(db);
    const mappedUpdated = { ...updated, workspaceId: activeWorkspace.id, members: activeWorkspace.members };
    batch.set(doc(db, 'workspaces', activeWorkspace.id, 'students', updated.id), mappedUpdated);

    // Update relationships for other students mutually
    students.forEach(s => {
      if (s.id === updated.id) return;
      
      const isFriend = updated.friendships?.includes(s.id);
      const isConflict = updated.conflicts?.includes(s.id);
      
      let newFriendships = s.friendships || [];
      let newConflicts = s.conflicts || [];
      
      if (isFriend) {
        if (!newFriendships.includes(updated.id)) newFriendships = [...newFriendships, updated.id];
        newConflicts = newConflicts.filter(id => id !== updated.id);
      } else if (isConflict) {
        if (!newConflicts.includes(updated.id)) newConflicts = [...newConflicts, updated.id];
        newFriendships = newFriendships.filter(id => id !== updated.id);
      } else {
        newFriendships = newFriendships.filter(id => id !== updated.id);
        newConflicts = newConflicts.filter(id => id !== updated.id);
      }
      
      if (
        newFriendships.length !== (s.friendships || []).length || 
        newConflicts.length !== (s.conflicts || []).length
      ) {
        const mappedS = { ...s, friendships: newFriendships, conflicts: newConflicts, workspaceId: activeWorkspace.id, members: activeWorkspace.members };
        batch.set(doc(db, 'workspaces', activeWorkspace.id, 'students', s.id), mappedS);
      }
    });

    try {
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}/students-batch`);
    }

    setEditingStudent(null);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!user || !activeWorkspace) return;
    await deleteStudentFromFirestore(id);
    
    const batch = writeBatch(db);
    let changed = false;
    students.forEach(s => {
      if (s.id === id) return;
      const newFriendships = s.friendships?.filter(fId => fId !== id) || [];
      const newConflicts = s.conflicts?.filter(cId => cId !== id) || [];
      
      if (
        newFriendships.length !== (s.friendships || []).length || 
        newConflicts.length !== (s.conflicts || []).length
      ) {
        changed = true;
        const mappedS = { ...s, friendships: newFriendships, conflicts: newConflicts, workspaceId: activeWorkspace.id, members: activeWorkspace.members };
        batch.set(doc(db, 'workspaces', activeWorkspace.id, 'students', s.id), mappedS);
      }
    });
    
    if (changed) {
      try {
        await batch.commit();
      } catch (e) {
         handleFirestoreError(e, OperationType.WRITE, `workspaces/${activeWorkspace.id}/students-batch`);
      }
    }
    setEditingStudent(null);
  };

  const handleToggleLock = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      await syncStudentToFirestore({ ...student, isLocked: !student.isLocked });
    }
  };

  const handleUnassignAll = () => {
    if (students.length === 0) return;
    setShowUnassignConfirm(true);
  };

  const handleExport = () => {
    if (students.length === 0) {
      showToast("Ingen data at eksportere.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(students));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "klassesortering-backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("Data eksporteret korrekt.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedStudents = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedStudents)) {
          // Ensure reciprocal relationships
          const fixedStudents = importedStudents.map(s => {
            const newFriendships = new Set(s.friendships || []);
            const newConflicts = new Set(s.conflicts || []);
            
            importedStudents.forEach(other => {
              if (other.id !== s.id) {
                if (other.friendships?.includes(s.id)) newFriendships.add(other.id);
                if (other.conflicts?.includes(s.id)) newConflicts.add(other.id);
              }
            });
            
            // Remove conflicts if they are also in friendships (friendships take precedence)
            newFriendships.forEach(id => newConflicts.delete(id));
            
            return {
              ...s,
              friendships: Array.from(newFriendships),
              conflicts: Array.from(newConflicts)
            };
          });
          batchCommitAll(fixedStudents);
          showToast("Data blev importeret korrekt.");
        } else {
          showToast("Ugyldigt format på backup-fil.");
        }
      } catch (err) {
        showToast("Fejl ved import af data. Filen kan være beskadiget.");
      }
    };
    reader.readAsText(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const handleAutoSort = () => {
    if (unassignedStudents.length === 0) {
      showToast("Ingen ikke-tildelte elever at fordele!");
      return;
    }

    const getNum = (val: any, fallback: number = 3) => {
      const n = Number(val);
      return isNaN(n) ? fallback : n;
    };

    const getGender = (val: any) => {
      if (['Boy', 'Girl', 'Other', 'Unknown'].includes(val)) return val;
      return 'Unknown';
    };

    const classSizes: Record<string, number> = {};
    const classGenders: Record<string, Record<string, number>> = {};
    const classAbilitySums: Record<string, number> = {};
    const classSocialSums: Record<string, number> = {};
    const classBehaviorSums: Record<string, number> = {};
    const classSupportSums: Record<string, number> = {};
    const classDSACounts: Record<string, number> = {};
    const classSPSCounts: Record<string, number> = {};
    const classMedicalCounts: Record<string, number> = {};

    CLASSES.forEach(c => {
      classSizes[c.id] = 0;
      classGenders[c.id] = { Boy: 0, Girl: 0, Other: 0, Unknown: 0 };
      classAbilitySums[c.id] = 0;
      classSocialSums[c.id] = 0;
      classBehaviorSums[c.id] = 0;
      classSupportSums[c.id] = 0;
      classDSACounts[c.id] = 0;
      classSPSCounts[c.id] = 0;
      classMedicalCounts[c.id] = 0;
    });

    // Account for already assigned students
    students.forEach(s => {
      if (s.classId && classSizes[s.classId] !== undefined) {
        classSizes[s.classId]++;
        classGenders[s.classId][getGender(s.gender)]++;
        classAbilitySums[s.classId] += getNum(s.abilityLevel);
        classSocialSums[s.classId] += getNum(s.socialSkill);
        classBehaviorSums[s.classId] += getNum(s.behavioralIntensity);
        classSupportSums[s.classId] += getNum(s.supportLevel);
        if (s.isDSA) classDSACounts[s.classId]++;
        if (s.isSPS) classSPSCounts[s.classId]++;
        if (s.isMedical) classMedicalCounts[s.classId]++;
      }
    });

    // Calculate global averages for balancing
    const totalStudents = students.length;
    const globalAvgAbility = students.reduce((sum, s) => sum + getNum(s.abilityLevel), 0) / totalStudents;
    const globalAvgSocial = students.reduce((sum, s) => sum + getNum(s.socialSkill), 0) / totalStudents;
    const globalAvgBehavior = students.reduce((sum, s) => sum + getNum(s.behavioralIntensity), 0) / totalStudents;
    const globalAvgSupport = students.reduce((sum, s) => sum + getNum(s.supportLevel), 0) / totalStudents;
    const globalAvgDSA = students.filter(s => s.isDSA).length / totalStudents;
    const globalAvgSPS = students.filter(s => s.isSPS).length / totalStudents;
    const globalAvgMedical = students.filter(s => s.isMedical).length / totalStudents;

    // Calculate target sizes for proportional filling
    const targetSizes: Record<string, number> = {};
    let remainingCapacity = totalStudents;
    let unconstrainedClasses = 0;

    CLASSES.forEach(c => {
      if (c.maxInternal) {
        targetSizes[c.id] = Math.min(c.maxInternal, Math.ceil(totalStudents / CLASSES.length));
        remainingCapacity -= targetSizes[c.id];
      } else {
        unconstrainedClasses++;
      }
    });

    CLASSES.forEach(c => {
      if (!c.maxInternal) {
        targetSizes[c.id] = remainingCapacity / Math.max(1, unconstrainedClasses);
      }
    });

    const getExtremeness = (s: Student) => 
      Math.abs(getNum(s.abilityLevel) - 3) + 
      Math.abs(getNum(s.socialSkill) - 3) + 
      Math.abs(getNum(s.behavioralIntensity) - 3) + 
      Math.abs(getNum(s.supportLevel) - 3) +
      (s.isDSA ? 2 : 0) +
      (s.isSPS ? 2 : 0) +
      (s.isMedical ? 1 : 0);

    // Sort unassigned students by extremeness descending, so we place the hardest-to-place students first
    // Add a random tie-breaker so we don't always get the exact same sorting order
    const studentsToSort = [...unassignedStudents].sort((a, b) => {
      const diff = getExtremeness(b) - getExtremeness(a);
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

    const newStudents = [...students];
    let unassignedCount = 0;

    studentsToSort.forEach(student => {
      let validClasses = CLASSES.filter(c => !c.maxInternal || classSizes[c.id] < c.maxInternal);
      
      // Respect avoidNestClass
      if (student.avoidNestClass) {
        validClasses = validClasses.filter(c => c.id !== 'class-nest');
      }

      if (validClasses.length === 0) {
        unassignedCount++;
        return;
      }

      let bestClass = validClasses[0];
      let bestScore = Infinity;

      validClasses.forEach(c => {
        let score = 0;

        // 1. Size balancing (proportional fill rate)
        const safeTarget = Math.max(0.1, targetSizes[c.id]);
        const fillRate = classSizes[c.id] / safeTarget;
        score += fillRate * 10000;

        // 2. Gender balancing
        const genderRate = classGenders[c.id][getGender(student.gender)] / safeTarget;
        score += genderRate * 5000;

        // 3. Average Ability balancing
        const newAvgAbility = (classAbilitySums[c.id] + getNum(student.abilityLevel)) / (classSizes[c.id] + 1);
        const abilityDiff = Math.abs(newAvgAbility - globalAvgAbility);
        score += abilityDiff * 4000;

        // 4. Average Social balancing
        const newAvgSocial = (classSocialSums[c.id] + getNum(student.socialSkill)) / (classSizes[c.id] + 1);
        const socialDiff = Math.abs(newAvgSocial - globalAvgSocial);
        score += socialDiff * 4000;

        // 5. Average Behavior balancing
        const newAvgBehavior = (classBehaviorSums[c.id] + getNum(student.behavioralIntensity)) / (classSizes[c.id] + 1);
        const behaviorDiff = Math.abs(newAvgBehavior - globalAvgBehavior);
        score += behaviorDiff * 4000;

        // 6. Average Support balancing
        const newAvgSupport = (classSupportSums[c.id] + getNum(student.supportLevel)) / (classSizes[c.id] + 1);
        const supportDiff = Math.abs(newAvgSupport - globalAvgSupport);
        score += supportDiff * 4000;

        // 7. Special Designations balancing
        if (student.isDSA) {
          const newAvgDSA = (classDSACounts[c.id] + 1) / (classSizes[c.id] + 1);
          score += Math.abs(newAvgDSA - globalAvgDSA) * 3000;
        }
        if (student.isSPS) {
          const newAvgSPS = (classSPSCounts[c.id] + 1) / (classSizes[c.id] + 1);
          score += Math.abs(newAvgSPS - globalAvgSPS) * 3000;
        }
        if (student.isMedical) {
          const newAvgMedical = (classMedicalCounts[c.id] + 1) / (classSizes[c.id] + 1);
          score += Math.abs(newAvgMedical - globalAvgMedical) * 3000;
        }

        // 8. NEST Extreme penalty
        if (c.id === 'class-nest') {
          score += getExtremeness(student) * 150; 
          // NEST should be slightly calmer
          score += (getNum(student.behavioralIntensity) - 3) * 300;
        }

        // 9. Friendships
        (student.friendships || []).forEach(friendId => {
          const friend = newStudents.find(s => s.id === friendId);
          if (friend?.classId === c.id) {
            score -= 3000; // Bonus for being with a friend
          }
        });

        // 9.1 Wishes (Prioritized)
        (student.wishes || []).forEach((wishId, index) => {
          const wish = newStudents.find(s => s.id === wishId);
          if (wish?.classId === c.id) {
            // Higher priority (lower index) gives more bonus
            // 1st wish: -2000, 2nd: -1500, 3rd: -1000, etc.
            const wishBonus = Math.max(500, 2000 - (index * 500));
            score -= wishBonus;
          }
        });

        // 10. Conflicts
        (student.conflicts || []).forEach(conflictId => {
          const conflict = newStudents.find(s => s.id === conflictId);
          if (conflict?.classId === c.id) {
            score += 8000; // Heavy penalty for being with a conflict
          }
        });

        // 11. NEST Preference
        if (student.preferNestClass && c.id === 'class-nest') {
          score -= 5000; // Strong bonus for preferring NEST
        }

        // 11. Randomness (Adds variety to each auto-sort run)
        score += Math.random() * 400;

        // Ensure score is a valid number, otherwise fallback to a large number
        if (isNaN(score)) score = 999999;

        if (score < bestScore) {
          bestScore = score;
          bestClass = c;
        }
      });

      // Update trackers
      classSizes[bestClass.id]++;
      classGenders[bestClass.id][getGender(student.gender)]++;
      classAbilitySums[bestClass.id] += getNum(student.abilityLevel);
      classSocialSums[bestClass.id] += getNum(student.socialSkill);
      classBehaviorSums[bestClass.id] += getNum(student.behavioralIntensity);
      classSupportSums[bestClass.id] += getNum(student.supportLevel);
      if (student.isDSA) classDSACounts[bestClass.id]++;
      if (student.isSPS) classSPSCounts[bestClass.id]++;
      if (student.isMedical) classMedicalCounts[bestClass.id]++;

      // Update student
      const index = newStudents.findIndex(s => s.id === student.id);
      if (index !== -1) {
        newStudents[index] = { ...newStudents[index], classId: bestClass.id };
      }
    });

    batchCommitAll(newStudents);
    if (unassignedCount > 0) {
      showToast(`Auto-fordeling færdig, men ${unassignedCount} elever kunne ikke placeres pga. klassekvotienter.`);
    } else {
      showToast("Alle elever er nu fordelt automatisk!");
    }
  };

  const handleSmartImport = (parsedData: any[]) => {
    let newStudents = [...students];
    parsedData.forEach(data => {
      const studentIndex = newStudents.findIndex(s => s.id === data.studentId);
      if (studentIndex === -1) return; // Skip if not found
      
      const student = { ...newStudents[studentIndex] };
      
      if (data.notes) student.notes = (student.notes ? student.notes + '\n' : '') + data.notes;
      if (data.preferNestClass) student.preferNestClass = true;
      if (data.isNestExternal) student.isNestExternal = true;
      if (data.isDyslexic) student.isDyslexic = true;
      if (data.isExtraAttention) student.isExtraAttention = true;
      if (data.extraAttentionNotes) student.extraAttentionNotes = data.extraAttentionNotes;
      
      if (data.wishesIds && Array.isArray(data.wishesIds)) {
        student.wishes = [...new Set([...(student.wishes || []), ...data.wishesIds])];
      }
      
      if (data.conflictsIds && Array.isArray(data.conflictsIds)) {
        student.conflicts = [...new Set([...(student.conflicts || []), ...data.conflictsIds])];
      }
      
      newStudents[studentIndex] = student;
    });

    batchCommitAll(newStudents);
    showToast(`Importerede relationer for ${parsedData.length} elever.`);
  };

  const handlePrint = () => {
    window.print();
    setShowPrintHint(true);
    setTimeout(() => setShowPrintHint(false), 5000);
  };

  const handleShare = () => {
    if (!activeWorkspace) return;
    const url = new URL(window.location.href);
    url.searchParams.set('join', activeWorkspace.id);
    navigator.clipboard.writeText(url.toString());
    showToast("Link kopieret! Del det med dine kolleger for at samarbejde.");
  };

  const handleAcceptRequest = async (req: JoinRequest) => {
    if (!user || !activeWorkspace) return;
    try {
      const newMembers = [...activeWorkspace.members, req.userId];
      
      const batch = writeBatch(db);
      // update workspace
      batch.update(doc(db, 'workspaces', activeWorkspace.id), { members: newMembers });
      // delete request
      batch.delete(doc(db, 'workspaces', activeWorkspace.id, 'joinRequests', req.userId));
      
      // update all students in workspace!
      const studentsQuery = await getDocs(query(collection(db, 'workspaces', activeWorkspace.id, 'students'), where('members', 'array-contains', user.uid)));
      studentsQuery.forEach(docSnap => {
        batch.update(docSnap.ref, { members: newMembers });
      });
      
      await batch.commit();
      showToast(`${req.email} har nu adgang til projektet!`);
    } catch (e) {
      console.error(e);
      showToast("Der opstod en fejl.");
    }
  };

  return (
    <div className={`${isBulkMode ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-[#F8FAFC] text-gray-900 selection:bg-indigo-100 selection:text-indigo-900`}>
      <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-4">
        <h1 className="text-3xl font-black uppercase tracking-tighter">Klasselister</h1>
        <p className="text-sm font-bold text-gray-500 mt-1">Genereret den {new Date().toLocaleDateString('da-DK')}</p>
      </div>

      <header className="glass-panel sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
              {activeWorkspace?.name || "Klassesortering"}
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
               Intelligent Elevfordeling
               <span className="flex items-center gap-1 ml-1 text-emerald-600">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                 Live
               </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`relative group ${hideCardDetails ? 'hidden' : ''}`}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Søg efter elev..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-11 pr-10 py-2.5 bg-gray-100/50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl outline-none w-48 sm:w-72 transition-all shadow-inner text-sm font-medium"
            />
            {globalSearch && (
              <button 
                onClick={() => setGlobalSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className={`h-8 w-px bg-gray-200 mx-1 hidden sm:block ${hideCardDetails ? 'hidden' : ''}`} />

          <button 
            onClick={handleShare}
            className={`flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${hideCardDetails ? 'hidden' : ''}`}
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Del projekt</span>
          </button>

          <input 
            type="file" 
            multiple 
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95 ${hideCardDetails ? 'hidden' : ''}`}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="hidden sm:inline">{isUploading ? 'Behandler...' : 'Upload fotos'}</span>
          </button>
          
          <button 
            onClick={handleAutoSort}
            disabled={unassignedStudents.length === 0}
            className={`flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-100 active:scale-95 ${hideCardDetails ? 'hidden' : ''}`}
          >
            <Wand2 size={18} />
            <span className="hidden sm:inline">Auto-fordeling</span>
          </button>

          <button 
            onClick={() => setShowCleanupModal(true)}
            className={`flex items-center justify-center bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700 w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95 group ${hideCardDetails ? 'hidden' : ''}`}
            title="Ryd op i navne"
          >
            <Eraser size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </button>

          <button 
            onClick={() => setShowStatsModal(true)}
            className={`flex items-center justify-center bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700 w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95 group ${hideCardDetails ? 'hidden' : ''}`}
            title="Statistik"
          >
            <BarChart3 size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
          </button>

          <button 
            onClick={signOut}
            className={`flex items-center justify-center bg-white border border-gray-200 hover:border-rose-200 hover:bg-rose-50 text-gray-700 w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95 group ${hideCardDetails ? 'hidden' : ''}`}
            title="Log ud"
          >
            <LogOut size={20} className="text-gray-400 group-hover:text-rose-600 transition-colors" />
          </button>

          <div className={`relative ${hideCardDetails ? 'hidden' : ''}`}>
            <button 
              onClick={handlePrint}
              className="flex items-center justify-center bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700 w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95 group no-print"
              title="Udskriv klasselister"
            >
              <Printer size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </button>
            
            {showPrintHint && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-50 no-print animate-in fade-in slide-in-from-top-1">
                Hvis udskrivning ikke starter, klik på "Åbn i nyt vindue" øverst til højre i AI Studio.
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center justify-center bg-white border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50 text-gray-700 w-11 h-11 rounded-xl transition-all shadow-sm active:scale-95 relative group"
            title="Indstillinger"
          >
            <Settings size={20} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
            {joinRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-bounce" />
            )}
          </button>

          {joinRequests.length > 0 && activeWorkspace?.ownerId === user.uid && (
            <div className="absolute top-20 right-6 bg-white rounded-xl shadow-xl shadow-rose-100/50 border border-amber-200/50 p-4 z-50 w-80 animate-in fade-in slide-in-from-top-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
                <Bell size={18} className="text-amber-500" />
                Anmodninger om adgang
              </h3>
              <div className="space-y-3">
                {joinRequests.map(req => (
                  <div key={req.userId} className="flex flex-col gap-2 p-3 bg-amber-50/50 rounded-lg border border-amber-100 shrink-0">
                    <span className="text-sm font-medium text-gray-700">{req.email}</span>
                    <button 
                      onClick={() => handleAcceptRequest(req)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Check size={16} /> Godkend
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden import input for the settings modal */}
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={importInputRef}
            onChange={handleImport}
          />
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 flex flex-col gap-8 overflow-hidden">
        {isBulkMode ? (
          <StudentTableView 
            students={filteredStudents} 
            classes={CLASSES} 
            onUpdateStudent={handleSaveStudent} 
            onStudentClick={setEditingStudent}
            isPrivacyMode={isPrivacyMode}
            onClose={() => setIsBulkMode(false)}
          />
        ) : (
          <>
            <section 
              className="bg-white rounded-xl border shadow-sm flex flex-col flex-shrink-0 no-print"
              onDrop={(e) => handleDrop(e, null)}
              onDragOver={handleDragOver}
            >
          <div className="px-4 py-3 border-b bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-t-xl">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                Ikke-tildelte elever
                <span className={`bg-gray-200 text-gray-700 text-xs py-0.5 px-2 rounded-full font-bold ${hideCardDetails ? 'hidden' : ''}`}>
                  {unassignedStudents.length}
                </span>
              </h2>
            </div>
            <span className={`text-xs text-gray-500 ${hideCardDetails ? 'hidden' : ''}`}>Træk elever herfra til klasserne nedenfor</span>
          </div>
          <div className="p-4 overflow-x-auto min-h-[152px]">
            <div className="flex gap-3 pb-2 w-max">
              {unassignedStudents.map(student => (
                <StudentCard 
                  key={student.id} 
                  student={student} 
                  onClick={setEditingStudent}
                  onDragStart={handleDragStart}
                  isBulkMode={isBulkMode}
                  isPrivacyMode={isPrivacyMode}
                  hideDetails={hideCardDetails}
                  onToggleLock={handleToggleLock}
                />
              ))}
              {unassignedStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center w-full min-w-[300px] text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg h-[120px] gap-2">
                  {globalSearch ? (
                    <>
                      <span>Ingen elever matcher "{globalSearch}"</span>
                      <button 
                        onClick={() => setGlobalSearch('')}
                        className="text-indigo-600 font-medium hover:underline not-italic"
                      >
                        Ryd søgning
                      </button>
                    </>
                  ) : (
                    <span>{students.length === 0 ? 'Upload fotos for at komme i gang' : 'Alle elever er fordelt!'}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6 min-h-[400px]">
          {CLASSES.map(classInfo => (
            <ClassBoard 
              key={classInfo.id}
              classInfo={classInfo}
              students={filteredStudents.filter(s => s.classId === classInfo.id).sort(sortStudents)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onStudentClick={setEditingStudent}
              onDragStart={handleDragStart}
              isBulkMode={isBulkMode}
              isPrivacyMode={isPrivacyMode}
              hideDetails={hideCardDetails}
              onToggleLock={handleToggleLock}
              onEditClass={(classId) => {
                const c = CLASSES.find(cls => cls.id === classId);
                if (c) setEditingClass(c);
              }}
            />
          ))}
        </section>
          </>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <AlertCircle size={18} className="text-orange-400" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {editingStudent && (
        <EditModal 
          student={editingStudent} 
          allStudents={students}
          onSave={handleSaveStudent} 
          onClose={() => setEditingStudent(null)}
          onDelete={handleDeleteStudent}
        />
      )}
      {editingClass && (
        <EditClassModal 
          classInfo={editingClass}
          onClose={() => setEditingClass(null)}
          onSave={handleUpdateClassSettings}
        />
      )}

      {showUnassignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Fjern alle elever fra klasser?</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">Er du sikker på, at du vil fjerne alle ikke-låste elever fra deres nuværende klasser? De vil blive flyttet tilbage til puljen af ikke-tildelte elever.</p>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setShowUnassignConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuller
              </button>
              <button 
                onClick={() => {
                  batchCommitAll(students.map(s => s.isLocked ? s : { ...s, classId: null }));
                  setShowUnassignConfirm(false);
                  showToast("Alle ikke-låste elever er blevet fjernet fra deres klasser.");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors shadow-sm"
              >
                Fjern alle
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Settings className="text-gray-500" size={20} />
                Indstillinger & handlinger
              </h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex flex-col gap-6">
              
              {/* Workspaces */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Arbejdsrum</h3>
                <div className="space-y-2 mb-6">
                  {workspaces.map(w => (
                    <button
                      key={w.id}
                      onClick={() => { setActiveWorkspace(w); setShowSettingsModal(false); }}
                      className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition-colors ${activeWorkspace?.id === w.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
                    >
                      <div>
                        <div className="font-medium text-sm">{w.name}</div>
                        <div className="text-xs opacity-70 mt-0.5">{w.ownerId === user?.uid ? 'Ejer' : 'Delt med mig'} • {w.members.length} {w.members.length === 1 ? 'medlem' : 'medlemmer'}</div>
                      </div>
                      {activeWorkspace?.id === w.id && <Check size={16} />}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                       const name = prompt("Hvad skal det nye arbejdsrum hedde?");
                       if (!name || !user) return;
                       const newId = doc(collection(db, 'workspaces')).id;
                       await setDoc(doc(db, 'workspaces', newId), {
                         id: newId,
                         name,
                         ownerId: user.uid,
                         members: [user.uid],
                         numClasses: 3
                       });
                       showToast("Nyt arbejdsrum oprettet.");
                    }}
                    className="w-full text-sm font-medium text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100 py-2.5 rounded-lg transition-colors border border-indigo-200 border-dashed"
                  >
                    + Nyt arbejdsrum
                  </button>
                </div>

                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Konfiguration</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-gray-800 block">Antal klasser</span>
                      <span className="text-xs text-gray-500">Inkluderer NEST-klasse</span>
                    </div>
                    <select 
                      value={activeWorkspace?.numClasses || 3}
                      onChange={(e) => updateSettingInFirestore(Number(e.target.value))}
                      className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[2, 3, 4, 5, 6].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-100 transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        {isPrivacyMode ? <EyeOff size={16} className="text-slate-600"/> : <Eye size={16} className="text-slate-600"/>}
                        Privatlivstilstand
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">Slører elevbilleder og navne</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isPrivacyMode ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPrivacyMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={() => setHideCardDetails(!hideCardDetails)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-lg border border-gray-100 transition-colors text-left"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        <Layout size={16} className="text-slate-600"/>
                        Skjul detaljer på kort
                      </span>
                      <span className="text-xs text-gray-500 block mt-0.5">Skjuler navne og statistikker (godt til screenshots)</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${hideCardDetails ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${hideCardDetails ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>
              </section>

              {/* Actions */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Handlinger</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { setShowSettingsModal(false); setIsBulkMode(!isBulkMode); }}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${isBulkMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                  >
                    <List size={20} />
                    <span className="text-sm font-medium">{isBulkMode ? 'Afslut tabelvisning' : 'Tabelvisning'}</span>
                  </button>
                  
                  <button 
                    onClick={() => { setShowSettingsModal(false); setShowUnassignConfirm(true); }}
                    disabled={students.length === 0 || unassignedStudents.length === students.length}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw size={20} />
                    <span className="text-sm font-medium">Fjern alle</span>
                  </button>
                </div>
              </section>

              {/* Data Management */}
              <section>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Datastyring</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => { setShowSettingsModal(false); setShowSmartImportModal(true); }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-2"
                  >
                    <Wand2 size={16} />
                    Smart Import (AI) fra noter
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => { setShowSettingsModal(false); handleExport(); }}
                      disabled={students.length === 0}
                      className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <Download size={16} />
                      Eksporter backup
                    </button>
                    <button 
                      onClick={() => { setShowSettingsModal(false); importInputRef.current?.click(); }}
                      className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      <UploadCloud size={16} />
                      Importer backup
                    </button>
                  </div>
                  <button 
                    onClick={() => { setShowSettingsModal(false); setShowClearConfirm(true); }}
                    disabled={students.length === 0}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-md text-sm font-medium transition-colors mt-2"
                  >
                    <Trash2 size={16} />
                    Slet alle data
                  </button>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Slet alle data?</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">Er du sikker på, at du vil slette alle elever og rydde lokal lagring? Dette kan ikke fortrydes.</p>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Annuller
              </button>
              <button 
                onClick={() => {
                  deleteAllStudentsFromFirestore(students);
                  setShowClearConfirm(false);
                  showToast("Alle data er slettet.");
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
              >
                Slet alt
              </button>
            </div>
          </div>
        </div>
      )}
      {showStatsModal && (
        <StatsModal 
          students={students} 
          classes={CLASSES} 
          onClose={() => setShowStatsModal(false)} 
        />
      )}
      {showCleanupModal && activeWorkspace && (
        <CleanupNamesModal
          students={students}
          workspaceId={activeWorkspace.id}
          onClose={() => setShowCleanupModal(false)}
          onSuccess={(count) => {
            setShowCleanupModal(false);
            showToast(`Opdaterede ${count} navne!`);
          }}
        />
      )}
      <SmartImportModal
        isOpen={showSmartImportModal}
        onClose={() => setShowSmartImportModal(false)}
        onImport={handleSmartImport}
        existingStudents={students.map(s => ({ id: s.id, name: s.name }))}
      />
      {joinDialogDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 items-center text-center">
            {joinDialogDetails.requested ? (
              <>
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Check size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Anmodning sendt!</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Ejeren af projektet skal nu godkende dig. Du får adgang, lige så snart de har accepteret.
                </p>
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => setJoinDialogDetails(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Forstået
                  </button>
                </div>
              </>
            ) : joinDialogDetails.error ? (
              <>
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Fejl</h2>
                <p className="text-gray-600 text-sm mb-6">
                  {joinDialogDetails.error}
                </p>
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => setJoinDialogDetails(null)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Luk
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <Users size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Deltag i projekt</h2>
                <p className="text-gray-600 text-sm mb-6">
                  Du er blevet inviteret til et delt projekt. Vil du anmode om adgang?
                </p>
                <div className="flex gap-2 w-full flex-col">
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      try {
                        await setDoc(doc(db, 'workspaces', joinDialogDetails.id, 'joinRequests', user.uid), {
                          userId: user.uid,
                          email: user.email || 'Ukendt'
                        });
                        setJoinDialogDetails({ ...joinDialogDetails, requested: true });
                      } catch (e) {
                         console.error(e);
                         setJoinDialogDetails({ ...joinDialogDetails, error: "Projektet findes ikke, eller der skete en fejl." });
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Anmod om adgang
                  </button>
                  <button 
                    onClick={() => setJoinDialogDetails(null)}
                    className="w-full bg-transparent hover:bg-gray-50 text-gray-500 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95"
                  >
                    Annuller
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
