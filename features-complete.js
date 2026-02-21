// ============================================================
// FITPULSE PRO — COMPLETE FEATURES WITH AI COACH (GROQ)
// Multilingual (AR/FR/EN) + Flexible Duration + Schedule Editor
// + Exercise Library + AI Chat using Groq OpenAI-compatible API
// ============================================================

// NOTE:
// - This file is designed to be loaded AFTER index_final.html main script.
// - It expects global objects/functions: S, SCH, SCH_S, PLANS, EX, save(), buildDaySel(), renderWorkout(), updateStats().
// - It is defensive: if something is missing, it logs and skips gracefully.

// ============================================================
// INIT / STATE EXTENSION
// ============================================================
(function initExtendedState () {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (typeof S === 'undefined') {
      console.warn('[FITPULSE EXT] Global S not found yet. Delaying init.');
      document.addEventListener('DOMContentLoaded', () => {
        if (typeof S === 'undefined') {
          console.error('[FITPULSE EXT] S still not defined after DOMContentLoaded.');
          return;
        }
        extendState();
      });
    } else {
      extendState();
    }
  } catch (e) {
    console.error('[FITPULSE EXT] initExtendedState error', e);
  }

  function extendState () {
    // Ensure base save function exists
    if (typeof save !== 'function') {
      window.save = function () {
        try {
          localStorage.setItem('rfit4', JSON.stringify(S));
        } catch (e) {
          console.warn('[FITPULSE EXT] save() failed', e);
        }
      };
    }

    // Extend S with new properties (without breaking existing data)
    S.language = S.language || 'ar';              // 'ar' | 'fr' | 'en'
    S.programDuration = S.programDuration || 30;  // total days
    S.customSchedule = S.customSchedule || null;  // array of day types (0..6)
    S.firstLaunchComplete = S.firstLaunchComplete || false;
    S.chatHistory = S.chatHistory || [];          // [{role, content}]
    S.customExercises = S.customExercises || {};  // id -> exercise object
    S.customDayExercises = S.customDayExercises || {}; // 'd1' -> [exIds]
    S.aiCoachEnabled = S.aiCoachEnabled !== false;     // default true
    save();
  }
})();

// ============================================================
// GROQ API CONFIGURATION
// ============================================================
const GROQ_API_KEY = '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';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// OpenAI-compatible call helper
async function callAI (messages) {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('[FITPULSE EXT] Groq API Error', response.status, errorText);
    throw new Error('Groq API Error: ' + response.status);
  }

  const data = await response.json();
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

// Expose minimal surface if needed
window.FitpulseAI = { callAI };

