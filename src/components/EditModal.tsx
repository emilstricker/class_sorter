import React, { useState, useEffect } from 'react';
import { Student, Gender, Level } from '../types';
import { X, Search, Brain, HeartHandshake, Zap, ShieldPlus, Tags, ChevronUp, ChevronDown, Star } from 'lucide-react';

interface EditModalProps {
  student: Student;
  allStudents: Student[];
  onSave: (updatedStudent: Student) => void;
  onClose: () => void;
  onDelete: (studentId: string) => void;
}

export function EditModal({ student, allStudents, onSave, onClose, onDelete }: EditModalProps) {
  const [formData, setFormData] = useState<Student>(student);
  const [activeTab, setActiveTab] = useState<'details' | 'relationships' | 'wishes'>('details');
  const [relationshipSearch, setRelationshipSearch] = useState('');

  // Update local state if student prop changes
  useEffect(() => {
    setFormData(student);
  }, [student]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => {
        const newData = { ...prev, [name]: checked };
        if (name === 'avoidNestClass' && checked) {
          newData.preferNestClass = false;
        } else if (name === 'preferNestClass' && checked) {
          newData.avoidNestClass = false;
        }
        return newData;
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: ['abilityLevel', 'socialSkill', 'behavioralIntensity', 'supportLevel'].includes(name) ? parseInt(value, 10) : value
    }));
  };

  const toggleRelationship = (type: 'friendships' | 'conflicts' | 'wishes', targetId: string) => {
    setFormData(prev => {
      if (type === 'wishes') {
        const current = prev.wishes || [];
        const updated = current.includes(targetId)
          ? current.filter(id => id !== targetId)
          : [...current, targetId];
        return { ...prev, wishes: updated };
      }

      const current = prev[type] || [];
      const updated = current.includes(targetId)
        ? current.filter(id => id !== targetId)
        : [...current, targetId];
      
      // If adding to friendships, remove from conflicts and vice versa
      const otherType = type === 'friendships' ? 'conflicts' : 'friendships';
      const otherCurrent = prev[otherType] || [];
      const otherUpdated = otherCurrent.filter(id => id !== targetId);

      return { ...prev, [type]: updated, [otherType]: otherUpdated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const moveWish = (index: number, direction: 'up' | 'down') => {
    setFormData(prev => {
      const wishes = [...(prev.wishes || [])];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= wishes.length) return prev;
      
      const temp = wishes[index];
      wishes[index] = wishes[newIndex];
      wishes[newIndex] = temp;
      
      return { ...prev, wishes };
    });
  };

  const getSortedAndFilteredStudents = (type: 'friendships' | 'conflicts' | 'wishes') => {
    return allStudents
      .filter(s => s.id !== student.id)
      .filter(s => s.name.toLowerCase().includes(relationshipSearch.toLowerCase()))
      .sort((a, b) => {
        const aSelected = (type === 'wishes' ? formData.wishes : formData[type])?.includes(a.id) ? 1 : 0;
        const bSelected = (type === 'wishes' ? formData.wishes : formData[type])?.includes(b.id) ? 1 : 0;
        
        if (aSelected !== bSelected) {
          return bSelected - aSelected;
        }
        return a.name.localeCompare(b.name);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Rediger elev</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b px-4">
          <button 
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Detaljer
          </button>
          <button 
            onClick={() => setActiveTab('relationships')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'relationships' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Relationer
          </button>
          <button 
            onClick={() => setActiveTab('wishes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'wishes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Ønsker
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
          {activeTab === 'details' ? (
            <>
              <div className="flex gap-4 items-start">
                {formData.photoUrl && (
                  <img 
                    src={formData.photoUrl} 
                    alt="Preview" 
                    className="w-20 h-28 object-cover rounded-md border shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Navn</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange}
                      className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Elevens navn"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Køn</label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'Unknown', label: 'Ukendt' },
                        { key: 'Boy', label: 'Dreng' },
                        { key: 'Girl', label: 'Pige' },
                        { key: 'Other', label: 'Andet' }
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input 
                            type="radio" 
                            name="gender" 
                            value={key} 
                            checked={formData.gender === key}
                            onChange={handleChange}
                            className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <Brain size={14} className="text-indigo-500" />
                    Fagligt niveau (1-5)
                  </label>
                  <select 
                    name="abilityLevel" 
                    value={formData.abilityLevel} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl} - {lvl === 1 ? 'Lav' : lvl === 5 ? 'Høj' : 'Gns'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <HeartHandshake size={14} className="text-rose-500" />
                    Sociale færdigheder (1-5)
                  </label>
                  <select 
                    name="socialSkill" 
                    value={formData.socialSkill} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl} - {lvl === 1 ? 'Lav' : lvl === 5 ? 'Høj' : 'Gns'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <Zap size={14} className="text-amber-500 fill-amber-500" />
                    Adfærdsintensitet (1-5)
                  </label>
                  <select 
                    name="behavioralIntensity" 
                    value={formData.behavioralIntensity} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl} - {lvl === 1 ? 'Rolig' : lvl === 5 ? 'Intens' : 'Gns'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <ShieldPlus size={14} className="text-emerald-500" />
                    Støttebehov (1-5)
                  </label>
                  <select 
                    name="supportLevel" 
                    value={formData.supportLevel} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <option key={lvl} value={lvl}>{lvl} - {lvl === 1 ? 'Selvst.' : lvl === 5 ? '1-til-1' : 'Gns'}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-1">
                  <Tags size={14} className="text-indigo-500" />
                  Særlige betegnelser
                </label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      name="isDSA" 
                      checked={formData.isDSA || false} 
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    DSA (Dansk som andetsprog)
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      name="isSPS" 
                      checked={formData.isSPS || false} 
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    + 9
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      name="isMedical" 
                      checked={formData.isMedical || false} 
                      onChange={handleChange}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    Medicinsk
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="checkbox" 
                  id="isLocked" 
                  name="isLocked" 
                  checked={formData.isLocked || false} 
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isLocked" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Lås elev i nuværende klasse
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="avoidNestClass" 
                  name="avoidNestClass" 
                  checked={formData.avoidNestClass || false} 
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="avoidNestClass" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Undgå NEST-klasse (hvis muligt)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="preferNestClass" 
                  name="preferNestClass" 
                  checked={formData.preferNestClass || false} 
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="preferNestClass" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Foretræk NEST-klasse
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Noter</label>
                <textarea 
                  name="notes" 
                  value={formData.notes || ''} 
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  placeholder="Særlige behov, medicinsk info osv."
                />
              </div>
            </>
          ) : activeTab === 'relationships' ? (
            <div className="flex flex-col gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Søg efter elever..."
                  value={relationshipSearch}
                  onChange={(e) => setRelationshipSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                  Venskaber (Hold sammen)
                </h3>
                <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 flex flex-col gap-1 bg-gray-50">
                  {getSortedAndFilteredStudents('friendships').map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleRelationship('friendships', s.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        formData.friendships?.includes(s.id) 
                          ? 'bg-emerald-100 text-emerald-800 font-medium' 
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{s.name}</span>
                      {formData.friendships?.includes(s.id) && <span className="text-xs">Valgt</span>}
                    </button>
                  ))}
                  {getSortedAndFilteredStudents('friendships').length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">Ingen elever fundet</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  Konflikter (Hold adskilt)
                </h3>
                <div className="max-h-[150px] overflow-y-auto border rounded-md p-2 flex flex-col gap-1 bg-gray-50">
                  {getSortedAndFilteredStudents('conflicts').map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleRelationship('conflicts', s.id)}
                      className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                        formData.conflicts?.includes(s.id) 
                          ? 'bg-red-100 text-red-800 font-medium' 
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{s.name}</span>
                      {formData.conflicts?.includes(s.id) && <span className="text-xs">Valgt</span>}
                    </button>
                  ))}
                  {getSortedAndFilteredStudents('conflicts').length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-500">Ingen elever fundet</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Søg efter elever..."
                  value={relationshipSearch}
                  onChange={(e) => setRelationshipSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Star size={16} className="text-amber-500 fill-amber-500" />
                  Prioriterede ønsker
                </h3>
                
                {/* Selected wishes in order */}
                <div className="mb-4 flex flex-col gap-2">
                  {(formData.wishes || []).map((wishId, index) => {
                    const wishStudent = allStudents.find(s => s.id === wishId);
                    if (!wishStudent) return null;
                    return (
                      <div key={wishId} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-2 rounded-md">
                        <span className="flex items-center justify-center w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full">
                          {index + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-indigo-900">{wishStudent.name}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moveWish(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-indigo-200 rounded text-indigo-600 disabled:opacity-30"
                          >
                            <ChevronUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveWish(index, 'down')}
                            disabled={index === (formData.wishes?.length || 0) - 1}
                            className="p-1 hover:bg-indigo-200 rounded text-indigo-600 disabled:opacity-30"
                          >
                            <ChevronDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleRelationship('wishes', wishId)}
                            className="p-1 hover:bg-red-100 rounded text-red-600 ml-1"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(formData.wishes || []).length === 0 && (
                    <div className="text-center py-4 border-2 border-dashed rounded-md text-sm text-gray-400">
                      Ingen ønsker valgt endnu
                    </div>
                  )}
                </div>

                <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 flex flex-col gap-1 bg-gray-50">
                  {getSortedAndFilteredStudents('wishes')
                    .filter(s => !formData.wishes?.includes(s.id))
                    .map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleRelationship('wishes', s.id)}
                      className="flex items-center justify-between px-3 py-2 rounded-md text-sm bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-indigo-500 font-medium">+ Tilføj ønske</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>

        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <button 
            type="button"
            onClick={() => onDelete(student.id)}
            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            Fjern
          </button>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              Annuller
            </button>
            <button 
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
            >
              Gem ændringer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
