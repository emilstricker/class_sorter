import React from 'react';
import { motion } from 'motion/react';
import { Student } from '../types';
import { User, Brain, HeartHandshake, Zap, ShieldPlus, Lock, Unlock, Star, Ban, Heart } from 'lucide-react';

interface StudentCardProps {
  student: Student;
  onClick: (student: Student) => void;
  onDragStart: (e: React.DragEvent, studentId: string) => void;
  isBulkMode?: boolean;
  isPrivacyMode?: boolean;
  onToggleLock?: (studentId: string) => void;
}

export function StudentCard({ student, onClick, onDragStart, isBulkMode, isPrivacyMode, onToggleLock }: StudentCardProps) {
  const genderColor = 
    student.gender === 'Boy' ? 'bg-blue-500' : 
    student.gender === 'Girl' ? 'bg-pink-500' : 
    'bg-gray-400';

  const handleClick = () => {
    if (!isBulkMode) {
      onClick(student);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      draggable={!isBulkMode && !student.isLocked}
      onDragStart={(e: any) => !isBulkMode && !student.isLocked && onDragStart(e, student.id)}
      onClick={handleClick}
      className={`relative w-[88px] h-[124px] rounded-xl overflow-hidden shadow-sm transition-all group bg-white border border-gray-100 flex-shrink-0 student-card ${
        isBulkMode ? 'cursor-default' : student.isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:shadow-lg hover:ring-2 hover:ring-indigo-500/50'
      }`}
      title={`${student.name}\nFagligt: ${student.abilityLevel}\nSocialt: ${student.socialSkill}\nAdfærd: ${student.behavioralIntensity}\nStøtte: ${student.supportLevel}${student.isLocked ? '\n(Låst)' : ''}`}
    >
      <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
        {student.photoUrl ? (
          <img 
            src={student.photoUrl} 
            alt={student.name} 
            className={`w-full h-full object-cover pointer-events-none transition-all duration-500 ${isPrivacyMode ? 'blur-lg scale-125 opacity-70' : 'group-hover:scale-110'}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 print:bg-white print:text-gray-400">
            <User size={32} strokeWidth={1.5} />
          </div>
        )}
      </div>
      
      {/* Gender Badge */}
      <div className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 no-print ${genderColor}`} />

      {/* Special Designation Badges */}
      <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10 pointer-events-none no-print">
        {student.isDSA && (
          <span className="bg-indigo-600/90 backdrop-blur-sm text-white text-[8px] font-bold px-1 rounded shadow-sm border border-white/20" title="DSA">
            DSA
          </span>
        )}
        {student.isSPS && (
          <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-[8px] font-bold px-1 rounded shadow-sm border border-white/20" title="+ 9">
            + 9
          </span>
        )}
      </div>

      <div className="absolute top-1.5 right-5 flex flex-col gap-1 z-10 pointer-events-none items-end no-print">
        {student.avoidNestClass && (
          <div className="bg-gray-900/80 backdrop-blur-sm text-white p-0.5 rounded shadow-sm border border-white/10" title="Undgå NEST">
            <Ban size={8} />
          </div>
        )}
        {student.preferNestClass && (
          <div className="bg-emerald-500/80 backdrop-blur-sm text-white p-0.5 rounded shadow-sm border border-white/10" title="Ønsker NEST">
            <Heart size={8} className="fill-white" />
          </div>
        )}
      </div>

      {/* Lock Button */}
      {student.classId && !isBulkMode && (
        <div className="absolute top-1.5 left-1.5 z-20 no-print">
          {student.isLocked ? (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLock?.(student.id); }} 
              className="p-1 bg-white/90 backdrop-blur-sm rounded-lg text-amber-600 hover:bg-white shadow-md transition-all border border-amber-100"
              title="Lås elev op"
            >
              <Lock size={12} />
            </button>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleLock?.(student.id); }} 
              className="p-1 bg-white/0 hover:bg-white/90 backdrop-blur-sm rounded-lg text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all shadow-md border border-transparent hover:border-gray-100"
              title="Lås elev i klasse"
            >
              <Unlock size={12} />
            </button>
          )}
        </div>
      )}

      {/* Print-only name */}
      <div className="hidden print:flex absolute inset-x-0 bottom-0 bg-white p-1 text-center items-center justify-center border-t border-gray-100 z-30">
        <span className="text-[8pt] font-bold text-black truncate w-full px-0.5">
          {student.name}
        </span>
      </div>

      {/* Info Overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 pt-6 flex flex-col gap-1 pointer-events-none z-10 no-print">
        <span className={`text-[10px] font-bold text-white truncate leading-tight tracking-tight ${isPrivacyMode ? 'blur-[4px] select-none opacity-50' : ''}`}>
          {isPrivacyMode ? '••••••••' : (student.name || 'Navnløs')}
        </span>
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-1">
          <div className="flex items-center gap-0.5 text-indigo-300" title="Fagligt">
            <Brain size={8} />
            <span className="text-[9px] font-black font-mono">{student.abilityLevel}</span>
          </div>
          <div className="flex items-center justify-end gap-0.5 text-rose-300" title="Socialt">
            <span className="text-[9px] font-black font-mono">{student.socialSkill}</span>
            <HeartHandshake size={8} />
          </div>
          <div className="flex items-center gap-0.5 text-amber-300" title="Adfærd">
            <Zap size={8} className="fill-amber-300" />
            <span className="text-[9px] font-black font-mono">{student.behavioralIntensity}</span>
          </div>
          <div className="flex items-center justify-end gap-0.5 text-emerald-300" title="Støtte">
            <span className="text-[9px] font-black font-mono">{student.supportLevel}</span>
            <ShieldPlus size={8} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
