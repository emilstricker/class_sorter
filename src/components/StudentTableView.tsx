import React, { useState } from 'react';
import { Student, Level, Gender, ClassInfo } from '../types';
import { ArrowUpDown, ArrowUp, ArrowDown, User, X } from 'lucide-react';

interface StudentTableViewProps {
  students: Student[];
  classes: ClassInfo[];
  onUpdateStudent: (student: Student) => void;
  onStudentClick: (student: Student) => void;
  isPrivacyMode: boolean;
  onClose: () => void;
}

type SortField = 'name' | 'gender' | 'abilityLevel' | 'socialSkill' | 'behavioralIntensity' | 'supportLevel' | 'classId';
type SortDirection = 'asc' | 'desc';

export function StudentTableView({ students, classes, onUpdateStudent, onStudentClick, isPrivacyMode, onClose }: StudentTableViewProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedStudents = [...students].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (sortField === 'classId') {
      aVal = a.classId ? classes.find(c => c.id === a.classId)?.name || '' : 'Ikke tildelt';
      bVal = b.classId ? classes.find(c => c.id === b.classId)?.name || '' : 'Ikke tildelt';
    } else if (sortField === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
  };

  const handleChange = (student: Student, field: keyof Student, value: any) => {
    const updatedStudent = { ...student, [field]: value };
    if (field === 'avoidNestClass' && value === true) {
      updatedStudent.preferNestClass = false;
    } else if (field === 'preferNestClass' && value === true) {
      updatedStudent.avoidNestClass = false;
    }
    onUpdateStudent(updatedStudent);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
        <h2 className="font-semibold text-gray-700">Masseredigering (Tabelvisning)</h2>
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <X size={16} />
          Luk masseredigering
        </button>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Foto</th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Navn <SortIcon field="name" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('gender')}>
                <div className="flex items-center gap-1">Køn <SortIcon field="gender" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('abilityLevel')}>
                <div className="flex items-center gap-1" title="Fagligt niveau">Fagligt <SortIcon field="abilityLevel" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('socialSkill')}>
                <div className="flex items-center gap-1" title="Sociale færdigheder">Socialt <SortIcon field="socialSkill" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('behavioralIntensity')}>
                <div className="flex items-center gap-1" title="Adfærdsintensitet">Adfærd <SortIcon field="behavioralIntensity" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('supportLevel')}>
                <div className="flex items-center gap-1" title="Støttebehov">Støtte <SortIcon field="supportLevel" /></div>
              </th>
              <th className="px-4 py-3 font-medium cursor-pointer group" onClick={() => handleSort('classId')}>
                <div className="flex items-center gap-1">Klasse <SortIcon field="classId" /></div>
              </th>
              <th className="px-4 py-3 font-medium text-center">Låst</th>
              <th className="px-4 py-3 font-medium text-center" title="Undgå NEST">Undgå NEST</th>
              <th className="px-4 py-3 font-medium text-center" title="Foretræk NEST">Ønsker NEST</th>
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map(student => (
              <tr key={student.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2">
                  <div 
                    className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all"
                    onClick={() => onStudentClick(student)}
                  >
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name} 
                        className={`w-full h-full object-cover ${isPrivacyMode ? 'blur-sm scale-110' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User size={16} className="text-gray-400" />
                    )}
                  </div>
                </td>
                <td 
                  className="px-4 py-2 font-medium text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => onStudentClick(student)}
                >
                  {isPrivacyMode ? 'Elevnavn' : student.name}
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.gender}
                    onChange={(e) => handleChange(student, 'gender', e.target.value as Gender)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Unknown">Ukendt</option>
                    <option value="Boy">Dreng</option>
                    <option value="Girl">Pige</option>
                    <option value="Other">Andet</option>
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.abilityLevel}
                    onChange={(e) => handleChange(student, 'abilityLevel', Number(e.target.value) as Level)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.socialSkill}
                    onChange={(e) => handleChange(student, 'socialSkill', Number(e.target.value) as Level)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.behavioralIntensity}
                    onChange={(e) => handleChange(student, 'behavioralIntensity', Number(e.target.value) as Level)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.supportLevel}
                    onChange={(e) => handleChange(student, 'supportLevel', Number(e.target.value) as Level)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <select 
                    value={student.classId || ''}
                    onChange={(e) => handleChange(student, 'classId', e.target.value || null)}
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-[100px] truncate"
                  >
                    <option value="">Ikke tildelt</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input 
                    type="checkbox" 
                    checked={student.isLocked || false}
                    onChange={(e) => handleChange(student, 'isLocked', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input 
                    type="checkbox" 
                    checked={student.avoidNestClass || false}
                    onChange={(e) => handleChange(student, 'avoidNestClass', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-2 text-center">
                  <input 
                    type="checkbox" 
                    checked={student.preferNestClass || false}
                    onChange={(e) => handleChange(student, 'preferNestClass', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </td>
              </tr>
            ))}
            {sortedStudents.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  Ingen elever fundet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