// ============================================================
// TRANSLATION (AR / FR / EN)
// ============================================================
const FP_TRANSLATIONS = {
  ar: {
    welcome: {
      title: 'مرحباً بك في FITPULSE PRO',
      subtitle: 'اختر لغتك',
      chooseDuration: 'اختر مدة برنامجك',
      days: 'يوم',
      custom: 'مخصص',
      start: 'ابدأ',
      or: 'أو',
      enterDays: 'أدخل عدد الأيام (7-90)'
    },
    nav: {
      workout: 'تمارين',
      timer: 'مؤقت',
      progress: 'تقدم',
      tips: 'نصائح'
    },
    stats: {
      day: 'يوم رمضان',
      sessions: 'جلسة',
      streak: '🔥 تتالي',
      calories: 'كالوري'
    },
    schedule: {
      edit: '✏️ تعديل الجدول',
      reset: '🔄 إعادة تعيين',
      resetConfirm: 'هل أنت متأكد من إعادة تعيين الجدول إلى الافتراضي؟',
      modified: '✦',
      rest: 'راحة',
      rope: 'حبل',
      circuit: 'سيرك',
      walk: 'مشي',
      hiit: 'HIIT',
      strength: 'قوة',
      save: 'حفظ',
      cancel: 'إلغاء',
      copyDay: 'نسخ اليوم',
      deleteDay: 'حذف اليوم',
      addExercise: 'إضافة تمرين',
      week: 'أسبوع',
      day: 'يوم',
      type: 'النوع',
      required: 'مطلوب'
    },
    exercise: {
      library: 'مكتبة التمارين',
      search: 'بحث...',
      category: 'الفئة',
      all: 'الكل',
      cardio: 'كارديو',
      strength: 'قوة',
      core: 'كور',
      custom: 'مخصص',
      preview: 'معاينة',
      add: 'إضافة',
      create: 'إنشاء تمرين جديد',
      name: 'الاسم',
      nameEn: 'الاسم بالإنجليزية',
      description: 'الوصف',
      sets: 'المجموعات',
      duration: 'المدة (ثانية)',
      image: 'الصورة',
      delete: 'حذف',
      copy: 'نسخ',
      deleteConfirm: 'هل أنت متأكد من حذف هذا التمرين؟',
      uploadImage: 'رفع صورة',
      selectCategory: 'اختر الفئة',
      noExercises: 'لا توجد تمارين'
    },
    settings: {
      title: 'إعدادات',
      language: 'اللغة',
      duration: 'مدة البرنامج',
      resetSchedule: 'إعادة تعيين الجدول',
      editSchedule: 'تعديل الجدول'
    },
    ai: {
      coach: '🤖 مدرب اللياقة الذكي',
      chat: 'محادثة',
      startChat: 'ابدأ المحادثة',
      newChat: 'محادثة جديدة',
      typing: 'يكتب...',
      send: 'إرسال',
      placeholder: 'اكتب رسالتك...',
      welcome: 'مرحباً! أنا مدربك الذكي. كيف يمكنني مساعدتك اليوم؟',
      buildingSchedule: 'أقوم ببناء جدولك المخصص...',
      error: 'حدث خطأ. حاول مرة أخرى.',
      thinking: 'يفكر...'
    }
  },
  fr: {
    welcome: {
      title: 'Bienvenue dans FITPULSE PRO',
      subtitle: 'Choisissez votre langue',
      chooseDuration: 'Choisissez la durée de votre programme',
      days: 'jours',
      custom: 'Personnalisé',
      start: 'Commencer',
      or: 'ou',
      enterDays: 'Entrez le nombre de jours (7-90)'
    },
    nav: {
      workout: 'Entraînement',
      timer: 'Minuteur',
      progress: 'Progrès',
      tips: 'Conseils'
    },
    stats: {
      day: 'Jour Ramadan',
      sessions: 'Séance',
      streak: '🔥 Série',
      calories: 'Calories'
    },
    schedule: {
      edit: '✏️ Modifier le programme',
      reset: '🔄 Réinitialiser',
      resetConfirm: 'Êtes-vous sûr de réinitialiser le programme par défaut ?',
      modified: '✦',
      rest: 'Repos',
      rope: 'Corde',
      circuit: 'Circuit',
      walk: 'Marche',
      hiit: 'HIIT',
      strength: 'Force',
      save: 'Enregistrer',
      cancel: 'Annuler',
      copyDay: 'Copier le jour',
      deleteDay: 'Supprimer le jour',
      addExercise: 'Ajouter exercice',
      week: 'Semaine',
      day: 'Jour',
      type: 'Type',
      required: 'requis'
    },
    exercise: {
      library: 'Bibliothèque d\'exercices',
      search: 'Rechercher...',
      category: 'Catégorie',
      all: 'Tout',
      cardio: 'Cardio',
      strength: 'Force',
      core: 'Abdos',
      custom: 'Personnalisé',
      preview: 'Aperçu',
      add: 'Ajouter',
      create: 'Créer un exercice',
      name: 'Nom',
      nameEn: 'Nom en anglais',
      description: 'Description',
      sets: 'Séries',
      duration: 'Durée (sec)',
      image: 'Image',
      delete: 'Supprimer',
      copy: 'Copier',
      deleteConfirm: 'Êtes-vous sûr de supprimer cet exercice ?',
      uploadImage: 'Télécharger image',
      selectCategory: 'Sélectionner catégorie',
      noExercises: 'Aucun exercice'
    },
    settings: {
      title: 'Paramètres',
      language: 'Langue',
      duration: 'Durée du programme',
      resetSchedule: 'Réinitialiser le programme',
      editSchedule: 'Modifier le programme'
    },
    ai: {
      coach: '🤖 Coach Fitness IA',
      chat: 'Chat',
      startChat: 'Démarrer le chat',
      newChat: 'Nouveau chat',
      typing: 'tape...',
      send: 'Envoyer',
      placeholder: 'Tapez votre message...',
      welcome: 'Bonjour! Je suis votre coach IA. Comment puis-je vous aider aujourd\'hui ?',
      buildingSchedule: 'Je construis votre programme personnalisé...',
      error: 'Une erreur s\'est produite. Réessayez.',
      thinking: 'Réfléchit...'
    }
  },
  en: {
    welcome: {
      title: 'Welcome to FITPULSE PRO',
      subtitle: 'Choose your language',
      chooseDuration: 'Choose your program duration',
      days: 'days',
      custom: 'Custom',
      start: 'Start',
      or: 'or',
      enterDays: 'Enter number of days (7-90)'
    },
    nav: {
      workout: 'Workout',
      timer: 'Timer',
      progress: 'Progress',
      tips: 'Tips'
    },
    stats: {
      day: 'Ramadan Day',
      sessions: 'Session',
      streak: '🔥 Streak',
      calories: 'Calories'
    },
    schedule: {
      edit: '✏️ Edit Schedule',
      reset: '🔄 Reset',
      resetConfirm: 'Are you sure you want to reset the schedule to default?',
      modified: '✦',
      rest: 'Rest',
      rope: 'Rope',
      circuit: 'Circuit',
      walk: 'Walk',
      hiit: 'HIIT',
      strength: 'Strength',
      save: 'Save',
      cancel: 'Cancel',
      copyDay: 'Copy Day',
      deleteDay: 'Delete Day',
      addExercise: 'Add Exercise',
      week: 'Week',
      day: 'Day',
      type: 'Type',
      required: 'required'
    },
    exercise: {
      library: 'Exercise Library',
      search: 'Search...',
      category: 'Category',
      all: 'All',
      cardio: 'Cardio',
      strength: 'Strength',
      core: 'Core',
      custom: 'Custom',
      preview: 'Preview',
      add: 'Add',
      create: 'Create New Exercise',
      name: 'Name',
      nameEn: 'Name (English)',
      description: 'Description',
      sets: 'Sets',
      duration: 'Duration (sec)',
      image: 'Image',
      delete: 'Delete',
      copy: 'Copy',
      deleteConfirm: 'Are you sure you want to delete this exercise?',
      uploadImage: 'Upload Image',
      selectCategory: 'Select Category',
      noExercises: 'No exercises'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      duration: 'Program Duration',
      resetSchedule: 'Reset Schedule',
      editSchedule: 'Edit Schedule'
    },
    ai: {
      coach: '🤖 AI Fitness Coach',
      chat: 'Chat',
      startChat: 'Start Chat',
      newChat: 'New Chat',
      typing: 'typing...',
      send: 'Send',
      placeholder: 'Type your message...',
      welcome: 'Hello! I\'m your AI coach. How can I help you today?',
      buildingSchedule: 'Building your personalized schedule...',
      error: 'An error occurred. Please try again.',
      thinking: 'Thinking...'
    }
  }
};

function fpLang () {
  try { return (typeof S !== 'undefined' && S.language) || 'ar'; }
  catch { return 'ar'; }
}

function fpT (key, ...args) {
  const lang = fpLang();
  const parts = key.split('.');
  let val = FP_TRANSLATIONS[lang] || FP_TRANSLATIONS.ar;
  for (const p of parts) {
    if (!val || typeof val !== 'object') return key;
    val = val[p];
  }
  if (typeof val === 'string' && args.length) {
    return val.replace(/\{(\d+)\}/g, (m, i) => args[+i] ?? m);
  }
  return val ?? key;
}

