import React from 'react';
import { Student, ClassInfo } from '../types';
import { X, PieChart, CheckCircle2, AlertCircle, Star, Ban, Users, Heart, Scale, Brain, HeartHandshake, Zap } from 'lucide-react';

interface StatsModalProps {
  students: Student[];
  classes: ClassInfo[];
  onClose: () => void;
}

export function StatsModal({ students, classes, onClose }: StatsModalProps) {
  const assignedStudents = students.filter(s => s.classId !== null);
  const studentsWithWishes = students.filter(s => s.wishes && s.wishes.length > 0);
  const totalWishesCount = studentsWithWishes.reduce((sum, s) => sum + (s.wishes?.length || 0), 0);
  
  const wishStats = studentsWithWishes.map(student => {
    const fulfilledWishes = (student.wishes || []).map((wishId, index) => {
      const wishStudent = students.find(s => s.id === wishId);
      const isFulfilled = wishStudent && wishStudent.classId === student.classId;
      return { wishId, name: wishStudent?.name || 'Ukendt', priority: index + 1, isFulfilled };
    });
    
    return {
      studentId: student.id,
      name: student.name,
      wishes: fulfilledWishes,
      anyFulfilled: fulfilledWishes.some(w => w.isFulfilled),
      fulfilledCount: fulfilledWishes.filter(w => w.isFulfilled).length
    };
  });

  const studentsWithAnyWishFulfilled = wishStats.filter(s => s.anyFulfilled).length;
  const totalFulfilledWishes = wishStats.reduce((sum, s) => sum + s.fulfilledCount, 0);
  
  // Priority stats
  const priorityStats: Record<number, number> = {};
  wishStats.forEach(s => {
    s.wishes.forEach(w => {
      if (w.isFulfilled) {
        priorityStats[w.priority] = (priorityStats[w.priority] || 0) + 1;
      }
    });
  });

  const unfulfilledWishes = wishStats.filter(s => !s.anyFulfilled && s.wishes.length > 0);
  
  const nestAvoidanceStats = students.filter(s => s.avoidNestClass);
  const nestAvoidanceFailed = nestAvoidanceStats.filter(s => s.classId === 'class-nest');

  const nestPreferenceStats = students.filter(s => s.preferNestClass);
  const nestPreferenceFulfilled = nestPreferenceStats.filter(s => s.classId === 'class-nest');

  // Conflict stats
  const studentsWithConflicts = assignedStudents.filter(s => s.conflicts && s.conflicts.length > 0);
  const conflictViolations = studentsWithConflicts.filter(student => {
    return (student.conflicts || []).some(conflictId => {
      const other = students.find(s => s.id === conflictId);
      return other && other.classId === student.classId;
    });
  });

  // Class-wise statistics
  const classStats = classes.map(c => {
    const classStudents = assignedStudents.filter(s => s.classId === c.id);
    const boys = classStudents.filter(s => s.gender === 'Boy').length;
    const girls = classStudents.filter(s => s.gender === 'Girl').length;
    const others = classStudents.filter(s => s.gender === 'Other').length;
    
    const avgAbility = classStudents.length ? classStudents.reduce((sum, s) => sum + s.abilityLevel, 0) / classStudents.length : 0;
    const avgSocial = classStudents.length ? classStudents.reduce((sum, s) => sum + s.socialSkill, 0) / classStudents.length : 0;
    const avgBehavior = classStudents.length ? classStudents.reduce((sum, s) => sum + s.behavioralIntensity, 0) / classStudents.length : 0;
    const avgSupport = classStudents.length ? classStudents.reduce((sum, s) => sum + s.supportLevel, 0) / classStudents.length : 0;

    return {
      ...c,
      count: classStudents.length,
      boys,
      girls,
      others,
      avgAbility,
      avgSocial,
      avgBehavior,
      avgSupport
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b bg-indigo-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <PieChart className="text-indigo-600" size={20} />
            Statistik over klassesortering
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-emerald-700 mb-1">
                <CheckCircle2 size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Ønsker opfyldt</span>
              </div>
              <div className="text-2xl font-black text-emerald-800">
                {studentsWithWishes.length > 0 
                  ? Math.round((studentsWithAnyWishFulfilled / studentsWithWishes.length) * 100) 
                  : 0}%
              </div>
              <p className="text-[10px] text-emerald-600 mt-1">
                {studentsWithAnyWishFulfilled} ud af {studentsWithWishes.length} elever fik mindst ét ønske opfyldt.
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-indigo-700 mb-1">
                <Star size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Totale ønsker</span>
              </div>
              <div className="text-2xl font-black text-indigo-800">
                {totalWishesCount > 0 
                  ? Math.round((totalFulfilledWishes / totalWishesCount) * 100) 
                  : 0}%
              </div>
              <p className="text-[10px] text-indigo-600 mt-1">
                {totalFulfilledWishes} ud af {totalWishesCount} individuelle ønsker blev opfyldt.
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-rose-700 mb-1">
                <AlertCircle size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Konflikter</span>
              </div>
              <div className="text-2xl font-black text-rose-800">
                {conflictViolations.length}
              </div>
              <p className="text-[10px] text-rose-600 mt-1">
                Antal elever placeret i klasse med en konflikt-relation.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Scale size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Fordeling</span>
              </div>
              <div className="text-2xl font-black text-amber-800">
                {assignedStudents.length} / {students.length}
              </div>
              <p className="text-[10px] text-amber-600 mt-1">
                Elever tildelt en klasse.
              </p>
            </div>
          </div>

          {/* Class Comparison Table */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Scale size={16} className="text-indigo-500" />
              Sammenligning af klasser
            </h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-b text-gray-500 uppercase font-bold">
                  <tr>
                    <th className="px-4 py-3">Klasse</th>
                    <th className="px-4 py-3 text-center">Antal</th>
                    <th className="px-4 py-3 text-center">Køn (P/D/A)</th>
                    <th className="px-4 py-3 text-center">Fagligt</th>
                    <th className="px-4 py-3 text-center">Socialt</th>
                    <th className="px-4 py-3 text-center">Adfærd</th>
                    <th className="px-4 py-3 text-center">Støtte</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {classStats.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-800">{s.name}</td>
                      <td className="px-4 py-3 text-center">{s.count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-pink-600">{s.girls}</span> / <span className="text-blue-600">{s.boys}</span> / <span className="text-purple-600">{s.others}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Brain size={12} className="text-indigo-400" />
                          {s.avgAbility.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <HeartHandshake size={12} className="text-emerald-400" />
                          {s.avgSocial.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Zap size={12} className="text-amber-400" />
                          {s.avgBehavior.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users size={12} className="text-rose-400" />
                          {s.avgSupport.toFixed(1)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Priority Breakdown & NEST */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Users size={16} className="text-indigo-500" />
                Opfyldelse efter prioritet
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5].map(priority => {
                  const totalAtPriority = wishStats.filter(s => s.wishes.length >= priority).length;
                  const fulfilledAtPriority = priorityStats[priority] || 0;
                  if (totalAtPriority === 0) return null;
                  
                  return (
                    <div key={priority} className="bg-white border rounded-lg p-3 text-center shadow-sm">
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{priority}. ønske</div>
                      <div className="text-lg font-bold text-gray-800">{fulfilledAtPriority} / {totalAtPriority}</div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full" 
                          style={{ width: `${(fulfilledAtPriority / totalAtPriority) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Ban size={16} className="text-amber-500" />
                NEST-ønsker & undgåelser
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border rounded-lg p-3 shadow-sm">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Undgå NEST</div>
                  <div className="text-lg font-bold text-gray-800">
                    {nestAvoidanceStats.length - nestAvoidanceFailed.length} / {nestAvoidanceStats.length}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">Opfyldt: {nestAvoidanceStats.length > 0 ? Math.round(((nestAvoidanceStats.length - nestAvoidanceFailed.length) / nestAvoidanceStats.length) * 100) : 100}%</div>
                </div>
                <div className="bg-white border rounded-lg p-3 shadow-sm">
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ønsker NEST</div>
                  <div className="text-lg font-bold text-gray-800">
                    {nestPreferenceFulfilled.length} / {nestPreferenceStats.length}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-1">Opfyldt: {nestPreferenceStats.length > 0 ? Math.round((nestPreferenceFulfilled.length / nestPreferenceStats.length) * 100) : 100}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts & Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border rounded-xl overflow-hidden flex flex-col">
              <div className="bg-rose-50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Konflikt-overtrædelser
                </h3>
                <span className="bg-rose-200 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {conflictViolations.length}
                </span>
              </div>
              <div className="max-h-[250px] overflow-y-auto p-2 bg-gray-50">
                {conflictViolations.length > 0 ? (
                  conflictViolations.map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-lg border mb-2 shadow-sm">
                      <div className="font-bold text-sm text-gray-800 mb-1">{s.name}</div>
                      <div className="text-[10px] text-rose-600">
                        Placeret med: {(s.conflicts || []).filter(cid => students.find(os => os.id === cid)?.classId === s.classId).map(cid => students.find(os => os.id === cid)?.name).join(', ')}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400 italic">Ingen konflikter fundet i samme klasse! 🎉</div>
                )}
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden flex flex-col">
              <div className="bg-amber-50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Star size={16} />
                  Elever uden opfyldte ønsker
                </h3>
                <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unfulfilledWishes.length}
                </span>
              </div>
              <div className="max-h-[250px] overflow-y-auto p-2 bg-gray-50">
                {unfulfilledWishes.length > 0 ? (
                  unfulfilledWishes.map(s => (
                    <div key={s.studentId} className="bg-white p-3 rounded-lg border mb-2 shadow-sm">
                      <div className="font-bold text-sm text-gray-800 mb-1">{s.name}</div>
                      <div className="flex flex-wrap gap-1">
                        {s.wishes.map(w => (
                          <span key={w.wishId} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded border">
                            {w.priority}. {w.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400 italic">Alle elever har fået mindst ét ønske opfyldt! 🎉</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-bold transition-colors shadow-md"
          >
            Luk statistik
          </button>
        </div>
      </div>
    </div>
  );
}

