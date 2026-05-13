import React from 'react';
import { ClassInfo, Student } from '../types';
import { StudentCard } from './StudentCard';
import { Users, Brain, HeartHandshake, Zap, ShieldPlus, Edit2 } from 'lucide-react';

interface ClassBoardProps {
  classInfo: ClassInfo;
  students: Student[];
  onDrop: (e: React.DragEvent, classId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onStudentClick: (student: Student) => void;
  onDragStart: (e: React.DragEvent, studentId: string) => void;
  isBulkMode: boolean;
  isPrivacyMode?: boolean;
  hideDetails?: boolean;
  onToggleLock: (studentId: string) => void;
  onEditClass?: (classId: string) => void;
}

export function ClassBoard({ 
  classInfo, 
  students, 
  onDrop, 
  onDragOver, 
  onStudentClick, 
  onDragStart,
  isBulkMode,
  isPrivacyMode,
  hideDetails,
  onToggleLock,
  onEditClass
}: ClassBoardProps) {
  
  const boysCount = students.filter(s => s.gender === 'Boy').length;
  const girlsCount = students.filter(s => s.gender === 'Girl').length;

  const handleEditClick = () => {
    if (onEditClass) onEditClass(classInfo.id); 
  };
  
  const avgAbility = students.length 
    ? (students.reduce((acc, s) => acc + s.abilityLevel, 0) / students.length).toFixed(1) 
    : '0.0';
    
  const avgSocial = students.length 
    ? (students.reduce((acc, s) => acc + s.socialSkill, 0) / students.length).toFixed(1) 
    : '0.0';

  const avgBehavior = students.length
    ? (students.reduce((acc, s) => acc + s.behavioralIntensity, 0) / students.length).toFixed(1)
    : '0.0';

  const avgSupport = students.length
    ? (students.reduce((acc, s) => acc + s.supportLevel, 0) / students.length).toFixed(1)
    : '0.0';

  const dsaCount = students.filter(s => s.isDSA).length;
  const spsCount = students.filter(s => s.isSPS).length;
  const medCount = students.filter(s => s.isMedical).length;
  const dysCount = students.filter(s => s.isDyslexic).length;
  const extraCount = students.filter(s => s.isExtraAttention).length;
  const nestExternalCount = students.filter(s => s.isNestExternal).length;

  const isFull = classInfo.maxInternal && (students.length - nestExternalCount) >= classInfo.maxInternal;

  return (
    <div 
      className={`flex flex-col bg-white rounded-2xl border transition-all duration-300 ${isFull ? 'border-orange-200 shadow-orange-100/50' : 'border-gray-100 shadow-gray-200/50'} overflow-hidden shadow-xl h-full group/board class-board`}
      onDrop={(e) => onDrop(e, classInfo.id)}
      onDragOver={onDragOver}
    >
      {/* Header Stats */}
      <div className={`p-4 border-b ${isFull ? 'bg-orange-50/50' : 'bg-gray-50/50'} backdrop-blur-sm print:bg-white`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 group/title">
              <h3 className="font-extrabold text-gray-900 tracking-tight">{classInfo.name}</h3>
              {onEditClass && (
                <button 
                  onClick={handleEditClick}
                  className="p-1 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all opacity-0 group-hover/title:opacity-100 no-print"
                  title="Rediger klasseoplysninger"
                >
                  <Edit2 size={12} />
                </button>
              )}
            </div>
            {classInfo.teacherName && (
              <div className="text-[11px] text-indigo-600 font-bold tracking-tight">
                Lærer: {classInfo.teacherName}
              </div>
            )}
            {classInfo.externalSlots && (
              <div className={`text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 no-print ${hideDetails ? 'hidden' : ''}`}>
                + {classInfo.externalSlots} eksterne pladser ({nestExternalCount} brugt)
              </div>
            )}
          </div>
          <div className={`text-[11px] font-black px-2.5 py-1 rounded-lg border shadow-sm flex items-center gap-1.5 no-print ${hideDetails ? 'hidden' : ''} ${isFull ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-100 text-gray-700'}`}>
            <Users size={12} strokeWidth={2.5} />
            <span>
              {students.length} {classInfo.maxInternal ? `/ ${classInfo.maxInternal + nestExternalCount}` : ''}
            </span>
          </div>
        </div>

        <div className={`flex flex-col gap-2.5 no-print ${hideDetails ? 'hidden' : ''}`}>
          <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-white/40 shadow-sm">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kønsbalance (D/P)</span>
            <span className="text-xs font-black font-mono">
              <span className="text-blue-600">{boysCount}</span>
              <span className="text-gray-300 mx-1">/</span>
              <span className="text-pink-600">{girlsCount}</span>
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-white/40 shadow-sm" title="Fagligt">
                <Brain size={12} className="text-indigo-500" />
                <span className="text-xs font-black font-mono">{avgAbility}</span>
              </div>
              <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-white/40 shadow-sm" title="Socialt">
                <HeartHandshake size={12} className="text-rose-500" />
                <span className="text-xs font-black font-mono">{avgSocial}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-white/40 shadow-sm" title="Adfærd">
                <Zap size={12} className="text-amber-500 fill-amber-500" />
                <span className="text-xs font-black font-mono">{avgBehavior}</span>
              </div>
              <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm px-2 py-1.5 rounded-xl border border-white/40 shadow-sm" title="Støtte">
                <ShieldPlus size={12} className="text-emerald-500" />
                <span className="text-xs font-black font-mono">{avgSupport}</span>
              </div>
            </div>
          </div>

          {(dsaCount > 0 || spsCount > 0 || medCount > 0 || dysCount > 0 || extraCount > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {dsaCount > 0 && (
                <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" title="DSA">
                  {dsaCount} DSA
                </span>
              )}
              {spsCount > 0 && (
                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" title="+ 9">
                  {spsCount} + 9
                </span>
              )}
              {medCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" title="MED">
                  {medCount} MED
                </span>
              )}
              {dysCount > 0 && (
                <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" title="Ordblind">
                  {dysCount} ORD
                </span>
              )}
              {extraCount > 0 && (
                <span className="bg-gray-700 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm" title="Skærpet opmærksomhed">
                  {extraCount} SKÆ
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Droppable Area */}
      <div className="flex-1 p-4 bg-gray-50/30 min-h-[240px] overflow-y-auto subtle-scroll relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="flex flex-wrap gap-3 content-start relative z-10">
          {students.map(student => (
            <StudentCard 
              key={student.id} 
              student={student} 
              onClick={onStudentClick} 
              onDragStart={onDragStart}
              isBulkMode={isBulkMode}
              isPrivacyMode={isPrivacyMode}
              hideDetails={hideDetails}
              onToggleLock={onToggleLock}
            />
          ))}
          {students.length === 0 && (
            <div className="w-full h-full min-h-[120px] flex flex-col items-center justify-center text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-white/50 transition-colors group-hover/board:border-indigo-200 group-hover/board:text-indigo-400 no-print">
              <Users size={24} className="mb-2 opacity-20" />
              Slip elever her
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