function fpSetLanguage (lang) {
  if (typeof S === 'undefined') return;
  S.language = lang;
  try {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch {}
  if (typeof save === 'function') save();
}

// ============================================================
// SMART SCHEDULE GENERATION + CURRENT SCHEDULE
// ============================================================
function fpGenerateSmartSchedule (totalDays) {
  if (!totalDays || totalDays < 7) totalDays = 7;
  if (totalDays > 120) totalDays = 120;

  const baseSCH = (typeof SCH !== 'undefined' && Array.isArray(SCH) && SCH.length)
    ? SCH
    : [1, 2, 3, 4, 5, 6, 0]; // rope, circuit, rope, walk, hiit, strength, rest

  const schedule = [];
  let idx = 0;
  const weeks = Math.ceil(totalDays / 7);
  const restEvery = Math.max(1, Math.floor(7 / 1)); // at least 1 rest/week baseline

  for (let day = 1; day <= totalDays; day++) {
    const dow = (day - 1) % 7;
    if (dow === 6 || (restEvery > 0 && day % (7 * restEvery) === 0)) {
      schedule.push(0); // rest
      continue;
    }
    const baseType = baseSCH[idx % baseSCH.length];
    if (baseType === 0 && dow !== 6) {
      idx++;
    }
    schedule.push(baseSCH[idx % baseSCH.length]);
    idx++;
  }

  if (typeof S !== 'undefined') {
    S.customSchedule = schedule;
    S.programDuration = totalDays;
    if (typeof save === 'function') save();
  }
  return schedule;
}

function fpGetCurrentSchedule () {
  if (typeof S === 'undefined') return [];
  if (S.customSchedule && Array.isArray(S.customSchedule) && S.customSchedule.length === S.programDuration) {
    return S.customSchedule;
  }
  if (S.programDuration && S.programDuration !== 30) {
    return fpGenerateSmartSchedule(S.programDuration);
  }
  // Fallback: repeat SCH for 30 days
  if (typeof SCH !== 'undefined' && Array.isArray(SCH)) {
    const arr = [];
    for (let i = 0; i < S.programDuration; i++) {
      arr.push(SCH[i % SCH.length]);
    }
    return arr;
  }
  return [];
}

// Override buildDaySel to respect programDuration & customSchedule
(function overrideBuildDaySel () {
  if (typeof window === 'undefined') return;
  const original = window.buildDaySel;
  if (typeof original !== 'function') return;

  window.buildDaySel = function () {
    try {
      if (typeof S === 'undefined') return original();
      const schedule = fpGetCurrentSchedule();
      const container = document.getElementById('daySel');
      if (!container) return original();

      container.innerHTML = '';
      const total = S.programDuration || 30;
      const labelMap = (typeof SCH_S !== 'undefined' && SCH_S) || {
        0: fpT('schedule.rest'),
        1: fpT('schedule.rope'),
        2: fpT('schedule.circuit'),
        3: fpT('schedule.rope'),
        4: fpT('schedule.walk'),
        5: fpT('schedule.hiit'),
        6: fpT('schedule.strength')
      };

      for (let d = 1; d <= total; d++) {
        const schType = schedule[d - 1] ?? 0;
        const done = S.completedDays && S.completedDays.includes(d);
        const isToday = d === S.currentDay;
        const btn = document.createElement('button');
        btn.className = 'dbtn';
        if (isToday) btn.classList.add('active');
        if (done) btn.classList.add('done');
        if (schType === 0) btn.classList.add('rest');
        btn.onclick = () => {
          if (typeof selDay === 'function') selDay(d);
        };
        btn.innerHTML = `
          <span class="dn">${done ? '✓' : d}</span>
          <span>${labelMap[schType] || ''}</span>
        `;
        container.appendChild(btn);
      }
    } catch (e) {
      console.error('[FITPULSE EXT] buildDaySel override error', e);
      original();
    }
  };
})();

// ============================================================
// WELCOME SCREEN (LANG + DURATION + AI OPTION)
// ============================================================
function fpShowWelcomeScreen () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fpWelcomeScreen')) return;
  if (typeof S === 'undefined') return;

  const lang = fpLang();
  const w = FP_TRANSLATIONS[lang].welcome;
  const ai = FP_TRANSLATIONS[lang].ai;

  const div = document.createElement('div');
  div.id = 'fpWelcomeScreen';
  div.style.position = 'fixed';
  div.style.inset = '0';
  div.style.background = 'var(--night)';
  div.style.zIndex = '9999';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.padding = '20px';

  div.innerHTML = `
    <div style="max-width:420px;width:100%;text-align:center">
      <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,var(--gl),var(--gold),var(--gd));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px">
        FITPULSE PRO
      </div>
      <div id="fpWelcomeSubtitle" style="font-size:14px;color:var(--dim);margin-bottom:24px">
        ${w.subtitle}
      </div>

      <div id="fpLangSel" style="margin-bottom:24px">
        <div style="font-size:12px;color:var(--dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">
          ${w.subtitle}
        </div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <button data-lang="ar" class="fp-w-btn">العربية</button>
          <button data-lang="fr" class="fp-w-btn">Français</button>
          <button data-lang="en" class="fp-w-btn">English</button>
        </div>
      </div>

      <div id="fpDurSel" style="display:none;margin-bottom:20px">
        <div style="font-size:12px;color:var(--dim);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">
          ${w.chooseDuration}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <button data-days="15" class="fp-d-btn">15 ${w.days}</button>
          <button data-days="21" class="fp-d-btn">21 ${w.days}</button>
          <button data-days="30" class="fp-d-btn">30 ${w.days}</button>
          <button data-days="custom" class="fp-d-btn">${w.custom}</button>
        </div>
        <div id="fpDurCustomWrap" style="display:none;margin-top:8px">
          <input id="fpDurInput" type="number" min="7" max="90"
            placeholder="${w.enterDays}"
            style="width:100%;padding:10px;background:var(--card);border-radius:8px;border:1px solid rgba(212,168,67,.3);color:var(--text);text-align:center;direction:ltr">
          <button id="fpDurApply" class="fp-main-btn" style="margin-top:8px">${w.start}</button>
        </div>
        <div style="margin-top:14px;padding:10px;border-radius:10px;background:linear-gradient(135deg,rgba(212,168,67,.1),rgba(212,168,67,.03));border:1px solid rgba(212,168,67,.25)">
          <div style="font-size:12px;color:var(--gold);margin-bottom:6px;font-weight:700">${ai.coach}</div>
          <button id="fpAIScheduleBtn" class="fp-main-btn">${ai.buildingSchedule}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  // Style helper
  Array.from(div.querySelectorAll('.fp-w-btn')).forEach(btn => {
    btn.style.width = '100%';
    btn.style.padding = '14px';
    btn.style.borderRadius = '12px';
    btn.style.border = '2px solid var(--gold)';
    btn.style.background = 'var(--card)';
    btn.style.color = 'var(--text)';
    btn.style.fontFamily = 'Cairo, sans-serif';
    btn.style.fontSize = '15px';
    btn.style.fontWeight = '700';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
      const l = btn.getAttribute('data-lang');
      fpSetLanguage(l);
      const ls = document.getElementById('fpLangSel');
      const ds = document.getElementById('fpDurSel');
      const sub = document.getElementById('fpWelcomeSubtitle');
      if (ls) ls.style.display = 'none';
      if (ds) ds.style.display = 'block';
      if (sub) sub.textContent = FP_TRANSLATIONS[fpLang()].welcome.chooseDuration;
    };
  });

  Array.from(div.querySelectorAll('.fp-d-btn')).forEach(btn => {
    btn.style.width = '100%';
    btn.style.padding = '12px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(212,168,67,.3)';
    btn.style.background = 'var(--card)';
    btn.style.color = 'var(--text)';
    btn.style.fontFamily = 'Cairo, sans-serif';
    btn.style.fontSize = '14px';
    btn.style.fontWeight = '700';
    btn.style.cursor = 'pointer';
    btn.onclick = () => {
      const val = btn.getAttribute('data-days');
      if (val === 'custom') {
        const cw = document.getElementById('fpDurCustomWrap');
        if (cw) cw.style.display = 'block';
        return;
      }
      const d = parseInt(val || '30', 10);
      if (typeof S !== 'undefined') {
        S.programDuration = d;
        S.firstLaunchComplete = true;
        fpGenerateSmartSchedule(d);
        if (typeof save === 'function') save();
      }
      div.remove();
      if (typeof init === 'function') {
        setTimeout(init, 50);
      } else {
        location.reload();
      }
    };
  });

  const durApply = div.querySelector('#fpDurApply');
  if (durApply) {
    durApply.onclick = () => {
      const input = div.querySelector('#fpDurInput');
      const num = input ? parseInt(input.value, 10) : NaN;
      if (!num || num < 7 || num > 90) {
        alert(w.enterDays);
        return;
      }
      if (typeof S !== 'undefined') {
        S.programDuration = num;
        S.firstLaunchComplete = true;
        fpGenerateSmartSchedule(num);
        if (typeof save === 'function') save();
      }
      div.remove();
      if (typeof init === 'function') setTimeout(init, 50);
      else location.reload();
    };
  }

  const aiBtn = div.querySelector('#fpAIScheduleBtn');
  if (aiBtn) {
    aiBtn.onclick = () => {
      div.remove();
      fpOpenAIChat('schedule_building');
    };
  }
}

// Hook into app init: show welcome only once
(function hookFirstLaunch () {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    try {
      if (typeof S === 'undefined') return;
      if (!S.firstLaunchComplete) {
        setTimeout(fpShowWelcomeScreen, 600);
      } else {
        // Set HTML lang/dir according to stored language
        try {
          document.documentElement.lang = fpLang();
          document.documentElement.dir = fpLang() === 'ar' ? 'rtl' : 'ltr';
        } catch {}
        // Add AI chat FAB
        setTimeout(fpAddAIChatFAB, 1200);
      }
    } catch (e) {
      console.error('[FITPULSE EXT] hookFirstLaunch error', e);
    }
  });
})();

// ============================================================
// AI CHAT (GROQ) - GENERAL + SCHEDULE BUILDING
// ============================================================
let fpAIChatOpen = false;
let fpAIChatMode = 'general'; // 'general' | 'schedule_building'

function fpSystemPrompt () {
  const lang = fpLang();
  const langName = lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English';

  const EX_LOCAL = (typeof EX !== 'undefined' && EX) || {};
  const PLANS_LOCAL = (typeof PLANS !== 'undefined' && PLANS) || {};

  const exList = Object.keys(EX_LOCAL).map(id => {
    const ex = EX_LOCAL[id];
    return `${ex.name || id} (${ex.nameEn || id})`;
  }).join('\n');

  const planList = Object.keys(PLANS_LOCAL).map(k => {
    const p = PLANS_LOCAL[k];
    return `Type ${k}: ${p.label} => [${p.exercises.join(', ')}]`;
  }).join('\n');

  if (fpAIChatMode === 'schedule_building') {
    return `You are an AI fitness coach helping the user create a personalized training schedule.
Respond ONLY in ${langName}. Be friendly, concise, and professional.

You have this exercise library:
${exList}

And these plan types:
${planList}

Ask the user (one question at a time) about:
1) Goal (weight loss / muscle gain / general fitness)
2) Fitness level (beginner / intermediate / advanced)
3) Days per week available
4) Session length in minutes
5) Injuries / limitations
6) Available equipment (none / jump rope / gym)

