import React, { useState, useEffect } from 'react';
import { api } from './lib/api';
import { authStore } from './utils/authStore';
import { checkAndProactiveRefresh, handleAuthCallback, logout } from './utils/authService';
import { LoginScreen } from './components/LoginScreen';
import { Fiche, Gamme, SystemPrompt, APP_ID } from './types';
import {
  FileText,
  Settings as SettingsIcon,
  Cpu,
  Download,
  Mic,
  Activity,
  Table2,
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
  Trash,
  LogOut,
  RefreshCw,
  Search,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Templates ---

const DEFAULT_PROMPT = `Tu es un expert en maintenance industrielle spécialisé dans la création de gammes d'opérations. Ta tâche est d'analyser des transcriptions audio de terrain enregistrées par des techniciens lors d'inspections, et de les transformer en une gamme d'opérations formelle et structurée.

FORMAT DE SORTIE STRICT (JSON SCHEMA) :
Tu dois impérativement respecter la structure exacte ci-dessous. Ne crée JAMAIS d'autres champs.

{
  "machine_number": "ID de la machine extrait de l'audio",
  "metadata": [],
  "steps": [
    {
      "op": 10,
      "description": "Action principale à effectuer",
      "custom_fields": [
        {
          "key": "Temps",
          "value": "0h 15min"
        }
      ]
    }
  ]
}

RÈGLES DE RÉDACTION OBLIGATOIRES :
1. NUMÉROTATION ("op") : Les opérations doivent être numérotées par incréments de 10 (ex: 10, 20, 30, 40). S'il y a une instruction intermédiaire, utilise un incrément de 5 (ex: 15, 25). N'utilise jamais d'autres valeurs.
2. DESCRIPTION ("description") : Fournis l'action principale de façon concise. Utilise une casse normale avec majuscule initiale (ex: "Vérifier le niveau d'huile"). Utilise des verbes d'action à l'infinitif.

CHAMP "TEMPS" OBLIGATOIRE :
- Dans la liste "custom_fields" de CHAQUE étape, tu DOIS inclure exactement et uniquement un objet avec la clé "Temps".
- Estime la durée de façon réaliste sous le format "Xh Ymin" (ex: "0h 15min").
- Si le temps n'est pas spécifié, la valeur DOIT être "INCONNU".`;

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

const getFicheTitle = (f: Fiche | undefined): string => {
  if (!f) return '';

  // 1. Highest priority: Explicitly edited title 'nomFiche'
  if (f.json_data?.formData?.nomFiche && f.json_data.formData.nomFiche.trim() !== '') {
    return f.json_data.formData.nomFiche.trim();
  }

  // 2. Secondary standard fields (from older forms)
  let title = f.json_data?.formData?.nom_de_la_machine || f.json_data?.name || '';
  if (title && !title.startsWith('Fiche pour session') && title !== 'ID INCONNU') {
    return title.trim();
  }

  // 3. Fallback: First valid string variable (not author, not too long)
  if (f.json_data?.formData && typeof f.json_data.formData === 'object') {
    for (const [key, value] of Object.entries(f.json_data.formData)) {
      if (key !== 'author' && key !== 'nomFiche' && typeof value === 'string' && value.trim() !== '') {
        const valTrimmed = value.trim();
        // Ignore if it's longer than 25 characters (likely an audio transcription)
        if (valTrimmed.length <= 25) {
          // Keep the old prefix behavior for numero_maximo if it happens to be the first variable
          return key === 'numero_maximo' ? `Fiche ${valTrimmed}` : valTrimmed;
        }
      }
    }
  }

  // 4. Default
  return 'Fiche Sans Nom';
};

const Badge = ({ children, variant = 'blue' }: { children: React.ReactNode, variant?: 'blue' | 'green' | 'amber' | 'slate' | 'emerald' | 'indigo' | 'purple' }) => {
  const styles: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    emerald: 'bg-emerald-500 text-white border-emerald-600 shadow-sm',
    amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    purple: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest backdrop-blur-md ${styles[variant]}`}>
      {children}
    </span>
  );
};

// --- Application ---

export default function App() {
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(authStore.getUser());
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'fiches' | 'gammes' | 'settings'>('fiches');
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [gammes, setGammes] = useState<Gamme[]>([]);
  const [expandedFiches, setExpandedFiches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedGammes, setSelectedGammes] = useState<string[]>([]);
  const [expandedGammes, setExpandedGammes] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<SystemPrompt | null>(null);
  const [newlyGeneratedTime, setNewlyGeneratedTime] = useState<string | null>(null);
  const [ficheSearch, setFicheSearch] = useState('');
  const [gammeSearch, setGammeSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const [gammeAuthorFilter, setGammeAuthorFilter] = useState('');
  const [gammeAuthorDropdownOpen, setGammeAuthorDropdownOpen] = useState(false);

  const getGammeAuthor = (g: Gamme): string => {
    const gAny = g as any;
    let authorName = gAny['user-email'] || gAny.user_email || (g.json_data as any)?.['user-email'] || (g.json_data as any)?.user_email || '';
    if (!authorName) {
      const sourceFiche = fiches.find(f => f._id === g.json_data.fiche_id);
      if (sourceFiche) {
        const sfAny = sourceFiche as any;
        authorName = sourceFiche.json_data?.author?.fullname || sourceFiche.json_data?.auteur?.nom || sfAny['user-email'] || sfAny.user_email || '';
      }
    }
    if (authorName.includes('@')) authorName = authorName.split('@')[0].toUpperCase();
    return authorName;
  };

  const gammeAuthors = Array.from(new Set(
    gammes.map(getGammeAuthor).filter((a): a is string => !!a && a.trim() !== '')
  )).sort((a, b) => a.localeCompare(b));

  const ficheAuthors = Array.from(new Set(
    fiches
      .map(f => f.json_data?.author?.fullname)
      .filter((a): a is string => !!a && a.trim() !== '')
  )).sort((a, b) => a.localeCompare(b));

  const filteredFiches = fiches.filter(f => {
    // Author filter
    if (authorFilter && (f.json_data?.author?.fullname || '') !== authorFilter) return false;

    if (!ficheSearch) return true;
    const searchLower = ficheSearch.toLowerCase();

    const maximo = f.json_data?.formData?.numero_maximo || '';
    const desc = f.description || '';
    const author = f.json_data?.author?.fullname || '';
    const name = getFicheTitle(f);

    if (name.toLowerCase().includes(searchLower)) return true;
    if (maximo.toLowerCase().includes(searchLower)) return true;
    if (desc.toLowerCase().includes(searchLower)) return true;
    if (author.toLowerCase().includes(searchLower)) return true;

    const rawNotes = f.json_data?.notes;
    if (Array.isArray(rawNotes)) {
      for (const n of rawNotes) {
        if (n.text?.toLowerCase().includes(searchLower)) return true;
        if (n.transcription?.toLowerCase().includes(searchLower)) return true;
        if (n.aiAnalysis?.toLowerCase().includes(searchLower)) return true;
      }
    }

    const rawSource = f.json_data?.json_source;
    if (Array.isArray(rawSource)) {
      for (const src of rawSource) {
        if (src.title?.toLowerCase().includes(searchLower)) return true;
        if (src.transcription?.toLowerCase().includes(searchLower)) return true;
      }
    } else if (rawSource && typeof rawSource === 'object') {
      const audios = Array.isArray(rawSource.audioTranscriptions) ? rawSource.audioTranscriptions : [];
      const texts = Array.isArray(rawSource.textNotes) ? rawSource.textNotes : [];
      const images = Array.isArray(rawSource.imageDescriptions) ? rawSource.imageDescriptions : [];
      for (const a of audios) {
        if (a.transcription?.toLowerCase().includes(searchLower)) return true;
      }
      for (const t of texts) {
        if (t.text?.toLowerCase().includes(searchLower)) return true;
      }
      for (const i of images) {
        if (i.description?.toLowerCase().includes(searchLower)) return true;
      }
    }

    return false;
  });

  const filteredGammes = [...gammes].sort((a, b) =>
    new Date(b.json_data.generated_at).getTime() - new Date(a.json_data.generated_at).getTime()
  ).filter(g => {
    // Author filter
    if (gammeAuthorFilter && getGammeAuthor(g) !== gammeAuthorFilter) return false;

    if (!gammeSearch) return true;
    const searchLower = gammeSearch.toLowerCase();

    const machine = g.json_data.machine_number || '';
    const desc = g.description || '';

    const sourceFiche = fiches.find(f => f._id === g.json_data.fiche_id);
    const ficheName = sourceFiche ? getFicheTitle(sourceFiche) : '';

    if (ficheName.toLowerCase().includes(searchLower)) return true;
    if (machine.toLowerCase().includes(searchLower)) return true;
    if (desc.toLowerCase().includes(searchLower)) return true;

    if (g.json_data.metadata) {
      for (const meta of g.json_data.metadata) {
        if (meta.key.toLowerCase().includes(searchLower)) return true;
        if (meta.value.toLowerCase().includes(searchLower)) return true;
      }
    }

    if (g.json_data.steps) {
      for (const step of g.json_data.steps) {
        if (step.description.toLowerCase().includes(searchLower)) return true;
        if (step.custom_fields) {
          for (const field of step.custom_fields) {
            if (field.key.toLowerCase().includes(searchLower)) return true;
            if (field.value.toLowerCase().includes(searchLower)) return true;
          }
        }
      }
    }

    return false;
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const [fichesDataRaw, gammesData, promptData] = await Promise.all([
        api.filterFiches([APP_ID]).catch(() => []),
        api.getGammes().catch(() => []),
        api.getPrompts().catch(() => [])
      ]);

      // Hybrid merge: Fetch the underlying Session for each Fiche to get the live 'notes' and 'json_source'
      const fichesData = await Promise.all(fichesDataRaw.map(async (fiche) => {
        const sessionId = fiche.json_data?.sessionId;
        if (sessionId) {
          try {
            const sessionData = await api.getSession(sessionId);
            if (sessionData && sessionData.json_data) {
              if (sessionData.json_data.notes) {
                fiche.json_data.notes = sessionData.json_data.notes;
              }
              if (sessionData.json_data.json_source) {
                fiche.json_data.json_source = sessionData.json_data.json_source;
              }
            }
          } catch (err) {
            console.error(`Failed to fetch session ${sessionId} for fiche ${fiche._id}`, err);
          }
        }
        return fiche;
      }));

      // Sort fiches by date descending
      fichesData.sort((a, b) => new Date(b.lastModified || b.createdAt || 0).getTime() - new Date(a.lastModified || a.createdAt || 0).getTime());

      setFiches(fichesData);
      setGammes(gammesData);
      setPrompts(promptData);

      if (!currentPrompt || !currentPrompt._id) {
        let match = null;
        if (currentPrompt) {
          match = promptData.find(p => (p.json_data.name || p.description) === (currentPrompt.json_data.name || currentPrompt.description) && p.json_data.content === currentPrompt.json_data.content);
        }

        if (match) {
          setCurrentPrompt(match as SystemPrompt);
        } else {
          const active = promptData.find(p => p.json_data.is_active) || promptData[0] || {
            data_type: 'prompts',
            description: 'Version Initiale',
            json_data: { content: DEFAULT_PROMPT, version: 1, app_identifier: APP_ID, is_active: true }
          };
          setCurrentPrompt(active as SystemPrompt);
        }
      } else {
        const updated = promptData.find(p => p._id === currentPrompt._id);
        if (updated) {
          setCurrentPrompt(updated as SystemPrompt);
        } else {
          const active = promptData.find(p => p.json_data.is_active) || promptData[0];
          if (active) setCurrentPrompt(active as SystemPrompt);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const initAuth = async () => {
      await authStore.hydrate();

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('authorization_code');
      const state = urlParams.get('state');

      if (code && state) {
        const success = await handleAuthCallback(code, state);
        if (success) {
          window.history.replaceState({}, document.title, window.location.pathname);
          setIsAuthenticated(true);
        }
      } else {
        const valid = await checkAndProactiveRefresh();
        setIsAuthenticated(valid);
      }

      setIsAuthChecking(false);
    };

    initAuth();

    const unsubscribe = authStore.subscribe((token) => {
      setIsAuthenticated(!!token);
      setCurrentUser(authStore.getUser());
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (newlyGeneratedTime) {
      const handler = () => setNewlyGeneratedTime(null);
      const timer = setTimeout(() => {
        window.addEventListener('click', handler);
      }, 100);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('click', handler);
      };
    }
  }, [newlyGeneratedTime]);

  const handleGenerate = async (fiche: Fiche) => {
    const activePrompt = prompts.find(p => p.json_data.is_active);
    if (!activePrompt) {
      console.warn("Aucune instruction système active trouvée, utilisation du prompt en cours d'édition ou par défaut.");
    }

    const promptToUse = activePrompt || currentPrompt;
    if (!promptToUse) return;

    setGenerating(fiche._id);

    // Convertir l'objet fiche entier en chaîne JSON pour l'envoyer à l'IA
    const prompt = JSON.stringify(fiche, null, 2);

    try {
      const isHtml = promptToUse.json_data.export_format === 'html';
      const gams = await api.askAI(prompt, promptToUse.json_data.content, isHtml ? 'html' : 'csv');
      if (gams) {
        const genTime = new Date().toISOString();
        const payload: Omit<Gamme, '_id'> = {
          data_type: 'gammes',
          description: `Gamme générée - ${isHtml ? 'HTML Doc' : gams.machine_number}`,
          json_data: {
            fiche_id: fiche._id!,
            prompt_id: promptToUse._id,
            machine_number: isHtml ? 'DOCUMENT HTML' : gams.machine_number,
            steps: isHtml ? [] : gams.steps,
            raw_html: isHtml ? (typeof gams === 'string' ? gams : JSON.stringify(gams)) : undefined,
            app_identifier: APP_ID,
            generated_at: genTime
          }
        };
        await api.saveGamme(payload);
        setNewlyGeneratedTime(genTime);
        await refresh();
        setActiveTab('gammes');
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(null); }
  };

  const handleUpdateStep = (gammeId: string, stepIndex: number, field: 'description' | 'op', newValue: string | number) => {
    setGammes(prev => prev.map(g => {
      if (g._id === gammeId) {
        const newSteps = [...g.json_data.steps];
        newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: newValue };
        return { ...g, json_data: { ...g.json_data, steps: newSteps } };
      }
      return g;
    }));
  };

  const handleUpdateCustomField = (gammeId: string, stepIndex: number, fieldIndex: number, newValue: string) => {
    setGammes(prev => prev.map(g => {
      if (g._id === gammeId) {
        const newSteps = [...g.json_data.steps];
        const newCustomFields = [...(newSteps[stepIndex].custom_fields || [])];
        if (newCustomFields[fieldIndex]) {
          newCustomFields[fieldIndex] = { ...newCustomFields[fieldIndex], value: newValue };
          newSteps[stepIndex] = { ...newSteps[stepIndex], custom_fields: newCustomFields };
        }
        return { ...g, json_data: { ...g.json_data, steps: newSteps } };
      }
      return g;
    }));
  };

  const handleUpdateMetadata = (gammeId: string, metaIndex: number, newValue: string) => {
    setGammes(prev => prev.map(g => {
      if (g._id === gammeId && g.json_data.metadata) {
        const newMetadata = [...g.json_data.metadata];
        if (newMetadata[metaIndex]) {
          newMetadata[metaIndex] = { ...newMetadata[metaIndex], value: newValue };
        }
        return { ...g, json_data: { ...g.json_data, metadata: newMetadata } };
      }
      return g;
    }));
  };

  const handleUpdateFicheTranscription = (ficheId: string, srcIndex: number, newTranscription: string) => {
    setFiches(prev => prev.map(f => {
      if (f._id === ficheId) {
        if (Array.isArray(f.json_data?.notes)) {
          const newNotes = [...f.json_data.notes];
          if (newNotes[srcIndex]) {
            newNotes[srcIndex] = { ...newNotes[srcIndex], transcription: newTranscription, text: newTranscription };
            return { ...f, json_data: { ...f.json_data, notes: newNotes } };
          }
        } else if (f.json_data?.json_source) {
          if (Array.isArray(f.json_data.json_source)) {
            const newSource = [...f.json_data.json_source];
            newSource[srcIndex] = { ...newSource[srcIndex], transcription: newTranscription };
            return { ...f, json_data: { ...f.json_data, json_source: newSource } };
          } else {
            let audios = f.json_data.json_source.audioTranscriptions || [];
            if (srcIndex < audios.length) {
              const newAudios = [...audios];
              newAudios[srcIndex] = { ...newAudios[srcIndex], transcription: newTranscription };
              return { ...f, json_data: { ...f.json_data, json_source: { ...f.json_data.json_source, audioTranscriptions: newAudios } } };
            }
          }
        }
      }
      return f;
    }));
  };

  const handleUpdateFicheDescription = (ficheId: string, srcIndex: number, newDescription: string) => {
    setFiches(prev => prev.map(f => {
      if (f._id === ficheId) {
        if (Array.isArray(f.json_data?.notes)) {
          const newNotes = [...f.json_data.notes];
          if (newNotes[srcIndex]) {
            newNotes[srcIndex] = { ...newNotes[srcIndex], aiAnalysis: newDescription, text: newDescription };
            return { ...f, json_data: { ...f.json_data, notes: newNotes } };
          }
        } else if (f.json_data?.json_source) {
          if (Array.isArray(f.json_data.json_source)) {
            const newSource = [...f.json_data.json_source];
            newSource[srcIndex] = { ...newSource[srcIndex], description: newDescription };
            return { ...f, json_data: { ...f.json_data, json_source: newSource } };
          } else {
            let audios = f.json_data.json_source.audioTranscriptions || [];
            let texts = f.json_data.json_source.textNotes || [];
            let images = f.json_data.json_source.imageDescriptions || [];

            if (srcIndex < audios.length) {
              return f;
            } else if (srcIndex < audios.length + texts.length) {
              const idx = srcIndex - audios.length;
              const newTexts = [...texts];
              newTexts[idx] = { ...newTexts[idx], text: newDescription };
              return { ...f, json_data: { ...f.json_data, json_source: { ...f.json_data.json_source, textNotes: newTexts } } };
            } else if (srcIndex < audios.length + texts.length + images.length) {
              const idx = srcIndex - audios.length - texts.length;
              const newImages = [...images];
              newImages[idx] = { ...newImages[idx], description: newDescription };
              return { ...f, json_data: { ...f.json_data, json_source: { ...f.json_data.json_source, imageDescriptions: newImages } } };
            }
          }
        }
      }
      return f;
    }));
  };

  const handleDeleteGammes = async () => {
    if (!confirm(`Voulez-vous vraiment supprimer ${selectedGammes.length} gamme(s) ?`)) return;
    setLoading(true);
    try {
      await Promise.all(selectedGammes.map(id => api.deleteGamme(id)));
      setSelectedGammes([]);
      await refresh();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    const targets = gammes.filter(g => selectedGammes.includes(g._id!));

    // Discover all unique custom field keys across metadata and step custom_fields
    const customKeysSet = new Set<string>();
    targets.forEach(g => {
      if (g.json_data.metadata) {
        g.json_data.metadata.forEach(m => customKeysSet.add(m.key));
      }
      g.json_data.steps.forEach(s => {
        if (s.custom_fields) {
          s.custom_fields.forEach(f => customKeysSet.add(f.key));
        }
      });
    });

    const customKeys = Array.from(customKeysSet);
    let csv = `Machine,Operation,Description${customKeys.length > 0 ? ',' + customKeys.join(',') : ''}\n`;

    targets.forEach(g => {
      // Create a map of top-level metadata for easy access
      const metaMap: Record<string, string> = {};
      if (g.json_data.metadata) {
        g.json_data.metadata.forEach(m => metaMap[m.key] = m.value);
      }

      g.json_data.steps.forEach(s => {
        const desc = s.description ? s.description.replace(/"/g, '""') : '';

        // Create a map of step-level custom fields
        const stepFieldMap: Record<string, string> = {};
        if (s.custom_fields) {
          s.custom_fields.forEach(f => stepFieldMap[f.key] = f.value);
        }

        let row = `"${g.json_data.machine_number}","${s.op}","${desc}"`;

        // Append all custom fields (metadata or step specific)
        customKeys.forEach(key => {
          let val = stepFieldMap[key] || metaMap[key] || "";
          row += `,"${val.replace(/"/g, '""')}"`;
        });

        csv += row + "\n";
      });
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gammes_industrielles_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHTML = () => {
    const targets = gammes.filter(g => selectedGammes.includes(g._id!) && g.json_data.raw_html);
    targets.forEach((g, index) => {
      setTimeout(() => {
        const blob = new Blob([g.json_data.raw_html!], { type: 'text/html;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `gamme_${g.json_data.machine_number.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  };

  const handleCreatePrompt = () => {
    const newVersion = {
      data_type: 'prompts' as const,
      description: `Version ${prompts.length + 1}`,
      json_data: {
        name: `Version ${prompts.length + 1}`,
        content: 'INSERER NOUVELLE VERSION SYSTEME INSTRUCTION ICI',
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
        const activePrompts = prompts.filter(p => p.json_data.is_active && p._id !== payload._id);
        await Promise.all(activePrompts.map(ap =>
          api.updatePrompt(ap._id!, { ...ap, json_data: { ...ap.json_data, is_active: false } })
        ));
      }

      if (payload._id) {
        await api.updatePrompt(payload._id, payload);
      } else {
        await api.savePrompt(payload);
      }
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

  if (isAuthChecking) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen">
      <div className="bg-scene"><div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" /><div className="absolute inset-0 backdrop-blur-[80px]" /></div>
      <div className="grain" />

      <header className="fixed top-0 inset-x-0 h-20 glass-panel z-50 flex items-center px-5 md:px-10 justify-between">
        <div className="flex items-center gap-3">
          <Table2 className="w-8 h-8 text-blue-600 shrink-0" />
          <h1 className="text-xl font-black tracking-tighter uppercase"><span className="text-blue-600">Gamme</span></h1>
        </div>

        <nav className="hidden md:flex gap-1 bg-white/40 p-1.5 rounded-[20px]">
          {(['fiches', 'gammes', 'settings'] as const).map(t => {
            const disabled = t === 'settings' && !isAdmin;
            return (
              <button key={t}
                onClick={() => {
                  if (disabled) return;
                  setActiveTab(t);
                  if (t !== 'gammes') setExpandedGammes([]);
                }}
                title={disabled ? 'Accès réservé aux administrateurs' : undefined}
                className={`px-10 py-3 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all
                  ${activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}
                  ${disabled ? 'opacity-30 cursor-not-allowed hover:text-slate-500' : ''}`}
              >
                {t === 'settings' ? 'Config' : t === 'fiches' ? 'Notes' : t}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={refresh}
            disabled={loading}
            className="w-12 h-12 rounded-2xl bg-white/40 flex items-center justify-center border border-white/60 hover:bg-white/60 transition-all hover:scale-105 active:scale-95 group shadow-sm disabled:opacity-50"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-5 h-5 opacity-60 group-hover:opacity-100 transition-all text-slate-800 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => logout()}
            className="w-12 h-12 rounded-2xl bg-white/40 flex items-center justify-center border border-white/60 hover:bg-red-50 hover:border-red-200 transition-all group shadow-sm"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-all text-red-500" />
          </button>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[72px] glass-panel border-t border-white/50 z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {([
          { id: 'fiches', label: 'Notes', Icon: FileText },
          { id: 'gammes', label: 'Gammes', Icon: Archive },
          { id: 'settings', label: 'Config', Icon: Settings },
        ] as const).map(({ id, label, Icon }) => {
          const disabled = id === 'settings' && !isAdmin;
          return (
          <button
            key={id}
            onClick={() => {
              if (disabled) return;
              setActiveTab(id);
              if (id !== 'gammes') setExpandedGammes([]);
            }}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-2xl transition-all
              ${activeTab === id ? 'text-blue-600' : 'text-slate-400'}
              ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Icon className={`w-6 h-6 transition-transform ${activeTab === id ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
          </button>
          );
        })}
      </nav>

      <main className="pt-28 md:pt-32 px-4 md:px-10 pb-28 md:pb-20 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>

            {activeTab === 'fiches' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none flex items-center gap-5"><span className="whitespace-nowrap">Notes</span> <span className="text-2xl md:text-3xl text-blue-500 bg-blue-500/10 px-4 py-1.5 md:px-5 md:py-2 rounded-[20px] translate-y-1">{fiches.length}</span></h2>
                    <p className="label-meta opacity-50 max-w-xl">Transformez vos inspections industrielles en gammes structurées d'expert.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto lg:mr-24 xl:mr-40">
                    {/* Author Filter */}
                    <div className="relative w-full sm:w-56 shrink-0">
                      <button
                        onClick={() => setAuthorDropdownOpen(o => !o)}
                        className={`w-full flex items-center gap-2 pl-4 pr-3 py-3 border rounded-[18px] text-xs font-semibold outline-none transition-all shadow-sm ${authorFilter ? 'bg-blue-500/10 border-blue-500/30 text-blue-700' : 'bg-white/40 border-white/60 hover:bg-white/60 text-slate-800'}`}
                      >
                        <User className={`w-4 h-4 shrink-0 ${authorFilter ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="truncate flex-1 text-left">{authorFilter || 'Tous les auteurs'}</span>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${authorDropdownOpen ? 'rotate-90' : ''} ${authorFilter ? 'text-blue-400' : 'text-slate-400'}`} />
                      </button>
                      {authorDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setAuthorDropdownOpen(false)} />
                          <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[18px] shadow-xl shadow-slate-900/10 p-2 max-h-72 overflow-y-auto">
                            <button
                              onClick={() => { setAuthorFilter(''); setAuthorDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 rounded-[12px] text-xs font-bold transition-all ${!authorFilter ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              Tous les auteurs
                            </button>
                            {ficheAuthors.map(a => (
                              <button
                                key={a}
                                onClick={() => { setAuthorFilter(a); setAuthorDropdownOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 rounded-[12px] text-xs font-bold transition-all truncate ${authorFilter === a ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                title={a}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Search Bar for Fiches */}
                    <div className="relative w-full md:max-w-md shrink-0">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={ficheSearch}
                        onChange={(e) => setFicheSearch(e.target.value)}
                        placeholder="Rechercher une note (n° maximo, description...)"
                        className="w-full pl-12 pr-10 py-3 bg-white/40 border border-white/60 focus:bg-white/60 focus:border-blue-500 rounded-[18px] text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all shadow-sm"
                      />
                      {ficheSearch && (
                        <button
                          onClick={() => setFicheSearch('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {filteredFiches.length === 0 && (
                    <div className="glass-card p-12 text-center rounded-[28px] border-2 border-dashed border-white/40">
                      <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-bold text-slate-700">Aucune note trouvée</h3>
                      <p className="text-xs text-slate-500 mt-1">Aucune note ne correspond à votre recherche "{ficheSearch}".</p>
                    </div>
                  )}
                  {filteredFiches.map(f => {
                    const isExpanded = expandedFiches.includes(f._id);
                    const ficheGammes = gammes
                      .filter(g => g.json_data?.fiche_id === f._id)
                      .sort((a, b) => new Date(b.json_data.generated_at).getTime() - new Date(a.json_data.generated_at).getTime());
                    return (
                      <div key={f._id}
                        className="glass-card p-6 rounded-[28px] group transition-all border-2 border-white/80 hover:border-blue-200"
                      >
                        <div className="flex items-center gap-3 md:gap-8 cursor-pointer" onClick={() => setExpandedFiches(prev => prev.includes(f._id) ? prev.filter(x => x !== f._id) : [...prev, f._id])}>
                          <div className="w-12 h-12 bg-blue-500/10 rounded-[18px] flex items-center justify-center text-blue-600 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1 w-full">
                              <input
                                className="text-xl font-black tracking-tight uppercase leading-none truncate bg-transparent border-none outline-none w-full placeholder-slate-300"
                                value={(() => {
                                  return getFicheTitle(f);
                                })()}
                                onChange={(e) => {
                                  setFiches(prev => prev.map(prevF => {
                                    if (prevF._id === f._id) {
                                      return {
                                        ...prevF,
                                        description: e.target.value,
                                        json_data: {
                                          ...prevF.json_data,
                                          formData: {
                                            ...(prevF.json_data?.formData || {}),
                                            nom_de_la_machine: e.target.value
                                          }
                                        }
                                      };
                                    }
                                    return prevF;
                                  }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                    try {
                                      await api.updateFiche(f._id!, f);
                                    } catch (err) {
                                      console.error("Failed to update name", err);
                                    }
                                  }
                                }}
                                title="Appuyez sur Entrée pour sauvegarder"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              {ficheGammes.length > 0 ? (
                                <>
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600/80 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {ficheGammes.length} générée{ficheGammes.length > 1 ? 's' : ''}
                                  </span>
                                  {ficheGammes.map(g => (
                                    <button
                                      key={g._id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveTab('gammes');
                                        setNewlyGeneratedTime(g.json_data.generated_at);
                                        setTimeout(() => {
                                          document.getElementById(`gamme-${g._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 500);
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-widest backdrop-blur-md bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/20 transition-all cursor-pointer"
                                    >
                                      {g.json_data.machine_number}
                                      <span className="opacity-50 normal-case tracking-normal font-normal">· {new Date(g.json_data.generated_at).toLocaleDateString('fr-CA')}</span>
                                    </button>
                                  ))}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Pas encore générée
                                </span>
                              )}
                            </div>
                            {(!f.description || f.description.startsWith('Fiche pour session')) ? null : (
                              <p className="text-[11px] font-bold text-slate-500 line-clamp-1 opacity-70 italic">"{f.description}"</p>
                            )}
                            {f._id && <span className="text-[8px] font-mono text-slate-400 mt-1 block truncate">ID: {f._id}</span>}
                          </div>

                          <div className="flex items-center gap-8 px-8 border-x border-slate-100/50 hidden md:flex">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{f.json_data?.author?.fullname?.split(' ')[0] || 'Inconnu'}</span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">AUTEUR</span>
                            </div>
                          </div>

                          <button
                            disabled={!!generating}
                            onClick={(e) => { e.stopPropagation(); handleGenerate(f); }}
                            className={`btn-primary w-12 px-0 md:w-40 md:px-6 h-12 rounded-[18px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 group/btn shrink-0 transition-all duration-500 ${generating === f._id ? 'animate-pulse shadow-lg shadow-blue-500/20 scale-[0.98]' : 'shadow-lg shadow-blue-500/5'}`}
                          >
                            {generating === f._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                            <span className="hidden md:inline">{generating === f._id ? 'ANALYSE...' : 'GÉNÉRER'}</span>
                          </button>

                          <button
                            className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all shrink-0 hidden sm:flex ${isExpanded ? 'bg-blue-50 text-blue-600 rotate-90' : ''}`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                                {(() => {
                                  const rawNotes = f.json_data?.notes;
                                  const rawSource = f.json_data?.json_source;
                                  let sources: any[] = [];

                                  if (Array.isArray(rawNotes)) {
                                    sources = rawNotes.map((n: any) => ({
                                      type: n.type === 'audio' ? 'audio' : n.type === 'photo' ? 'photo' : 'texte',
                                      title: n.type === 'audio' ? 'Audio' : n.type === 'photo' ? 'Image' : 'Note',
                                      description: n.aiAnalysis || (n.type !== 'audio' ? n.text : ''),
                                      transcription: n.type === 'audio' ? (n.text || n.transcription || '') : (n.transcription || ''),
                                      media_url: n.mediaUrl || n.mediaContent,
                                      created_at: n.timestamp
                                    }));
                                  } else if (Array.isArray(rawSource)) {
                                    sources = rawSource;
                                  } else if (rawSource && typeof rawSource === 'object') {
                                    if (Array.isArray(rawSource.audioTranscriptions)) {
                                      sources.push(...rawSource.audioTranscriptions.map((a: any) => ({
                                        type: 'audio',
                                        title: 'Audio',
                                        description: 'Transcribed',
                                        transcription: a.transcription,
                                        media_url: a.audioUrl,
                                        created_at: a.timestamp
                                      })));
                                    }
                                    if (Array.isArray(rawSource.textNotes)) {
                                      sources.push(...rawSource.textNotes.map((t: any) => ({
                                        type: 'texte',
                                        title: 'Note Textuelle',
                                        description: t.text,
                                        created_at: t.timestamp
                                      })));
                                    }
                                    if (Array.isArray(rawSource.imageDescriptions)) {
                                      sources.push(...rawSource.imageDescriptions.map((i: any) => ({
                                        type: 'photo',
                                        title: 'Image',
                                        description: i.description,
                                        media_url: i.imageUrl,
                                        created_at: i.timestamp
                                      })));
                                    }
                                  }

                                  if (sources.length === 0) {
                                    return <p className="text-xs text-slate-400 italic text-center py-4">Aucune donnée multimédia disponible.</p>;
                                  }

                                  return sources.map((src, i) => {
                                    const srcType = typeof src?.type === 'string' ? src.type : '';
                                    const isImage = ['photo', 'image'].includes(srcType.toLowerCase());
                                    const isAudio = srcType.toLowerCase() === 'audio';
                                    const isText = !isImage && !isAudio;

                                    const srcDesc = typeof src?.description === 'string' ? src.description : '';
                                    const srcTrans = typeof src?.transcription === 'string' ? src.transcription : '';
                                    const showDescription = isText && !!srcDesc &&
                                      srcDesc.toLowerCase() !== 'transcribed' &&
                                      srcDesc.trim() !== srcTrans.trim();

                                    return (
                                      <div key={i} className="flex flex-col gap-3 p-4 bg-white/40 rounded-[16px] border border-white/60">
                                        {/* Header */}
                                        <div className="flex items-center gap-2">
                                          <Badge variant="slate">{src.type}</Badge>
                                          <h4 className="text-xs font-black uppercase text-slate-800 truncate">{src.title}</h4>
                                          <span className="text-[9px] font-bold text-slate-400 ml-auto shrink-0">{src.created_at ? new Date(src.created_at).toLocaleString('fr-CA') : ''}</span>
                                        </div>

                                        <div className="flex flex-col md:flex-row gap-4 items-start">
                                          {/* Media Column (Only for images) */}
                                          {isImage && src.media_url && (
                                            <button onClick={(e) => { e.stopPropagation(); setFullscreenImage(src.media_url!); }} title="Voir l'image en plein écran" className="w-full md:w-32 shrink-0 outline-none text-left">
                                              <img src={src.media_url} alt={src.title} className="w-full h-24 object-cover rounded-[12px] border border-slate-200 hover:opacity-80 transition-opacity cursor-zoom-in" />
                                            </button>
                                          )}

                                          {/* Content Column */}
                                          <div className="flex-1 min-w-0 w-full flex flex-col gap-2">

                                            {showDescription && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Description</span>
                                                <textarea
                                                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                  value={srcDesc}
                                                  onChange={(e) => {
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                    handleUpdateFicheDescription(f._id!, i, e.target.value);
                                                  }}
                                                  onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      e.currentTarget.blur();
                                                      try {
                                                        if (f.json_data?.sessionId) {
                                                          await api.updateSessionData(f.json_data.sessionId, {
                                                            notes: f.json_data.notes,
                                                            json_source: f.json_data.json_source
                                                          });
                                                        } else {
                                                          await api.updateFiche(f._id!, f);
                                                        }
                                                      } catch (err) { console.error("Failed", err); }
                                                    }
                                                  }}
                                                  title="Appuyez sur Entrée pour sauvegarder"
                                                  className="text-[11px] text-slate-600 leading-relaxed font-medium w-full bg-slate-50/50 border border-slate-200 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-md p-2 resize-none overflow-hidden transition-all outline-none"
                                                  rows={1}
                                                />
                                              </div>
                                            )}

                                            {typeof srcTrans === 'string' && srcTrans !== '' && (
                                              <div className="flex flex-col gap-1">
                                                <span className="text-[9px] font-black uppercase text-slate-400">Transcription</span>
                                                <textarea
                                                  ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                  value={srcTrans}
                                                  onChange={(e) => {
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = e.target.scrollHeight + 'px';
                                                    handleUpdateFicheTranscription(f._id!, i, e.target.value);
                                                  }}
                                                  onKeyDown={async (e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                      e.preventDefault();
                                                      e.currentTarget.blur();
                                                      try {
                                                        if (f.json_data?.sessionId) {
                                                          await api.updateSessionData(f.json_data.sessionId, {
                                                            notes: f.json_data.notes,
                                                            json_source: f.json_data.json_source
                                                          });
                                                        } else {
                                                          await api.updateFiche(f._id!, f);
                                                        }
                                                      } catch (err) { console.error("Failed", err); }
                                                    }
                                                  }}
                                                  title="Appuyez sur Entrée pour sauvegarder"
                                                  className="text-xs text-slate-700 leading-relaxed font-medium w-full bg-transparent border border-transparent focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-md p-1 -ml-1 resize-none overflow-hidden transition-all outline-none"
                                                  rows={1}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'gammes' && (
              <div className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/30">
                  <div className="flex items-center gap-4 text-slate-400">
                    <Archive className="w-8 h-8" />
                    <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">Gamme Générée <span className="text-lg text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-[12px] relative top-0.5">{gammes.length}</span></h2>
                  </div>
                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                    {/* Author Filter for Gammes */}
                    <div className="relative w-full md:w-56 shrink-0">
                      <button
                        onClick={() => setGammeAuthorDropdownOpen(o => !o)}
                        className={`w-full flex items-center gap-2 pl-4 pr-3 py-3 border rounded-[18px] text-xs font-semibold outline-none transition-all shadow-sm ${gammeAuthorFilter ? 'bg-blue-500/10 border-blue-500/30 text-blue-700' : 'bg-white/40 border-white/60 hover:bg-white/60 text-slate-800'}`}
                      >
                        <User className={`w-4 h-4 shrink-0 ${gammeAuthorFilter ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className="truncate flex-1 text-left">{gammeAuthorFilter || 'Tous les auteurs'}</span>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${gammeAuthorDropdownOpen ? 'rotate-90' : ''} ${gammeAuthorFilter ? 'text-blue-400' : 'text-slate-400'}`} />
                      </button>
                      {gammeAuthorDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setGammeAuthorDropdownOpen(false)} />
                          <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[18px] shadow-xl shadow-slate-900/10 p-2 max-h-72 overflow-y-auto">
                            <button
                              onClick={() => { setGammeAuthorFilter(''); setGammeAuthorDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 rounded-[12px] text-xs font-bold transition-all ${!gammeAuthorFilter ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              Tous les auteurs
                            </button>
                            {gammeAuthors.map(a => (
                              <button
                                key={a}
                                onClick={() => { setGammeAuthorFilter(a); setGammeAuthorDropdownOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 rounded-[12px] text-xs font-bold transition-all truncate ${gammeAuthorFilter === a ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                                title={a}
                              >
                                {a}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Search Bar for Gammes */}
                    <div className="relative w-full md:w-80 shrink-0">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        value={gammeSearch}
                        onChange={(e) => setGammeSearch(e.target.value)}
                        placeholder="Rechercher une gamme..."
                        className="w-full pl-10 pr-10 py-3 bg-white/40 border border-white/60 focus:bg-white/60 focus:border-blue-500 rounded-[18px] text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-all shadow-sm"
                      />
                      {gammeSearch && (
                        <button
                          onClick={() => setGammeSearch('')}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-650"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteGammes}
                        disabled={selectedGammes.length === 0}
                        title={selectedGammes.length > 0 ? `Supprimer ${selectedGammes.length} gamme(s)` : "Supprimer"}
                        className={`w-12 h-12 glass-panel rounded-[18px] flex items-center justify-center transition-all shadow-sm group ${selectedGammes.length === 0 ? 'bg-white/40 border-white/60 text-slate-400 cursor-not-allowed' : 'hover:bg-red-50 hover:text-red-500 cursor-pointer'}`}
                      >
                        <Trash className={`w-5 h-5 ${selectedGammes.length === 0 ? 'opacity-50' : 'opacity-40 group-hover:opacity-100'}`} />
                      </button>
                      <button
                        onClick={exportCSV}
                        disabled={selectedGammes.length === 0 || !gammes.filter(g => selectedGammes.includes(g._id!)).some(g => !g.json_data.raw_html)}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-6 h-12 rounded-[18px] font-black uppercase tracking-widest text-[10px] transition-all ${selectedGammes.length === 0 || !gammes.filter(g => selectedGammes.includes(g._id!)).some(g => !g.json_data.raw_html) ? 'bg-slate-200/60 text-slate-400 cursor-not-allowed shadow-inner border border-slate-300' : 'btn-primary cursor-pointer'}`}
                      >
                        <Download className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">CSV</span><span className="hidden md:inline whitespace-nowrap">&nbsp;EXPORT</span>
                      </button>
                      {false && <button
                        onClick={exportHTML}
                        disabled={selectedGammes.length === 0 || !gammes.filter(g => selectedGammes.includes(g._id!)).some(g => g.json_data.raw_html)}
                        className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-3 md:px-6 h-12 rounded-[18px] font-black uppercase tracking-widest text-[10px] transition-all ${selectedGammes.length === 0 || !gammes.filter(g => selectedGammes.includes(g._id!)).some(g => g.json_data.raw_html) ? 'bg-slate-200/60 text-slate-400 cursor-not-allowed shadow-inner border border-slate-300' : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 cursor-pointer'}`}
                      >
                        <Download className="w-4 h-4 shrink-0" /> <span className="whitespace-nowrap">HTML</span><span className="hidden md:inline whitespace-nowrap">&nbsp;EXPORT</span>
                      </button>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {filteredGammes.length === 0 && (
                    <div className="glass-card p-12 text-center rounded-[28px] border-2 border-dashed border-white/40">
                      <Wrench className="w-12 h-12 text-slate-400 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-bold text-slate-700">Aucune gamme trouvée</h3>
                      <p className="text-xs text-slate-500 mt-1">Aucune gamme ne correspond à votre recherche "{gammeSearch}".</p>
                    </div>
                  )}
                  {filteredGammes.map(g => {
                    const isSelected = selectedGammes.includes(g._id!);
                    const isExpanded = expandedGammes.includes(g._id!);
                    const isNewlyGenerated = g.json_data.generated_at === newlyGeneratedTime;
                    const sourceFiche = fiches.find(f => f._id === g.json_data.fiche_id);
                    let ficheName = sourceFiche ? getFicheTitle(sourceFiche) : 'INCONNU';
                    const authorName = getGammeAuthor(g);
                    if (ficheName.length > 25) ficheName = ficheName.substring(0, 25) + '...';

                    const sourcePrompt = prompts.find(p => p._id === g.json_data.prompt_id);
                    const promptName = sourcePrompt ? (sourcePrompt.json_data.name || sourcePrompt.description) : 'CONFIG INCONNUE';
                    const isHtmlGamme = !!g.json_data.raw_html;

                    return (
                      <div key={g._id} id={`gamme-${g._id}`}
                        className={`glass-card p-6 border-2 transition-all hover:shadow-xl rounded-[28px] ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/10 bg-white/60' :
                          isNewlyGenerated ? 'border-purple-400 ring-2 ring-purple-400/50 shadow-[0_0_30px_rgba(147,51,234,0.4),0_0_30px_rgba(59,130,246,0.4)] bg-gradient-to-r from-blue-50/50 to-purple-50/50' :
                            'border-white/80'
                          }`}
                      >
                        <div className="flex items-center gap-3 md:gap-8 cursor-pointer group" onClick={() => setSelectedGammes(p => p.includes(g._id!) ? p.filter(x => x !== g._id) : [...p, g._id!])}>
                          <div className="w-12 h-12 bg-slate-900 rounded-[18px] flex items-center justify-center text-white shadow-lg shadow-slate-900/10 shrink-0">
                            <Wrench className="w-6 h-6" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-black tracking-tight uppercase leading-none truncate">{g.json_data.machine_number}</h3>
                              <Badge variant="indigo"><span className="flex items-center gap-1"><FileText className="w-3 h-3 opacity-80" /> {ficheName}</span></Badge>
                              <Badge variant="purple"><span className="flex items-center gap-1"><SettingsIcon className="w-3 h-3 opacity-80" /> {promptName}</span></Badge>
                              {authorName && <Badge variant="slate"><span className="flex items-center gap-1"><User className="w-3 h-3 opacity-80" /> {authorName}</span></Badge>}
                            </div>
                            {g._id && <span className="text-[10px] font-mono text-slate-400 mt-1 block truncate">ID: {g._id}</span>}
                          </div>

                          <div className="flex items-center gap-8 px-8 border-x border-slate-100/50 hidden md:flex">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{new Date(g.json_data.generated_at).toLocaleDateString('fr-CA')}</span>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">GÉNÉRÉE LE</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedGammes(prev => prev.includes(g._id!) ? prev.filter(x => x !== g._id!) : [...prev, g._id!]); }}
                            className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all shrink-0 ${isExpanded ? 'bg-blue-50 text-blue-600 rotate-90' : ''}`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 shadow-inner'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                                {isHtmlGamme ? (
                                  <div className="w-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner relative group/iframe">
                                    <iframe
                                      srcDoc={g.json_data.raw_html}
                                      title="HTML Preview"
                                      className="w-full h-[600px] border-none"
                                      sandbox="allow-scripts"
                                    />
                                    <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase opacity-0 group-hover/iframe:opacity-100 transition-opacity pointer-events-none">
                                      Prévisualisation HTML
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {g.json_data.metadata && g.json_data.metadata.length > 0 && (
                                      <div className="flex flex-wrap gap-4 p-4 bg-slate-50/50 rounded-2xl mb-4 border border-slate-100">
                                        {Array.isArray(g.json_data.metadata) && g.json_data.metadata.map((meta, mIdx) => (
                                          <div key={mIdx} className="flex flex-col gap-1 min-w-[150px]">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{meta.key}</span>
                                            <input
                                              type="text"
                                              value={meta.value}
                                              onChange={(e) => handleUpdateMetadata(g._id!, mIdx, e.target.value)}
                                              onBlur={async () => { try { await api.updateGamme(g._id!, g); } catch (err) { console.error("Failed", err); } }}
                                              className="bg-transparent text-xs font-bold text-slate-700 outline-none focus:text-blue-600 border-b border-transparent focus:border-blue-200"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="space-y-2">
                                      {Array.isArray(g.json_data.steps) && g.json_data.steps.map((s, i) => (
                                        <div key={i} className="flex gap-3 p-3 bg-white/40 rounded-[16px] border border-white/60 group focus-within:bg-white/80 transition-all flex-col">
                                          <div className="flex gap-3 items-start w-full">
                                            <span className="font-black text-blue-600 text-[9px] mt-0.5 shrink-0 w-6">{s.op}</span>

                                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                              <textarea
                                                rows={1}
                                                ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                                                value={s?.description || ''}
                                                onChange={(e) => {
                                                  e.target.style.height = 'auto';
                                                  e.target.style.height = e.target.scrollHeight + 'px';
                                                  handleUpdateStep(g._id!, i, 'description', e.target.value);
                                                }}
                                                onBlur={async () => { try { await api.updateGamme(g._id!, g); } catch (err) { console.error("Failed", err); } }}
                                                onKeyDown={async (e) => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    try { await api.updateGamme(g._id!, g); } catch (err) { console.error("Failed", err); }
                                                  }
                                                }}
                                                title="Appuyez sur Entrée pour sauvegarder"
                                                className="w-full bg-transparent text-[10px] font-black uppercase tracking-tight outline-none focus:text-blue-700 transition-colors resize-none leading-tight overflow-hidden"
                                              />

                                              {s.custom_fields && Array.isArray(s.custom_fields) && s.custom_fields.length > 0 && (
                                                <div className="flex flex-col gap-1.5 mt-1">
                                                  {s.custom_fields.map((field, fIdx) => (
                                                    <div key={fIdx} className="flex items-center gap-2">
                                                      <span className="text-[8px] font-bold text-blue-400/80 uppercase tracking-wider shrink-0 min-w-[60px]">
                                                        {field.key}:
                                                      </span>
                                                      <input
                                                        type="text"
                                                        value={field.value}
                                                        onChange={(e) => handleUpdateCustomField(g._id!, i, fIdx, e.target.value)}
                                                        onBlur={async () => { try { await api.updateGamme(g._id!, g); } catch (err) { console.error("Failed", err); } }}
                                                        onKeyDown={async (e) => {
                                                          if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            try { await api.updateGamme(g._id!, g); } catch (err) { console.error("Failed", err); }
                                                          }
                                                        }}
                                                        className="w-full bg-transparent text-[10px] text-slate-600 font-medium outline-none focus:text-blue-800 transition-colors"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'settings' && isAdmin && (
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
                        value={currentPrompt?._id || currentPrompt?.json_data.name || currentPrompt?.description || ''}
                        onChange={(e) => {
                          const selected = prompts.find(p => (p._id || p.json_data.name || p.description) === e.target.value);
                          if (selected) setCurrentPrompt(selected);
                        }}
                      >
                        {prompts.map(p => (
                          <option key={p._id || p.json_data.name || p.description} value={p._id || p.json_data.name || p.description}>
                            {p.json_data.name || p.description} {p.json_data.is_active ? '(Actif)' : ''}
                          </option>
                        ))}
                      </select>
                      <button onClick={handleCreatePrompt} className="w-8 h-8 bg-blue-600 text-white rounded-[12px] flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md" title="Créer une nouvelle version">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => {
                        if (currentPrompt?._id) {
                          handleDeletePrompt(currentPrompt._id);
                        } else {
                          const active = prompts.find(p => p.json_data.is_active) || prompts[0];
                          if (active) setCurrentPrompt(active);
                        }
                      }} className="w-8 h-8 bg-red-50 text-red-600 rounded-[12px] flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm ml-1" title={currentPrompt?._id ? "Supprimer la version" : "Annuler la création"}>
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-200 focus-within:border-blue-500 transition-colors pb-2">
                    <input
                      type="text"
                      value={currentPrompt?.json_data.name || currentPrompt?.description || ''}
                      onChange={(e) => setCurrentPrompt(p => p ? { ...p, json_data: { ...p.json_data, name: e.target.value } } : null)}
                      className="bg-transparent text-xl font-black uppercase tracking-tighter w-full outline-none text-slate-800 placeholder-slate-300 flex-1"
                      placeholder="Nom de la version..."
                    />

                    <select
                      value={currentPrompt?.json_data.export_format || 'csv'}
                      onChange={(e) => setCurrentPrompt(p => p ? { ...p, json_data: { ...p.json_data, export_format: e.target.value as 'csv' | 'html' } } : null)}
                      className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600 px-4 py-2 rounded-xl outline-none shrink-0 cursor-pointer border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <option value="csv">FORMAT: CSV (STRUCTURED)</option>
                      {false && <option value="html">FORMAT: HTML (RAW)</option>}
                    </select>

                    {currentPrompt?.json_data.is_active ? (
                      <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-200 shadow-sm shrink-0">
                        <div className="relative">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-30" />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest">Version Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-4 py-2 rounded-full border border-slate-200 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Inactive</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <textarea value={currentPrompt?.json_data.content || ''} onChange={(e) => setCurrentPrompt(p => p ? { ...p, json_data: { ...p.json_data, content: e.target.value } } : null)}
                      className="w-full h-[300px] md:h-[400px] bg-white/40 border-2 border-white/60 rounded-[32px] p-8 font-mono text-[11px] leading-relaxed focus:bg-white/60 outline-none transition-all shadow-inner custom-scrollbar"
                    />
                    <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-400 pointer-events-none">Expert Markdown Engine</div>
                  </div>

                  <button onClick={async () => handleSavePrompt(true)} className={`btn-primary w-full mt-8 h-16 rounded-[24px] flex items-center justify-center gap-4 text-sm ${currentPrompt?.json_data.is_active ? 'bg-emerald-600 shadow-emerald-500/10' : ''}`}>
                    <Save className="w-7 h-7" />
                    {currentPrompt?.json_data.is_active ? 'METTRE À JOUR LA VERSION ACTIVE' : 'SAUVEGARDER ET ACTIVER'}
                  </button>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>



      {/* Fullscreen Image Modal */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-8 cursor-zoom-out"
          >
            <motion.img
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={fullscreenImage}
              alt="Plein écran"
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

