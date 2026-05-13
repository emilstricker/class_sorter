import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { ClassInfo } from '../types';

interface EditClassModalProps {
  classInfo: ClassInfo;
  onClose: () => void;
  onSave: (classId: string, name: string, teacherName: string) => void;
}

export function EditClassModal({ classInfo, onClose, onSave }: EditClassModalProps) {
  const [name, setName] = useState(classInfo.name);
  const [teacherName, setTeacherName] = useState(classInfo.teacherName || '');

  const handleSave = () => {
    onSave(classInfo.id, name, teacherName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Rediger klasse</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Klassens navn</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              placeholder="F.eks. Klasse A"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Lærerens navn (valgfrit)</label>
            <input 
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
              placeholder="Navn på klasselærer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all active:scale-95"
          >
            Annuller
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            Gem ændringer
            <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