After collecting enough information, generate ONLY a JSON object with:
{
  "duration": <number_of_days>,
  "schedule": [array of numbers 0..6 for each day],
  "customDays": {
    "d1": ["rope","burpees"],
    "d2": ["pushup","squat"]
  }
}

Do NOT wrap the JSON in backticks. The app will parse that JSON.`;
  }

  return `You are an AI fitness coach assistant for FITPULSE PRO.
Respond ONLY in ${langName}. You can:
- Answer fitness questions
- Suggest schedule adjustments
- Recommend exercises from the library

Exercise library:
${exList}

Plan types:
${planList}

User context:
- Program duration: ${(typeof S !== 'undefined' && S.programDuration) || 30} days
- Completed days: ${(typeof S !== 'undefined' && S.completedDays && S.completedDays.length) || 0}`;
}

function fpOpenAIChat (mode = 'general') {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fpAIChat')) return;

  fpAIChatMode = mode;
  fpAIChatOpen = true;

  const t = FP_TRANSLATIONS[fpLang()].ai;
  const wrap = document.createElement('div');
  wrap.id = 'fpAIChat';
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.background = 'var(--night)';
  wrap.style.zIndex = '9998';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';

  wrap.innerHTML = `
    <div style="background:var(--dark);border-bottom:1px solid rgba(212,168,67,.2);padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">🤖</div>
        <div>
          <div style="font-size:14px;font-weight:900;color:var(--gold)">${t.coach}</div>
          <div style="font-size:11px;color:var(--dim)">${mode === 'schedule_building' ? t.buildingSchedule : t.chat}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        ${mode === 'general'
          ? `<button id="fpAINewChat" class="fp-chip-btn">${t.newChat}</button>`
          : ''}
        <button id="fpAIClose" class="fp-chip-btn">✕</button>
      </div>
    </div>
    <div id="fpAIMsgs" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"></div>
    <div style="padding:10px 16px;border-top:1px solid rgba(212,168,67,.2);background:var(--dark)">
      <div style="display:flex;gap:10px;align-items:flex-end">
        <textarea id="fpAIInput" rows="2"
          placeholder="${t.placeholder}"
          style="flex:1;resize:none;padding:10px 12px;border-radius:10px;border:1px solid rgba(212,168,67,.25);background:var(--card);color:var(--text);font-family:Cairo,sans-serif;font-size:13px"></textarea>
        <button id="fpAISend" class="fp-main-btn" style="white-space:nowrap">${t.send}</button>
      </div>
    </div>
  `;

  document.body.appendChild(wrap);

  // Style helper
  Array.from(wrap.querySelectorAll('.fp-chip-btn')).forEach(b => {
    b.style.padding = '6px 12px';
    b.style.borderRadius = '999px';
    b.style.border = '1px solid rgba(212,168,67,.3)';
    b.style.background = 'var(--card)';
    b.style.color = 'var(--text)';
    b.style.fontSize = '11px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.cursor = 'pointer';
  });
  Array.from(wrap.querySelectorAll('.fp-main-btn')).forEach(b => {
    b.style.padding = '10px 16px';
    b.style.borderRadius = '999px';
    b.style.border = 'none';
    b.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
    b.style.color = 'var(--night)';
    b.style.fontSize = '13px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.fontWeight = '700';
    b.style.cursor = 'pointer';
  });

  const msgs = wrap.querySelector('#fpAIMsgs');
  const input = wrap.querySelector('#fpAIInput');
  const sendBtn = wrap.querySelector('#fpAISend');

  const tAI = FP_TRANSLATIONS[fpLang()].ai;

  function addMsg (role, content) {
    if (!msgs) return;
    const div = document.createElement('div');
    div.style.display = 'flex';
    const alignRight = (fpLang() === 'ar' ? role === 'user' : role !== 'user');
    div.style.justifyContent = alignRight ? 'flex-end' : 'flex-start';
    const bubble = document.createElement('div');
    bubble.style.maxWidth = '75%';
    bubble.style.padding = '9px 12px';
    bubble.style.borderRadius = '10px';
    bubble.style.fontSize = '13px';
    bubble.style.lineHeight = '1.6';
    bubble.style.wordBreak = 'break-word';
    if (role === 'user') {
      bubble.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
      bubble.style.color = 'var(--night)';
    } else {
      bubble.style.background = 'var(--card)';
      bubble.style.color = 'var(--text)';
    }
    bubble.textContent = content;
    div.appendChild(bubble);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // Welcome / history
  if (mode === 'general') {
    addMsg('assistant', tAI.welcome);
    if (typeof S !== 'undefined' && Array.isArray(S.chatHistory)) {
      S.chatHistory.forEach(m => addMsg(m.role, m.content));
    }
  } else {
    addMsg('assistant', tAI.buildingSchedule);
  }

  async function send () {
    if (!input || !sendBtn) return;
    const text = input.value.trim();
    if (!text && mode !== 'schedule_building') return;

    input.value = '';
    if (text) addMsg('user', text);

    // Build messages history
    const history = (typeof S !== 'undefined' && Array.isArray(S.chatHistory)) ? S.chatHistory.slice() : [];
    if (text) history.push({ role: 'user', content: text });

    // Save history for general chat
    if (mode === 'general' && typeof S !== 'undefined') {
      S.chatHistory = history;
      if (typeof save === 'function') save();
    }

    // Typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.style.display = 'flex';
    typingDiv.style.justifyContent = 'flex-start';
    const tb = document.createElement('div');
    tb.style.padding = '8px 12px';
    tb.style.borderRadius = '10px';
    tb.style.fontSize = '12px';
    tb.style.background = 'var(--card)';
    tb.style.color = 'var(--dim)';
    tb.textContent = tAI.typing;
    typingDiv.appendChild(tb);
    msgs.appendChild(typingDiv);
    msgs.scrollTop = msgs.scrollHeight;

    sendBtn.disabled = true;

    try {
      const systemPrompt = fpSystemPrompt();
      const apiMessages = [{ role: 'system', content: systemPrompt }];
      history.forEach(m => apiMessages.push({ role: m.role, content: m.content }));

      const resp = await callAI(apiMessages);
      typingDiv.remove();
      addMsg('assistant', resp);

      if (mode === 'general' && typeof S !== 'undefined') {
        S.chatHistory.push({ role: 'assistant', content: resp });
        if (typeof save === 'function') save();
      }

      if (mode === 'schedule_building') {
        fpTryApplyScheduleFromAI(resp);
      }
    } catch (e) {
      console.error('[FITPULSE EXT] AI chat error', e);
      typingDiv.remove();
      addMsg('assistant', tAI.error);
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  if (sendBtn) sendBtn.onclick = send;
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });
    input.focus();
  }

  const close = wrap.querySelector('#fpAIClose');
  if (close) {
    close.onclick = () => {
      fpAIChatOpen = false;
      wrap.remove();
    };
  }

  const newChat = wrap.querySelector('#fpAINewChat');
  if (newChat && typeof S !== 'undefined') {
    newChat.onclick = () => {
      S.chatHistory = [];
      if (typeof save === 'function') save();
      wrap.remove();
      fpOpenAIChat('general');
    };
  }
}

function fpTryApplyScheduleFromAI (resp) {
  if (typeof S === 'undefined') return;
  try {
    const match = resp.match(/\{[\s\S]*\}/);
    if (!match) return;
    const obj = JSON.parse(match[0]);
    if (!Array.isArray(obj.schedule)) return;

    const dur = obj.duration || obj.schedule.length;
    S.programDuration = dur;
    S.customSchedule = obj.schedule;
    if (obj.customDays && typeof obj.customDays === 'object') {
      S.customDayExercises = obj.customDays;
    }
    S.firstLaunchComplete = true;
    if (typeof save === 'function') save();

    alert(fpLang() === 'ar'
      ? '✅ تم إنشاء جدولك المخصص! سيتم إعادة تحميل التطبيق.'
      : fpLang() === 'fr'
        ? '✅ Votre programme personnalisé a été créé ! L\'application va se recharger.'
        : '✅ Your personalized schedule has been created! The app will reload.');

    setTimeout(() => location.reload(), 800);
  } catch (e) {
    console.warn('[FITPULSE EXT] Failed to parse schedule JSON from AI', e);
  }
}

// Floating FAB to open AI chat
function fpAddAIChatFAB () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fpAIFab')) return;

  const btn = document.createElement('button');
  btn.id = 'fpAIFab';
  btn.textContent = '🤖';
  btn.title = FP_TRANSLATIONS[fpLang()].ai.coach;
  btn.style.position = 'fixed';
  btn.style.bottom = '96px';
  btn.style[fpLang() === 'ar' ? 'left' : 'right'] = '18px';
  btn.style.zIndex = '9997';
  btn.style.width = '54px';
  btn.style.height = '54px';
  btn.style.borderRadius = '50%';
  btn.style.border = 'none';
  btn.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
  btn.style.color = 'var(--night)';
  btn.style.fontSize = '26px';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 4px 16px rgba(0,0,0,.6)';
  btn.onclick = () => fpOpenAIChat('general');

  document.body.appendChild(btn);
}

// ============================================================
// SCHEDULE EDITOR (OVERLAY UI)
// ============================================================
function fpOpenScheduleEditor () {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fpSchedEditor')) return;
  if (typeof S === 'undefined') return;

  const schedule = fpGetCurrentSchedule();
  const total = S.programDuration || 30;

  const wrap = document.createElement('div');
  wrap.id = 'fpSchedEditor';
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.background = 'rgba(0,0,0,.88)';
  wrap.style.zIndex = '9996';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.alignItems = 'center';
  wrap.style.padding = '20px';

  const card = document.createElement('div');
  card.style.maxWidth = '960px';
  card.style.width = '100%';
  card.style.maxHeight = '90vh';
  card.style.overflowY = 'auto';
  card.style.background = 'var(--dark)';
  card.style.borderRadius = '18px';
  card.style.border = '1px solid rgba(212,168,67,.3)';
  card.style.padding = '16px 16px 20px';

  const tSched = FP_TRANSLATIONS[fpLang()].schedule;

  let inner = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:16px;font-weight:900;color:var(--gold)">${tSched.edit}</div>
        <div style="font-size:11px;color:var(--dim)">${total} ${tSched.day}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button id="fpSchedReset" class="fp-chip-btn">${tSched.reset}</button>
        <button id="fpSchedClose" class="fp-chip-btn">✕</button>
      </div>
    </div>
  `;

  const weeks = Math.ceil(total / 7);
  const labelMap = (typeof SCH_S !== 'undefined' && SCH_S) || {};

  for (let w = 1; w <= weeks; w++) {
    inner += `<div style="margin-top:10px;margin-bottom:4px;font-size:12px;color:var(--gold);font-weight:700">${tSched.week} ${w}</div>`;
    inner += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">`;
    for (let d = 1; d <= 7; d++) {
      const dayNum = (w - 1) * 7 + d;
      if (dayNum > total) {
        inner += `<div></div>`;
        continue;
      }
      const schType = schedule[dayNum - 1] ?? 0;
      const key = 'd' + dayNum;
      const modified = S.customDayExercises && Array.isArray(S.customDayExercises[key]);
      inner += `
        <div class="fp-sq-day"
          data-day="${dayNum}"
          style="padding:8px;border-radius:10px;background:var(--card);border:1px solid rgba(212,168,67,.25);cursor:pointer;position:relative">
          <div style="font-size:13px;font-weight:900;color:var(--gold)">${dayNum}</div>
          <div style="font-size:10px;color:var(--dim);margin-top:2px">${labelMap[schType] || (schType === 0 ? tSched.rest : '')}</div>
          ${modified ? `<div style="position:absolute;top:4px;${fpLang() === 'ar' ? 'left' : 'right'}:4px;font-size:11px;color:var(--gold)">${tSched.modified}</div>` : ''}
        </div>
      `;
    }
    inner += `</div>`;
  }

  card.innerHTML = inner;
  wrap.appendChild(card);
  document.body.appendChild(wrap);

  Array.from(card.querySelectorAll('.fp-chip-btn')).forEach(b => {
    b.style.padding = '6px 12px';
    b.style.borderRadius = '999px';
    b.style.border = '1px solid rgba(212,168,67,.3)';
    b.style.background = 'var(--card)';
    b.style.color = 'var(--text)';
    b.style.fontSize = '11px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.cursor = 'pointer';
  });

  const closeBtn = card.querySelector('#fpSchedClose');
  if (closeBtn) closeBtn.onclick = () => wrap.remove();

  const resetBtn = card.querySelector('#fpSchedReset');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (!confirm(tSched.resetConfirm)) return;
      S.customSchedule = null;
      S.customDayExercises = {};
      if (typeof save === 'function') save();
      wrap.remove();
      fpOpenScheduleEditor();
      if (typeof buildDaySel === 'function') buildDaySel();
      if (typeof renderWorkout === 'function') renderWorkout();
    };
  }

  Array.from(card.querySelectorAll('.fp-sq-day')).forEach(dayEl => {
    dayEl.onclick = () => {
      const d = parseInt(dayEl.getAttribute('data-day') || '1', 10);
      fpOpenDayEditor(d);
    };
  });
}

