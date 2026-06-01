import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { Fiche, Gamme, SystemPrompt, APP_ID } from './types';
import { 
  FileText, 
  Settings as SettingsIcon, 
  Cpu, 
  Download, 
  Mic, 
  Activity, 
  Check, 
  Database,
  Save,
  Loader2,
  Wrench,
  Archive,
  ChevronRight,
  Settings,
  AlertCircle,
  Plus,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Templates ---

const DEFAULT_PROMPT = `Tu es un expert en maintenance industrielle. Ta tâche est de transformer des transcriptions audio de terrain en une gamme d'opérations structurée.

FORMAT DE SORTIE (JSON EXACT) :
{
  "machine_number": "ID_MACHINE",
  "steps": [
    { "op": 10, "description": "ACTION DIRECTE EN MAJUSCULES" },
    { "op": 20, "description": "SUIVANTE..." }
  ]
}

RÈGLES DE RÉDACTION :
1. Utilise des numéros d'opération par incréments de 10 (10, 20, 30).
2. Utilise des verbes à l'infinitif (VALIDER, INSPECTER, NETTOYER).
3. Soyez concis et utilisez des majuscules.
4. Identifie le numéro de machine à partir des données de formulaire ou du contexte audio.`;

// --- Mock Data (Demo) ---

const MOCK_FICHES: Fiche[] = [
  {
    _id: 'fiche-demo-1',
    app_identifier: APP_ID,
    data_type: 'fiches',
    description: 'Inspection annuelle échelle fixe - Secteur A1',
    json_data: {
      isComplete: true,
      author: { fullname: 'Marc-André Tremblay', email: 'm.tremblay@industriel.com' },
      formData: { numero_maximo: 'ECH-FIXE-A1' },
      json_source: [
        { type: 'audio', title: 'Sécurité', description: 'Transcribed', transcription: 'Je suis devant l\'échelle fixe du secteur A1. Tous les équipements environnants sont sécurisés. Le port du harnais est requis.', created_at: new Date().toISOString() },
        { type: 'audio', title: 'Calcul des montants', description: 'Transcribed', transcription: 'Y faut valider que les montants et les barreaux ne sont pas chancelants ou usés. Ici ça semble correct.', created_at: new Date().toISOString() }
      ],
      app_identifier: APP_ID,
      createdAt: new Date().toISOString()
    }
  },
  {
    _id: 'fiche-demo-2',
    app_identifier: APP_ID,
    data_type: 'fiches',
    description: 'Entretien 2 ans banc d\'essais HE2-10',
    json_data: {
      isComplete: false,
      author: { fullname: 'Lucie Giroux', email: 'l.giroux@industriel.com' },
      formData: { numero_maximo: 'HE2-10' },
      json_source: [
        { type: 'audio', title: 'Intro', description: 'Transcribed', transcription: 'Début de l\'entretien de 2 ans sur le banc d\'essais hydraulique HE2-10. Cadenassage fait.', created_at: new Date().toISOString() },
        { type: 'audio', title: 'Filtres', description: 'Transcribed', transcription: 'Le filtre de recyclage est sale, je vais le changer. Pièce numéro 934652Q.', created_at: new Date().toISOString() }
      ],
      app_identifier: APP_ID,
      createdAt: new Date().toISOString()
    }
  },
  {
    _id: 'fiche-demo-3',
    app_identifier: APP_ID,
    data_type: 'fiches',
    description: 'Vérification pont roulant - Baie 4',
    json_data: {
      isComplete: true,
      author: { fullname: 'Simon Roy', email: 's.roy@industriel.com' },
      formData: { numero_maximo: 'PR-B4-02' },
      json_source: [
        { type: 'audio', title: 'Levage', description: 'Transcribed', transcription: 'Le crochet de levage présente une usure normale. Le linguet de sécurité est fonctionnel.', created_at: new Date().toISOString() },
        { type: 'audio', title: 'Freins', description: 'Transcribed', transcription: 'Les freins de translation répondent bien. Aucun patinage observé lors des tests avec charge nominale.', created_at: new Date().toISOString() }
      ],
      app_identifier: APP_ID,
      createdAt: new Date().toISOString()
    }
  },
  {
    _id: 'fiche-demo-4',
    app_identifier: APP_ID,
    data_type: 'fiches',
    description: 'Inspection compresseur Atlas Copco',
    json_data: {
      isComplete: false,
      author: { fullname: 'Marc-André Tremblay', email: 'm.tremblay@industriel.com' },
      formData: { numero_maximo: 'COMP-08' },
      json_source: [
        { type: 'audio', title: 'Huile', description: 'Transcribed', transcription: 'Niveau d\'huile bas. Je vais en rajouter mais il faudrait surveiller si y\'a pas une fuite au niveau du joint spi.', created_at: new Date().toISOString() }
      ],
      app_identifier: APP_ID,
      createdAt: new Date().toISOString()
    }
  },
  {
    _id: 'fiche-demo-5',
    app_identifier: APP_ID,
    data_type: 'fiches',
    description: 'Maintenance ventilateur extraction',
    json_data: {
      isComplete: true,
      author: { fullname: 'Lucie Giroux', email: 'l.giroux@industriel.com' },
      formData: { numero_maximo: 'VENT-EXT-01' },
      json_source: [
        { type: 'audio', title: 'Courroies', description: 'Transcribed', transcription: 'Les courroies de transmission sont craquelées. Je les ai remplacées par des neuves de type XPA-1250.', created_at: new Date().toISOString() },
        { type: 'audio', title: 'Paliers', description: 'Transcribed', transcription: 'Graissage des paliers effectué. Pas de jeu excessif constaté.', created_at: new Date().toISOString() }
      ],
      app_identifier: APP_ID,
      createdAt: new Date().toISOString()
    }
  }
];

const MOCK_GAMMES: Gamme[] = [
  {
    _id: 'gamme-demo-1',
    data_type: 'gammes',
    description: 'Gamme Echelle Fixe A1',
    json_data: {
      fiche_id: 'fiche-demo-1',
      machine_number: 'ECH-FIXE-A1',
      steps: [
        { op: 10, description: 'SECURITE : VALIDER PERIMETRE ET PORT DU HARNAIS' },
        { op: 20, description: 'VALIDER QUE LES MONTANTS ET LES BARREAUX NE SONT PAS CHANCELLANTS' }
      ],
      app_identifier: APP_ID,
      generated_at: new Date().toISOString()
    }
  }
];

// --- Utilities ---

const Badge = ({ children, variant = 'blue' }: { children: React.ReactNode, variant?: 'blue' | 'green' | 'amber' | 'slate' | 'emerald' }) => {
  const styles: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    emerald: 'bg-emerald-500 text-white border-emerald-600 shadow-sm',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest backdrop-blur-md ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- Application ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'fiches' | 'gammes' | 'settings'>('fiches');
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedGammes, setSelectedGammes] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<SystemPrompt | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [fichesData, gammesData, promptData] = await Promise.all([
        api.filterFiches(APP_ID).catch(() => []),
        api.getGammes().catch(() => []),
        api.getPrompts().catch(() => [])
      ]);

      setFiches(fichesData);
      setGammes(gammesData);
      setPrompts(promptData);

      if (!currentPrompt) {
        const active = promptData.find(p => p.json_data.is_active) || {
          data_type: 'prompts',
          description: 'Version Initiale',
          json_data: { content: DEFAULT_PROMPT, version: 1, app_identifier: APP_ID, is_active: true }
        };
        setCurrentPrompt(active as SystemPrompt);
      } else {
        const updated = promptData.find(p => p._id === currentPrompt._id);
        if (updated) setCurrentPrompt(updated as SystemPrompt);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const handleGenerate = async (fiche: Fiche) => {
    if (!currentPrompt) return;
    setGenerating(fiche._id);
    
    const transcriptions = fiche.json_data.json_source
      .filter(s => s.transcription)
      .map(s => s.transcription)
      .join('\n');
    
    const prompt = `FICHE DE TERRAIN:\nMachine: ${fiche.json_data.formData.numero_maximo}\nDescription: ${fiche.description}\nAudios:\n${transcriptions}`;

    try {
      const gams = await api.askAI(prompt, currentPrompt.json_data.content);
      if (gams) {
        const payload: Omit<Gamme, '_id'> = {
          data_type: 'gammes',
          description: `Gamme générée - ${gams.machine_number}`,
          json_data: {
            fiche_id: fiche._id,
            machine_number: gams.machine_number,
            steps: gams.steps,
            app_identifier: APP_ID,
            generated_at: new Date().toISOString()
          }
        };
        await api.saveGamme(payload);
        await refresh();
        setActiveTab('gammes');
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(null); }
  };

  const handleUpdateStep = (gammeId: string, stepIndex: number, newDesc: string) => {
    setGammes(prev => prev.map(g => {
      if (g._id === gammeId) {
        const newSteps = [...g.json_data.steps];
        newSteps[stepIndex] = { ...newSteps[stepIndex], description: newDesc };
        return { ...g, json_data: { ...g.json_data, steps: newSteps } };
      }
      return g;
    }));
  };

  const exportCSV = () => {
    const targets = gammes.filter(g => selectedGammes.includes(g._id!));
    let csv = "Machine,Operation,Description\n";
    targets.forEach(g => {
      g.json_data.steps.forEach(s => {
        csv += `"${g.json_data.machine_number}","${s.op}","${s.description.replace(/"/g, '""')}"\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gammes_industrielles_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePrompt = () => {
    const newVersion = {
      data_type: 'prompts' as const,
      description: `Version ${prompts.length + 1}`,
      json_data: {
        content: currentPrompt ? currentPrompt.json_data.content : DEFAULT_PROMPT,
        version: prompts.length + 1,
        app_identifier: APP_ID,
        is_active: false
      }
    };
    setCurrentPrompt(newVersion as SystemPrompt);
  };

  const handleSavePrompt = async (makeActive: boolean = false) => {
    if (!currentPrompt) return;
    setLoading(true);
    try {
      const payload = { ...currentPrompt };
      if (makeActive) {
        payload.json_data.is_active = true;
      }
      await api.savePrompt(payload);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDeletePrompt = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette version ?')) return;
    setLoading(true);
    try {
      await api.deletePrompt(id);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <div className="bg-scene"><div className="orb orb-1"/><div className="orb orb-2"/><div className="orb orb-3"/><div className="absolute inset-0 backdrop-blur-[80px]"/></div>
      <div className="grain"/>

      <header className="fixed top-0 inset-x-0 h-20 glass-panel z-50 flex items-center px-10 justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-blue-600" />
          <h1 className="text-xl font-black tracking-tighter uppercase">Industrial AI <span className="text-blue-600">Gams</span></h1>
        </div>

        <nav className="flex gap-1 bg-white/40 p-1.5 rounded-[20px]">
          {['fiches', 'gammes', 'settings'].map(t => (
            <button key={t} onClick={() => setActiveTab(t as any)}
              className={`px-10 py-3 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {t === 'settings' ? 'Config' : t}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           {loading && <Loader2 className="w-5 h-5 animate-spin opacity-40 text-blue-600" />}
           <div className="w-12 h-12 rounded-2xl bg-white/40 flex items-center justify-center border border-white/60">
              <Database className="w-5 h-5 opacity-40" />
           </div>
        </div>
      </header>

      <main className="pt-32 px-10 pb-20 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
            
            {activeTab === 'fiches' && (
              <div className="space-y-12">
                <div className="flex flex-col gap-3">
                   <h2 className="text-7xl font-black tracking-tighter uppercase leading-none">Flux de Terrain</h2>
                   <p className="label-meta opacity-50 max-w-xl">Transformez vos inspections industrielles en gammes structurées d'expert.</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  {fiches.map(f => (
                    <motion.div key={f._id} 
                      className="glass-card p-6 rounded-[28px] flex items-center gap-8 group hover:shadow-xl transition-all border-2 border-white/80 hover:border-blue-200"
                    >
                      <div className="w-12 h-12 bg-blue-500/10 rounded-[18px] flex items-center justify-center text-blue-600 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-black tracking-tight uppercase leading-none truncate">{f.json_data.formData.numero_maximo || 'ID INCONNU'}</h3>
                          <Badge variant={f._id.startsWith('fiche-demo') ? 'slate' : 'blue'}>{f._id.startsWith('fiche-demo') ? 'DÉMO' : 'LIVE'}</Badge>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 line-clamp-1 opacity-70 italic">"{f.description}"</p>
                      </div>

                      <div className="flex items-center gap-8 px-8 border-x border-slate-100/50">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{f.json_data.json_source.filter(s => s.transcription).length}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">SEGMENTS</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{f.json_data.author.fullname.split(' ')[0]}</span>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">AUTEUR</span>
                        </div>
                      </div>

                      <button 
                        disabled={!!generating} 
                        onClick={() => handleGenerate(f)} 
                        className="btn-primary w-40 h-12 rounded-[18px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 group/btn shadow-lg shadow-blue-500/5"
                      >
                        {generating === f._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                        {generating === f._id ? 'ANALYSE...' : 'GÉNÉRER'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'gammes' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-white/30">
                   <div className="flex items-center gap-4 text-slate-400">
                      <Archive className="w-8 h-8" />
                      <h2 className="text-3xl font-black uppercase tracking-tighter">Registre Industriel</h2>
                   </div>
                   <div className="flex gap-3">
                      {selectedGammes.length > 0 && (
                        <button onClick={exportCSV} className="btn-primary bg-emerald-600 flex items-center gap-2 px-8 h-12 rounded-[18px] shadow-lg shadow-emerald-500/10 text-[10px]">
                          <Download className="w-4 h-4" /> EXPORTER ({selectedGammes.length})
                        </button>
                      )}
                      <button onClick={refresh} className="w-12 h-12 glass-panel rounded-[18px] flex items-center justify-center hover:bg-white transition-all shadow-sm">
                        <Database className="w-5 h-5 opacity-40" />
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {gammes.map(g => (
                    <div key={g._id} onClick={() => setSelectedGammes(p => p.includes(g._id!) ? p.filter(x => x !== g._id) : [...p, g._id!])}
                      className={`glass-card p-5 cursor-pointer border-2 transition-all hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.05)] rounded-[28px] ${selectedGammes.includes(g._id!) ? 'border-blue-500 ring-2 ring-blue-500/10 bg-white/60' : 'border-white/80'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 rounded-[14px] flex items-center justify-center text-white shadow-lg shadow-slate-900/10"><Wrench className="w-5 h-5" /></div>
                            <div>
                               <span className="text-[8px] font-black text-blue-600 block leading-none mb-0.5">MACHINE</span>
                               <h4 className="text-lg font-black leading-none uppercase tracking-tight">{g.json_data.machine_number}</h4>
                            </div>
                         </div>
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedGammes.includes(g._id!) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 shadow-inner'}`}>{selectedGammes.includes(g._id!) && <Check className="w-3 h-3" />}</div>
                      </div>
                      
                      <div className="space-y-2">
                         {g.json_data.steps.map((s, i) => (
                           <div key={i} onClick={(e) => e.stopPropagation()} className="flex gap-3 p-3 bg-white/40 rounded-[16px] border border-white/60 group focus-within:bg-white/80 transition-all">
                              <span className="font-black text-blue-600 text-[9px] mt-0.5 shrink-0">{s.op}</span>
                              <textarea 
                                rows={1}
                                value={s.description} 
                                onChange={(e) => handleUpdateStep(g._id!, i, e.target.value)} 
                                className="flex-1 bg-transparent text-[10px] font-black uppercase tracking-tight outline-none focus:text-blue-700 transition-colors resize-none leading-tight" 
                              />
                           </div>
                         ))}
                      </div>
 
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                         <Badge variant="blue">{g.json_data.steps.length} OP</Badge>
                         <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{new Date(g.json_data.generated_at).toLocaleDateString('fr-CA')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="glass-panel p-8 md:p-12 rounded-[40px] shadow-2xl">
                   <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10 justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20"><SettingsIcon className="w-8 h-8" /></div>
                        <div>
                          <h2 className="text-4xl font-black tracking-tighter uppercase">Configuration IA</h2>
                          <p className="label-meta opacity-40">Définissez le comportement de l'expert en rédaction.</p>
                        </div>
                      </div>
                      
                      {/* Simple version selector */}
                      <div className="flex items-center gap-2 bg-white/40 p-2 rounded-[20px]">
                        <select 
                          className="bg-transparent text-[11px] font-black uppercase tracking-widest text-slate-700 outline-none cursor-pointer pl-3 pr-2"
                          value={currentPrompt?._id || currentPrompt?.description || ''}
                          onChange={(e) => {
                            const selected = prompts.find(p => (p._id || p.description) === e.target.value);
                            if (selected) setCurrentPrompt(selected);
                          }}
                        >
                          {prompts.map(p => (
                            <option key={p._id || p.description} value={p._id || p.description}>
                              {p.description} {p.json_data.is_active ? '(Actif)' : ''}
                            </option>
                          ))}
                        </select>
                        <button onClick={handleCreatePrompt} className="w-8 h-8 bg-blue-600 text-white rounded-[12px] flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md">
                          <Plus className="w-4 h-4" />
                        </button>
                        {currentPrompt?._id && (
                          <button onClick={() => handleDeletePrompt(currentPrompt._id!)} className="w-8 h-8 bg-red-50 text-red-600 rounded-[12px] flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm ml-1">
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                   </div>
                   
                   <div className="mb-6">
                      <input 
                        type="text" 
                        value={currentPrompt?.description || ''} 
                        onChange={(e) => setCurrentPrompt(p => p ? { ...p, description: e.target.value } : null)}
                        className="bg-transparent text-xl font-black uppercase tracking-tighter w-full outline-none border-b-2 border-slate-200 focus:border-blue-500 transition-colors pb-2 text-slate-800 placeholder-slate-300"
                        placeholder="Nom de la version..."
                      />
                   </div>

                   <div className="relative">
                      <textarea value={currentPrompt?.json_data.content || ''} onChange={(e) => setCurrentPrompt(p => p ? { ...p, json_data: { ...p.json_data, content: e.target.value } } : null)}
                        className="w-full h-[300px] md:h-[400px] bg-white/40 border-2 border-white/60 rounded-[32px] p-8 font-mono text-[11px] leading-relaxed focus:bg-white/60 outline-none transition-all shadow-inner custom-scrollbar"
                      />
                      <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 pointer-events-none">Expert Markdown Engine</div>
                   </div>

                   <button onClick={async () => handleSavePrompt(true)} className="btn-primary w-full mt-8 h-16 rounded-[24px] flex items-center justify-center gap-4 text-sm">
                     <Save className="w-7 h-7" /> SAUVEGARDER ET ACTIVER
                   </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="fixed bottom-8 right-10 z-50">
        <div className="glass-card pl-3 pr-6 py-2.5 rounded-full flex items-center gap-4 shadow-xl border-white shadow-blue-500/5">
          <div className="relative">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
             <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500/60">Gams Engine v2.0 <span className="mx-2 text-slate-300">|</span> <span className="text-emerald-600">Encrypted Gateway Active</span></span>
        </div>
      </footer>
    </div>
  );
}
