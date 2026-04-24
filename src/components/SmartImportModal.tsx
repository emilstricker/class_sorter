import React, { useState } from 'react';
import { X, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Student, Gender } from '../types';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (parsedStudents: any[]) => void;
  existingStudents: { id: string, name: string }[];
}

export function SmartImportModal({ isOpen, onClose, onImport, existingStudents }: SmartImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setError('Indtast venligst noget tekst først.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
Du er en assistent, der hjælper lærere med at udtrække strukturerede data fra deres noter om elever.
Læreren vil give dig en rå tekst med elevnavne, deres ønsker til samarbejdsmakkere, konflikter og andre noter.

VIGTIGT: Du må IKKE opfinde nye elever. Du skal matche navnene i teksten med denne liste af eksisterende elever:
${JSON.stringify(existingStudents, null, 2)}

Din opgave er at returnere et JSON-array af objekter. Hvert objekt skal repræsentere en elev fra listen og have følgende struktur:
[
  {
    "studentId": "ID på den elev, noterne handler om",
    "wishesIds": ["ID på ønsket elev 1", "ID på ønsket elev 2"], 
    "conflictsIds": ["ID på elev de ikke vil være sammen med"],
    "notes": "Eventuelle andre noter (f.eks. '5X', 'ønsker E+D')",
    "preferNestClass": true/false, // Sæt til true, hvis der står 'nestpositiv' eller lignende
    "isNestExternal": true/false, // Sæt til true, hvis de er 'visiteret' til de eksterne NEST-pladser
    "isDyslexic": true/false, // Sæt til true, hvis der står 'ordblind'
    "isExtraAttention": true/false, // Sæt til true, hvis der står 'skærpet opmærksomhed', 'angst', 'bulimi' osv.
    "extraAttentionNotes": "Hvis isExtraAttention er true, udtræk årsagen her (f.eks. 'angst', 'bulimi')"
  }
]

Regler for matchning:
- Gør dit bedste for at matche fornavne fra teksten (f.eks. "Villum") til de eksisterende navne (f.eks. "Villum_Birk_Bjerregaards").
- Hvis du er i tvivl, så brug det mest sandsynlige match.
- Ignorer navne i teksten, som slet ikke kan matches til nogen på listen.
- Returner KUN gyldig JSON. Ingen markdown-formatering, ingen introduktion.

Her er lærerens noter:
${inputText}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text;
      if (!responseText) throw new Error('Ingen respons fra AI.');

      const parsedData = JSON.parse(responseText);
      
      if (!Array.isArray(parsedData)) {
        throw new Error('AI returnerede ikke et array.');
      }

      onImport(parsedData);
      setInputText('');
      onClose();
    } catch (err: any) {
      console.error('AI Parsing Error:', err);
      setError(err.message || 'Der opstod en fejl under behandlingen af teksten.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Wand2 className="text-indigo-500" size={20} />
            Smart Import (AI)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1">
          <p className="text-sm text-gray-600">
            Indsæt dine noter om elevernes ønsker, konflikter og specielle behov her. Vores AI vil automatisk analysere teksten og opdatere elevernes profiler.
          </p>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="F.eks.&#10;Nadia&#10;Samarbejdsmakkere: Vilja, Ivan, Otto&#10;&#10;Janus&#10;Samarbejdsmakkere: Mattis, Nadia (Helst ikke Georg)"
            className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm font-mono"
            disabled={isProcessing}
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            disabled={isProcessing}
          >
            Annuller
          </button>
          <button
            onClick={handleProcess}
            disabled={isProcessing || !inputText.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {isProcessing ? 'Analyserer...' : 'Analyser & Importer'}
          </button>
        </div>
      </div>
    </div>
  );
}