// Simple per-day editor (list of exercises, add/remove)
function fpOpenDayEditor (dayNum) {
  if (typeof document === 'undefined') return;
  if (typeof S === 'undefined') return;
  const schedule = fpGetCurrentSchedule();
  const schType = schedule[dayNum - 1] ?? 0;
  const key = 'd' + dayNum;
  const plan = (typeof PLANS !== 'undefined' && PLANS[schType]) || { exercises: [] };
  const baseList = plan.exercises || [];
  const custom = S.customDayExercises && Array.isArray(S.customDayExercises[key])
    ? S.customDayExercises[key].slice()
    : baseList.slice();

  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,.9)';
  overlay.style.zIndex = '9997';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.padding = '20px';

  const card = document.createElement('div');
  card.style.maxWidth = '500px';
  card.style.width = '100%';
  card.style.maxHeight = '80vh';
  card.style.overflowY = 'auto';
  card.style.background = 'var(--card)';
  card.style.borderRadius = '16px';
  card.style.border = '1px solid rgba(212,168,67,.3)';
  card.style.padding = '16px';

  const tSched = FP_TRANSLATIONS[fpLang()].schedule;

  function renderList () {
    const listDiv = card.querySelector('#fpDayExList');
    if (!listDiv) return;
    const EX_LOCAL = (typeof EX !== 'undefined' && EX) || {};
    if (!custom.length) {
      listDiv.innerHTML = `<div style="font-size:12px;color:var(--dim);text-align:center;padding:12px">${FP_TRANSLATIONS[fpLang()].exercise.noExercises}</div>`;
      return;
    }
    listDiv.innerHTML = custom.map((id, idx) => {
      const ex = EX_LOCAL[id] || S.customExercises[id] || { name: id };
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:8px;background:var(--card2);margin-bottom:6px">
          <div style="font-size:13px;font-weight:700">${ex.name || id}</div>
          <button data-idx="${idx}" class="fp-del-ex" style="padding:4px 8px;border-radius:8px;border:1px solid rgba(231,76,60,.4);background:transparent;color:var(--red);font-size:11px;cursor:pointer">
            ${FP_TRANSLATIONS[fpLang()].exercise.delete}
          </button>
        </div>
      `;
    }).join('');
    Array.from(listDiv.querySelectorAll('.fp-del-ex')).forEach(btn => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute('data-idx') || '0', 10);
        custom.splice(i, 1);
        renderList();
      };
    });
  }

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:14px;font-weight:900;color:var(--gold)">${tSched.day} ${dayNum}</div>
        <div style="font-size:11px;color:var(--dim)">${tSched.type}: ${schType}</div>
      </div>
      <button id="fpDayClose" class="fp-chip-btn">✕</button>
    </div>
    <div id="fpDayExList" style="margin-bottom:10px"></div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button id="fpDayAddEx" class="fp-main-btn">${tSched.addExercise}</button>
      <button id="fpDaySave" class="fp-main-btn">${tSched.save}</button>
    </div>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  Array.from(card.querySelectorAll('.fp-chip-btn')).forEach(b => {
    b.style.padding = '6px 12px';
    b.style.borderRadius = '999px';
    b.style.border = '1px solid rgba(212,168,67,.3)';
    b.style.background = 'var(--card2)';
    b.style.color = 'var(--text)';
    b.style.fontSize = '11px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.cursor = 'pointer';
  });
  Array.from(card.querySelectorAll('.fp-main-btn')).forEach(b => {
    b.style.padding = '8px 12px';
    b.style.borderRadius = '999px';
    b.style.border = 'none';
    b.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
    b.style.color = 'var(--night)';
    b.style.fontSize = '12px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.fontWeight = '700';
    b.style.cursor = 'pointer';
  });

  renderList();

  const close = card.querySelector('#fpDayClose');
  if (close) close.onclick = () => overlay.remove();

  const saveBtn = card.querySelector('#fpDaySave');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const key = 'd' + dayNum;
      if (!S.customDayExercises) S.customDayExercises = {};
      S.customDayExercises[key] = custom.slice();
      if (typeof save === 'function') save();
      overlay.remove();
    };
  }

  const addBtn = card.querySelector('#fpDayAddEx');
  if (addBtn) {
    addBtn.onclick = () => {
      overlay.remove();
      fpOpenExerciseLibrary(dayNum, custom);
    };
  }
}

// ============================================================
// EXERCISE LIBRARY (SEARCH + FILTER + CUSTOM)
// ============================================================
function fpOpenExerciseLibrary (targetDay, initialList) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('fpExLib')) return;

  const wrap = document.createElement('div');
  wrap.id = 'fpExLib';
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.background = 'rgba(0,0,0,.9)';
  wrap.style.zIndex = '9997';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.alignItems = 'center';
  wrap.style.padding = '20px';

  const card = document.createElement('div');
  card.style.maxWidth = '900px';
  card.style.width = '100%';
  card.style.maxHeight = '90vh';
  card.style.overflowY = 'auto';
  card.style.background = 'var(--dark)';
  card.style.borderRadius = '18px';
  card.style.border = '1px solid rgba(212,168,67,.35)';
  card.style.padding = '14px 14px 18px';

  const tEx = FP_TRANSLATIONS[fpLang()].exercise;

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div>
        <div style="font-size:15px;font-weight:900;color:var(--gold)">${tEx.library}</div>
        ${targetDay ? `<div style="font-size:11px;color:var(--dim)">${FP_TRANSLATIONS[fpLang()].schedule.day} ${targetDay}</div>` : ''}
      </div>
      <button id="fpExClose" class="fp-chip-btn">✕</button>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:8px">
      <input id="fpExSearch" placeholder="${tEx.search}"
        style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.25);background:var(--card);color:var(--text);font-size:13px">
      <select id="fpExFilter"
        style="width:130px;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.25);background:var(--card);color:var(--text);font-size:12px">
        <option value="all">${tEx.all}</option>
        <option value="cardio">${tEx.cardio}</option>
        <option value="strength">${tEx.strength}</option>
        <option value="core">${tEx.core}</option>
        <option value="custom">${tEx.custom}</option>
      </select>
    </div>
    <div style="margin-bottom:10px">
      <button id="fpExCreate" class="fp-main-btn">${tEx.create}</button>
    </div>
    <div id="fpExGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px"></div>
  `;

  wrap.appendChild(card);
  document.body.appendChild(wrap);

  Array.from(card.querySelectorAll('.fp-chip-btn')).forEach(b => {
    b.style.padding = '6px 12px';
    b.style.borderRadius = '999px';
    b.style.border = '1px solid rgba(212,168,67,.3)';
    b.style.background = 'var(--card2)';
    b.style.color = 'var(--text)';
    b.style.fontSize = '11px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.cursor = 'pointer';
  });
  Array.from(card.querySelectorAll('.fp-main-btn')).forEach(b => {
    b.style.padding = '8px 12px';
    b.style.borderRadius = '999px';
    b.style.border = 'none';
    b.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
    b.style.color = 'var(--night)';
    b.style.fontSize = '12px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.fontWeight = '700';
    b.style.cursor = 'pointer';
  });

  const close = card.querySelector('#fpExClose');
  if (close) close.onclick = () => wrap.remove();

  const search = card.querySelector('#fpExSearch');
  const filter = card.querySelector('#fpExFilter');
  const grid = card.querySelector('#fpExGrid');

  function renderGrid () {
    if (!grid) return;
    const EX_LOCAL = (typeof EX !== 'undefined' && EX) || {};
    const all = { ...(EX_LOCAL || {}), ...(S && S.customExercises ? S.customExercises : {}) };
    const q = (search && search.value || '').toLowerCase();
    const cat = filter && filter.value || 'all';

    const list = Object.keys(all).filter(id => {
      const ex = all[id];
      const name = (ex.name || id).toLowerCase();
      const nameEn = (ex.nameEn || '').toLowerCase();
      if (q && !name.includes(q) && !nameEn.includes(q)) return false;
      const cats = (ex.muscles || []).join(' ').toLowerCase();
      if (cat === 'cardio') return cats.includes('cardio') || cats.includes('كارديو');
      if (cat === 'strength') return cats.includes('strength') || cats.includes('قوة');
      if (cat === 'core') return cats.includes('core') || cats.includes('بطن');
      if (cat === 'custom') return S && S.customExercises && S.customExercises[id];
      return true;
    });

    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;font-size:12px;color:var(--dim);text-align:center;padding:10px">${tEx.noExercises}</div>`;
      return;
    }

    grid.innerHTML = list.map(id => {
      const ex = all[id];
      const isCustom = S && S.customExercises && S.customExercises[id];
      return `
        <div class="fp-ex-card" data-id="${id}"
          style="border-radius:12px;background:var(--card);border:1px solid rgba(212,168,67,.2);padding:8px;cursor:pointer">
          <div style="height:80px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:6px">
            ${ex.icon || '💪'}
          </div>
          <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ex.name || id}</div>
          ${isCustom ? `<div style="font-size:9px;color:var(--gold);margin-top:2px">${tEx.custom}</div>` : ''}
        </div>
      `;
    }).join('');

    Array.from(grid.querySelectorAll('.fp-ex-card')).forEach(cardEl => {
      cardEl.onclick = () => {
        const id = cardEl.getAttribute('data-id') || '';
        if (!targetDay) {
          alert((FP_TRANSLATIONS[fpLang()].ai.coach) + '\n' + id);
          return;
        }
        initialList.push(id);
        wrap.remove();
        fpOpenDayEditor(targetDay);
      };
    });
  }

  if (search) search.oninput = renderGrid;
  if (filter) filter.onchange = renderGrid;
  renderGrid();

  const createBtn = card.querySelector('#fpExCreate');
  if (createBtn) {
    createBtn.onclick = () => {
      wrap.remove();
      fpOpenCreateExercise(targetDay, initialList || []);
    };
  }
}

function fpOpenCreateExercise (targetDay, initialList) {
  if (typeof document === 'undefined') return;
  const wrap = document.createElement('div');
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.background = 'rgba(0,0,0,.9)';
  wrap.style.zIndex = '9997';
  wrap.style.display = 'flex';
  wrap.style.justifyContent = 'center';
  wrap.style.alignItems = 'center';
  wrap.style.padding = '20px';

  const card = document.createElement('div');
  card.style.maxWidth = '480px';
  card.style.width = '100%';
  card.style.maxHeight = '85vh';
  card.style.overflowY = 'auto';
  card.style.background = 'var(--card)';
  card.style.borderRadius = '16px';
  card.style.border = '1px solid rgba(212,168,67,.35)';
  card.style.padding = '16px';

  const tEx = FP_TRANSLATIONS[fpLang()].exercise;

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:14px;font-weight:900;color:var(--gold)">${tEx.create}</div>
      <button id="fpCExClose" class="fp-chip-btn">✕</button>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${tEx.name}</div>
      <input id="fpCExName" style="width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.3);background:var(--card2);color:var(--text)">
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${tEx.nameEn}</div>
      <input id="fpCExNameEn" style="width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.3);background:var(--card2);color:var(--text);direction:ltr">
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${tEx.description}</div>
      <textarea id="fpCExDesc" rows="3" style="width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.3);background:var(--card2);color:var(--text);resize:vertical"></textarea>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${tEx.selectCategory}</div>
      <select id="fpCExCat" style="width:100%;padding:8px 10px;border-radius:10px;border:1px solid rgba(212,168,67,.3);background:var(--card2);color:var(--text);font-size:12px">
        <option value="cardio">${tEx.cardio}</option>
        <option value="strength">${tEx.strength}</option>
        <option value="core">${tEx.core}</option>
        <option value="custom">${tEx.custom}</option>
      </select>
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">${tEx.image}</div>
      <input id="fpCExImg" type="file" accept="image/*" style="width:100%;margin-bottom:6px">
      <div id="fpCExPrev" style="display:none;width:100%;height:140px;border-radius:10px;background:var(--card2);align-items:center;justify-content:center;overflow:hidden">
        <img id="fpCExPrevImg" style="max-width:100%;max-height:100%;object-fit:contain">
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button id="fpCExSave" class="fp-main-btn">${FP_TRANSLATIONS[fpLang()].schedule.save}</button>
      <button id="fpCExCancel" class="fp-main-btn">${FP_TRANSLATIONS[fpLang()].schedule.cancel}</button>
    </div>
  `;

  wrap.appendChild(card);
  document.body.appendChild(wrap);

  Array.from(card.querySelectorAll('.fp-chip-btn')).forEach(b => {
    b.style.padding = '6px 12px';
    b.style.borderRadius = '999px';
    b.style.border = '1px solid rgba(212,168,67,.3)';
    b.style.background = 'var(--card2)';
    b.style.color = 'var(--text)';
    b.style.fontSize = '11px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.cursor = 'pointer';
  });
  Array.from(card.querySelectorAll('.fp-main-btn')).forEach(b => {
    b.style.padding = '8px 12px';
    b.style.borderRadius = '999px';
    b.style.border = 'none';
    b.style.background = 'linear-gradient(135deg,var(--gold),var(--gd))';
    b.style.color = 'var(--night)';
    b.style.fontSize = '12px';
    b.style.fontFamily = 'Cairo,sans-serif';
    b.style.fontWeight = '700';
    b.style.cursor = 'pointer';
  });

  const close = card.querySelector('#fpCExClose');
  if (close) close.onclick = () => wrap.remove();
  const cancel = card.querySelector('#fpCExCancel');
  if (cancel) cancel.onclick = () => wrap.remove();

  let imgData = null;
  const fileInput = card.querySelector('#fpCExImg');
  const prevWrap = card.querySelector('#fpCExPrev');
  const prevImg = card.querySelector('#fpCExPrevImg');
  if (fileInput && prevWrap && prevImg) {
    fileInput.onchange = e => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        imgData = ev.target.result;
        prevImg.src = imgData;
        prevWrap.style.display = 'flex';
      };
      r.readAsDataURL(f);
    };
  }

  const saveBtn = card.querySelector('#fpCExSave');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = card.querySelector('#fpCExName').value.trim();
      const nameEn = card.querySelector('#fpCExNameEn').value.trim();
      const desc = card.querySelector('#fpCExDesc').value.trim();
      const cat = card.querySelector('#fpCExCat').value || 'custom';
      if (!name) {
        alert(tEx.name + ' ' + FP_TRANSLATIONS[fpLang()].schedule.required);
        return;
      }
      const id = 'c_' + Date.now().toString(36);
      const ex = {
        id,
        name,
        nameEn: nameEn || name,
        description: desc,
        icon: '💪',
        muscles: [cat],
        image: imgData
      };
      if (typeof S !== 'undefined') {
        if (!S.customExercises) S.customExercises = {};
        S.customExercises[id] = ex;
        if (typeof save === 'function') save();
      }
      wrap.remove();
      if (targetDay) {
        initialList.push(id);
        fpOpenDayEditor(targetDay);
      }
    };
  }
}

// ============================================================
// SETTINGS: ADD ENTRY POINT FOR SCHEDULE EDITOR
// ============================================================
(function hookSettingsCard () {
  if (typeof document === 'undefined') return;
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const view = document.getElementById('view-progress');
      if (!view) return;
      if (document.getElementById('fpSchedBtn')) return;
      const card = view.querySelector('.settings-card') || view;
      const btn = document.createElement('button');
      btn.id = 'fpSchedBtn';
      btn.textContent = FP_TRANSLATIONS[fpLang()].settings.editSchedule;
      btn.style.width = '100%';
      btn.style.marginTop = '10px';
      btn.style.padding = '10px 14px';
      btn.style.borderRadius = '10px';
      btn.style.border = '1px solid rgba(212,168,67,.3)';
      btn.style.background = 'var(--card2)';
      btn.style.color = 'var(--gold)';
      btn.style.fontSize = '13px';
      btn.style.fontFamily = 'Cairo,sans-serif';
      btn.style.fontWeight = '700';
      btn.style.cursor = 'pointer';
      btn.onclick = fpOpenScheduleEditor;
      card.appendChild(btn);
    } catch (e) {
      console.error('[FITPULSE EXT] hookSettingsCard error', e);
    }
  });
})();

// GROQ-based AI helper stub for FITPULSE PRO
// Minimal file created so it actually exists on disk.
// You can expand this later with full chat UI and logic.

const GROQ_API_KEY = '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';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

async function callAI(messages) {
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Expose on global for now so index_final.html can call it later.
window.FitpulseAI = { callAI };

