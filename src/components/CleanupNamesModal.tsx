import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Student } from '../types';
import { db } from '../firebase';
import { doc, writeBatch } from 'firebase/firestore';

interface CleanupNamesModalProps {
  students: Student[];
  workspaceId: string;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

interface Proposal {
  id: string;
  oldName: string;
  newName: string;
  selected: boolean;
}

export default function CleanupNamesModal({ students, workspaceId, onClose, onSuccess }: CleanupNamesModalProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const generated: Proposal[] = [];
    students.forEach(student => {
      let changed = false;
      let newName = student.name;

      if (newName.includes('_')) {
        newName = newName.replace(/_/g, ' ');
        changed = true;
      }

      if (changed && newName.endsWith('s')) {
        // e.g. "Alva Wiuf Myhres" -> "Alva Wiuf Myhre"
        // But beware of e.g. "Jens", "Thomas", "Mads", "Lars", "Anders"
        // Let's just blindly remove the last "s" if it ends with "s", and the user can uncheck it if wrong
        newName = newName.slice(0, -1);
      } else if (newName.endsWith('s') && newName.split(' ').length > 1) {
          // If it ends with 's' and has multiple words (so perhaps a surname ending with the possessive 's')
          // Let's propose to remove it, user can uncheck
          const proposed = newName.slice(0, -1);
          if (proposed !== newName) {
              changed = true;
              newName = proposed;
          }
      }

      if (newName !== student.name) {
        generated.push({
          id: student.id,
          oldName: student.name,
          newName: newName,
          selected: true
        });
      }
    });
    setProposals(generated);
  }, [students]);

  const toggleSelect = (id: string) => {
    setProposals(p => p.map(x => x.id === id ? { ...x, selected: !x.selected } : x));
  };

  const handleApply = async () => {
    const toApply = proposals.filter(p => p.selected);
    if (toApply.length === 0) {
      onClose();
      return;
    }

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      toApply.forEach(p => {
        batch.update(doc(db, 'workspaces', workspaceId, 'students', p.id), { name: p.newName });
      });
      await batch.commit();
      onSuccess(toApply.length);
    } catch (e) {
      console.error(e);
      alert('Der opstod en fejl under opdateringen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ryd op i navne</h2>
            <p className="text-sm text-gray-500 mt-1">
              Følgende navne ser ud til at kunne rettes (fx fjerne underscores og ejefalds-s).
              Du kan fravælge fejlrettelser (fx hvis navnet i forvejen skal slutte på "s").
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Der blev ikke fundet nogen navne, der kræver oprydning blandt de aktuelle elever.
            </div>
          ) : (
            <div className="space-y-3">
              {proposals.map(p => (
                <label key={p.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={p.selected} 
                    onChange={() => toggleSelect(p.id)}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div className="flex-1 overflow-hidden">
                    <div className="text-xs text-rose-500 line-through truncate">{p.oldName}</div>
                    <div className="text-sm font-semibold text-emerald-600 truncate">{p.newName}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <div className="text-sm text-gray-500 font-medium">
            {proposals.filter(p => p.selected).length} valgt
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all active:scale-95"
            >
              Annuller
            </button>
            <button 
              onClick={handleApply}
              disabled={isProcessing || proposals.filter(p => p.selected).length === 0}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-all shadow-lg active:scale-95"
            >
              {isProcessing ? 'Opdaterer...' : 'Anvend valgte'}
              {!isProcessing && <Check size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
