import {
  billingSubscriptions,
  comment,
  db,
  kudos,
  portfolioAnalyticsEvents,
  portfolioProfiles,
  user,
  userSettings,
  work,
} from "./index";
import { eq, or } from "drizzle-orm";
import { SEED_CREATOR, SEED_WORKS } from "./seed-data";
import type { UserRole, WorkType } from "./schema";

const DAY = 24 * 60 * 60 * 1000;

type DemoUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  bio: string;
  website?: string;
  location?: string;
  kudosBalance?: number;
};

type DemoWork = {
  id: string;
  creatorId: string;
  type: WorkType;
  accentColor: string;
  image?: string;
  readingTime: number;
  published: boolean;
  tags: string[];
  title: Record<"ar" | "en" | "fr" | "es", string>;
  tag: Record<"ar" | "en" | "fr" | "es", string>;
  summary: Record<"ar" | "en" | "fr" | "es", string>;
  bodyAr: string;
  bodyEn: string;
  bodyFr: string;
  bodyEs: string;
};

type PortfolioSeed = {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  prompt: string;
  published: boolean;
  theme: string;
  metadata: Record<string, unknown>;
};

const demoDate = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY);

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (!item) throw new Error("Cannot pick from an empty seed list.");
  return item;
}

function translated(value: Record<string, string>, lang: "ar" | "en" | "fr" | "es") {
  return value[lang] ?? value.en ?? value.ar ?? "";
}

const DEMO_USERS: DemoUser[] = [
  {
    ...SEED_CREATOR,
    website: "https://skaddosh/creator/al-hishu",
    location: "Tangier, Morocco",
    kudosBalance: 140,
  },
  {
    id: "user_nora_vale",
    name: "Nora Vale",
    username: "nora-vale",
    email: "nora.vale@example.com",
    role: "creator",
    bio: "Product strategist and essayist exploring calm software, research rituals, and humane tools.",
    website: "https://nora.example.com",
    location: "Lisbon, Portugal",
    kudosBalance: 92,
  },
  {
    id: "user_omar_haddad",
    name: "Omar Haddad",
    username: "omar-haddad",
    email: "omar.haddad@example.com",
    role: "creator",
    bio: "Frontend engineer, design-systems builder, and visual diarist working between Casablanca and Montreal.",
    website: "https://github.com/omarhaddad",
    location: "Casablanca, Morocco",
    kudosBalance: 118,
  },
  {
    id: "user_laila_mansouri",
    name: "Laila Mansouri",
    username: "laila-mansouri",
    email: "laila.mansouri@example.com",
    role: "creator",
    bio: "Research designer documenting cities, memory, archives, and the small systems that keep communities alive.",
    website: "https://laila.example.com",
    location: "Rabat, Morocco",
    kudosBalance: 85,
  },
  {
    id: "user_sam_rivera",
    name: "Sam Rivera",
    username: "sam-rivera",
    email: "sam.rivera@example.com",
    role: "creator",
    bio: "Poet, translator, and editor making bilingual fragments for late trains and early coffee.",
    website: "https://samrivera.example.com",
    location: "Madrid, Spain",
    kudosBalance: 76,
  },
  {
    id: "user_mina_park",
    name: "Mina Park",
    username: "mina-park",
    email: "mina.park@example.com",
    role: "creator",
    bio: "Independent publisher curating short fiction, field notes, and experimental journals.",
    website: "https://minapark.example.com",
    location: "Seoul, Korea",
    kudosBalance: 161,
  },
  {
    id: "user_yanis_benali",
    name: "Yanis Benali",
    username: "yanis-benali",
    email: "yanis.benali@example.com",
    role: "creator",
    bio: "Screenwriter and comic essayist interested in absurd bureaucracies and family folklore.",
    website: "https://yanis.example.com",
    location: "Paris, France",
    kudosBalance: 63,
  },
  {
    id: "user_ines_ortega",
    name: "Ines Ortega",
    username: "ines-ortega",
    email: "ines.ortega@example.com",
    role: "reader",
    bio: "Reader, annotator, and collector of travel journals.",
    location: "Valencia, Spain",
    kudosBalance: 210,
  },
  {
    id: "user_jules_baron",
    name: "Jules Baron",
    username: "jules-baron",
    email: "jules.baron@example.com",
    role: "reader",
    bio: "Reads essays at night and leaves very specific comments.",
    location: "Lyon, France",
    kudosBalance: 188,
  },
  {
    id: "user_hana_sato",
    name: "Hana Sato",
    username: "hana-sato",
    email: "hana.sato@example.com",
    role: "reader",
    bio: "Translator looking for short pieces with strong atmospheres.",
    location: "Kyoto, Japan",
    kudosBalance: 132,
  },
  {
    id: "user_adam_green",
    name: "Adam Green",
    username: "adam-green",
    email: "adam.green@example.com",
    role: "reader",
    bio: "Designer who bookmarks anything with a good title.",
    location: "Austin, United States",
    kudosBalance: 97,
  },
  {
    id: "user_salma_idrissi",
    name: "Salma Idrissi",
    username: "salma-idrissi",
    email: "salma.idrissi@example.com",
    role: "publisher",
    bio: "Small-press editor testing skaddosh submissions and portfolio discovery.",
    website: "https://atlasletters.example.com",
    location: "Marrakesh, Morocco",
    kudosBalance: 260,
  },
];

const EXTRA_WORKS: DemoWork[] = [
  {
    id: "work_signal_garden",
    creatorId: "user_nora_vale",
    type: "essay",
    accentColor: "#2f6f5e",
    image: "/brand/logo.png",
    readingTime: 8,
    published: true,
    tags: ["software", "design", "rituals"],
    title: {
      ar: "حديقة الإشارات",
      en: "The Signal Garden",
      fr: "Le Jardin des signaux",
      es: "El jardín de señales",
    },
    tag: {
      ar: "مقال · تصميم هادئ",
      en: "Essay · Calm software",
      fr: "Essai · Logiciel calme",
      es: "Ensayo · Software tranquilo",
    },
    summary: {
      ar: "تأمل في بناء أدوات رقمية تقلل الضجيج وتحافظ على انتباه الإنسان.",
      en: "A meditation on building digital tools that lower noise and protect human attention.",
      fr: "Une méditation sur les outils numériques qui réduisent le bruit et protègent l'attention.",
      es: "Una meditación sobre herramientas digitales que reducen ruido y protegen la atención.",
    },
    bodyAr: "ليست كل إشارة دعوة إلى الرد. أحيانًا تكون الإشارة الجيدة مثل نافذة مضاءة في آخر الشارع: تكفي لتخبرك أن هناك حياة دون أن تطلب منك الدخول.",
    bodyEn: "Not every signal is an invitation to respond. A good product signal is sometimes a lit window at the end of the street: enough to tell you there is life there without asking you to enter.",
    bodyFr: "Tous les signaux ne demandent pas une réponse. Un bon signal ressemble parfois à une fenêtre allumée au bout de la rue.",
    bodyEs: "No toda señal exige respuesta. Una buena señal de producto puede ser una ventana iluminada al final de la calle.",
  },
  {
    id: "work_atlas_of_small_doors",
    creatorId: "user_laila_mansouri",
    type: "journal",
    accentColor: "#b45309",
    readingTime: 6,
    published: true,
    tags: ["cities", "memory", "field-notes"],
    title: {
      ar: "أطلس الأبواب الصغيرة",
      en: "Atlas of Small Doors",
      fr: "Atlas des petites portes",
      es: "Atlas de puertas pequeñas",
    },
    tag: {
      ar: "دفتر · مدينة",
      en: "Journal · City",
      fr: "Carnet · Ville",
      es: "Diario · Ciudad",
    },
    summary: {
      ar: "ملاحظات ميدانية عن الأبواب، الحارات، والذاكرة اليومية في المدن.",
      en: "Field notes on doors, alleys, and daily memory inside cities.",
      fr: "Notes de terrain sur les portes, les ruelles et la mémoire quotidienne.",
      es: "Notas de campo sobre puertas, callejones y memoria diaria.",
    },
    bodyAr: "في كل حي باب لا ينتبه إليه أحد. خلفه ليست حكاية كبرى، بل جدول صغير من العادات: كرسي، قطة، ومفتاح يرن في اليد نفسها كل مساء.",
    bodyEn: "Every neighborhood has a door nobody notices. Behind it is not a grand story, but a small ledger of habits: a chair, a cat, and a key ringing in the same hand every evening.",
    bodyFr: "Chaque quartier possède une porte que personne ne remarque. Derrière elle se cache un petit registre d'habitudes.",
    bodyEs: "Cada barrio tiene una puerta que nadie mira. Detrás vive un pequeño registro de costumbres.",
  },
  {
    id: "work_midnight_commit",
    creatorId: "user_omar_haddad",
    type: "article",
    accentColor: "#0f766e",
    readingTime: 7,
    published: true,
    tags: ["engineering", "frontend", "teams"],
    title: {
      ar: "الكومِت بعد منتصف الليل",
      en: "The Midnight Commit",
      fr: "Le commit de minuit",
      es: "El commit de medianoche",
    },
    tag: {
      ar: "مقال · هندسة",
      en: "Article · Engineering",
      fr: "Article · Ingénierie",
      es: "Artículo · Ingeniería",
    },
    summary: {
      ar: "قصة خفيفة عن إصلاحات متأخرة، مراجعة كود لطيفة، وفِرق تتعلم ببطء.",
      en: "A light story about late fixes, kinder code review, and teams learning slowly.",
      fr: "Une histoire légère sur les correctifs tardifs et les revues de code plus humaines.",
      es: "Una historia ligera sobre arreglos tarde y revisiones de código más humanas.",
    },
    bodyAr: "كانت الساعة 00:17 حين كتب عمر رسالة الكومِت: fix the thing. عرف في الصباح أن الشيء لم يكن شيئًا واحدًا، بل عائلة كاملة من الأشياء الصغيرة.",
    bodyEn: "It was 00:17 when Omar wrote the commit message: fix the thing. By morning, he learned the thing was not one thing, but a family of tiny things.",
    bodyFr: "Il était 00:17 quand Omar écrivit le message: fix the thing. Le matin, la chose était devenue une famille de petites choses.",
    bodyEs: "Eran las 00:17 cuando Omar escribió: fix the thing. Por la mañana, aquello era una familia de pequeñas cosas.",
  },
  {
    id: "work_blue_platform",
    creatorId: "user_sam_rivera",
    type: "poem",
    accentColor: "#2563eb",
    readingTime: 3,
    published: true,
    tags: ["poetry", "translation", "travel"],
    title: {
      ar: "رصيف أزرق",
      en: "Blue Platform",
      fr: "Quai bleu",
      es: "Andén azul",
    },
    tag: {
      ar: "قصيدة · سفر",
      en: "Poem · Travel",
      fr: "Poème · Voyage",
      es: "Poema · Viaje",
    },
    summary: {
      ar: "قصيدة قصيرة عن الانتظار والترجمة وحقائب السفر.",
      en: "A short poem about waiting, translation, and suitcases.",
      fr: "Un court poème sur l'attente, la traduction et les valises.",
      es: "Un poema breve sobre espera, traducción y maletas.",
    },
    bodyAr: "على الرصيف الأزرق / تركت لغتي حقيبة مفتوحة / وركض القطار قبل أن أتعلم / كيف أقول وداعًا ببطء.",
    bodyEn: "On the blue platform / my language left an open suitcase / and the train ran before I learned / how to say goodbye slowly.",
    bodyFr: "Sur le quai bleu / ma langue laissa une valise ouverte / et le train partit avant que j'apprenne / à dire adieu lentement.",
    bodyEs: "En el andén azul / mi lengua dejó una maleta abierta / y el tren corrió antes de aprender / a despedirse despacio.",
  },
  {
    id: "work_house_with_two_moons",
    creatorId: "user_mina_park",
    type: "story",
    accentColor: "#9333ea",
    readingTime: 9,
    published: true,
    tags: ["fiction", "speculative", "family"],
    title: {
      ar: "بيت بقمرين",
      en: "A House With Two Moons",
      fr: "Une maison avec deux lunes",
      es: "Una casa con dos lunas",
    },
    tag: {
      ar: "قصة · غرائبية",
      en: "Story · Speculative",
      fr: "Nouvelle · Spéculatif",
      es: "Relato · Especulativo",
    },
    summary: {
      ar: "عائلة تكتشف أن سطح بيتها يتبع تقويمًا سماويًا خاصًا.",
      en: "A family discovers its rooftop follows a private celestial calendar.",
      fr: "Une famille découvre que son toit suit un calendrier céleste privé.",
      es: "Una familia descubre que su azotea sigue un calendario celeste propio.",
    },
    bodyAr: "في الشهر الذي ظهر فيه القمر الثاني، لم يتفاجأ أحد في البيت إلا الجدّة. قالت إن السماء أخيرًا تذكرت العنوان الصحيح.",
    bodyEn: "The month the second moon appeared, nobody in the house was surprised except grandmother. She said the sky had finally remembered the correct address.",
    bodyFr: "Le mois où la seconde lune apparut, personne ne fut surpris sauf la grand-mère. Le ciel s'était enfin souvenu de la bonne adresse.",
    bodyEs: "El mes en que apareció la segunda luna, nadie se sorprendió salvo la abuela. El cielo por fin recordó la dirección correcta.",
  },
  {
    id: "work_ministry_of_lost_forms",
    creatorId: "user_yanis_benali",
    type: "script",
    accentColor: "#dc2626",
    readingTime: 11,
    published: true,
    tags: ["script", "satire", "bureaucracy"],
    title: {
      ar: "وزارة الاستمارات الضائعة",
      en: "The Ministry of Lost Forms",
      fr: "Le ministère des formulaires perdus",
      es: "El ministerio de formularios perdidos",
    },
    tag: {
      ar: "سيناريو · سخرية",
      en: "Script · Satire",
      fr: "Scénario · Satire",
      es: "Guion · Sátira",
    },
    summary: {
      ar: "مشهد ساخر عن مكتب حكومي يحتاج إلى استمارة لإثبات ضياع الاستمارة.",
      en: "A satirical scene where proving a lost form requires another form.",
      fr: "Une scène satirique où prouver la perte d'un formulaire demande un autre formulaire.",
      es: "Una escena satírica donde probar un formulario perdido requiere otro formulario.",
    },
    bodyAr: "الموظف: هل لديك نسخة من الاستمارة الضائعة؟ المواطن: لو كانت لدي نسخة لما كانت ضائعة. الموظف: إذن نحتاج إلى استمارة تثبت أنها ضائعة.",
    bodyEn: "CLERK: Do you have a copy of the lost form? CITIZEN: If I had a copy, it would not be lost. CLERK: Then we need a form proving it is lost.",
    bodyFr: "EMPLOYÉ : Avez-vous une copie du formulaire perdu ? CITOYEN : Si j'avais une copie, il ne serait pas perdu.",
    bodyEs: "FUNCIONARIO: ¿Tiene copia del formulario perdido? CIUDADANO: Si tuviera copia, no estaría perdido.",
  },
  {
    id: "work_tea_before_launch",
    creatorId: "user_salma_idrissi",
    type: "article",
    accentColor: "#16a34a",
    readingTime: 5,
    published: true,
    tags: ["publishing", "workflow", "editorial"],
    title: {
      ar: "شاي قبل الإطلاق",
      en: "Tea Before Launch",
      fr: "Thé avant le lancement",
      es: "Té antes del lanzamiento",
    },
    tag: {
      ar: "مقال · نشر",
      en: "Article · Publishing",
      fr: "Article · Édition",
      es: "Artículo · Edición",
    },
    summary: {
      ar: "ملاحظات ناشرة صغيرة عن الطقوس الهادئة قبل إطلاق مجلة رقمية.",
      en: "Notes from a small publisher on calm rituals before launching a digital magazine.",
      fr: "Notes d'une petite éditrice sur les rituels calmes avant un lancement.",
      es: "Notas de una pequeña editora sobre rituales tranquilos antes de lanzar.",
    },
    bodyAr: "قبل كل إطلاق نصنع الشاي. ليس لأن الشاي يحل الأخطاء، بل لأنه يمنح الأخطاء وقتًا لتظهر قبل القراء.",
    bodyEn: "Before every launch we make tea. Not because tea fixes bugs, but because it gives bugs enough time to introduce themselves before readers do.",
    bodyFr: "Avant chaque lancement, nous préparons du thé. Il ne répare rien, mais il laisse le temps aux problèmes de se présenter.",
    bodyEs: "Antes de cada lanzamiento hacemos té. No arregla errores, pero les da tiempo para presentarse.",
  },
  {
    id: "work_unpublished_field_note",
    creatorId: "user_laila_mansouri",
    type: "journal",
    accentColor: "#64748b",
    readingTime: 4,
    published: true,
    tags: ["draft", "field-notes"],
    title: {
      ar: "مسودة دفتر ميداني",
      en: "Draft Field Note",
      fr: "Brouillon de terrain",
      es: "Borrador de campo",
    },
    tag: {
      ar: "مسودة",
      en: "Draft",
      fr: "Brouillon",
      es: "Borrador",
    },
    summary: {
      ar: "مسودة مخفية لاختبار الاستوديو.",
      en: "A hidden draft for testing the studio.",
      fr: "Un brouillon caché pour tester le studio.",
      es: "Un borrador oculto para probar el estudio.",
    },
    bodyAr: "هذه مسودة تجريبية لا تظهر في القراءة العامة.",
    bodyEn: "This is a demo draft that should not appear in public reading lists.",
    bodyFr: "Ceci est un brouillon de démonstration.",
    bodyEs: "Este es un borrador de demostración.",
  },
];

const CORE_WORKS: DemoWork[] = SEED_WORKS.map((seedWork, index) => ({
  bodyFr: "",
  bodyEs: "",
  ...seedWork,
  creatorId: SEED_CREATOR.id,
  tags: ["arabic", "fiction", seedWork.type],
  summary: {
    ar: translated(seedWork.tag, "ar"),
    en: translated(seedWork.tag, "en"),
    fr: translated(seedWork.tag, "fr"),
    es: translated(seedWork.tag, "es"),
  },
  image: index === 0 ? "/brand/logo.png" : undefined,
}));

const DEMO_WORKS = [...CORE_WORKS, ...EXTRA_WORKS];
const READER_IDS = DEMO_USERS.filter((item) => item.role !== "creator").map((item) => item.id);

const DEMO_KUDOS = DEMO_WORKS.flatMap((demoWork, workIndex) =>
  Array.from({ length: demoWork.published ? 5 : 1 }, (_, readerIndex) => {
    const fromUserId = pick(READER_IDS, workIndex + readerIndex);
    return {
      id: `kudos_${demoWork.id}_${readerIndex + 1}`,
      workId: demoWork.id,
      fromUserId,
      amount: ((workIndex + readerIndex) % 5) + 1,
      message: readerIndex % 2 === 0 ? "Loved the atmosphere and pacing." : null,
      createdAt: demoDate(35 - readerIndex - workIndex),
    };
  }),
);

const DEMO_COMMENTS = DEMO_WORKS.filter((demoWork) => demoWork.published).flatMap((demoWork, workIndex) =>
  Array.from({ length: 3 }, (_, commentIndex) => {
    const fromUserId = pick(READER_IDS, workIndex + commentIndex + 2);
    return {
      id: `comment_${demoWork.id}_${commentIndex + 1}`,
      workId: demoWork.id,
      fromUserId,
      body: [
        "This line stayed with me after reading.",
        "The multilingual presentation makes the piece feel generous.",
        "I would love to see a follow-up in the same world.",
      ][commentIndex] ?? "Beautiful work.",
      kudosSpent: 3,
      createdAt: demoDate(28 - commentIndex - workIndex),
    };
  }),
);

function countKudos(workId: string) {
  return DEMO_KUDOS.filter((entry) => entry.workId === workId).reduce((total, entry) => total + entry.amount, 0);
}

function countComments(workId: string) {
  return DEMO_COMMENTS.filter((entry) => entry.workId === workId).length;
}

function portfolioMetadata(input: {
  accentColor: string;
  themePreset: "skaddosh" | "ink" | "ember" | "forest" | "ocean";
  firstName: string;
  lastName: string;
  initials: string;
  tagline: string;
  location: string;
  email: string;
  heroImage?: string;
  github?: string;
  linkedin?: string;
  instagram?: string;
  projectNoun: string;
  researchField: string;
  customDomain?: string;
  customDomainRequested?: boolean;
}) {
  return {
    customization: {
      themePreset: input.themePreset,
      accentColor: input.accentColor,
      headingFont: "Spectral",
      monoFont: "Geist Mono",
      heroAlignment: input.themePreset === "ocean" ? "center" : "left",
      sectionSpacing: input.themePreset === "forest" ? "airy" : "balanced",
      cardStyle: input.themePreset === "ink" ? "outline" : "soft",
      visibleSections: ["about", "articles", "contact"],
      customDomainRequested: Boolean(input.customDomainRequested),
      customDomain: input.customDomain ?? "",
    },
    content: {
      siteConfig: {
        name: `${input.firstName} ${input.lastName}`.trim(),
        firstName: input.firstName,
        lastName: input.lastName,
        initials: input.initials,
        tagline: input.tagline,
        location: input.location,
        phone: "+1 555 010 2046",
        email: input.email,
        avatar: input.heroImage ?? "",
        social: {
          github: input.github ?? "",
          linkedin: input.linkedin ?? "",
          instagram: input.instagram ?? "",
        },
      },
      heroImage: {
        url: input.heroImage ?? "",
        alt: `${input.firstName} ${input.lastName}`,
      },
      companyProjects: [],
      openSourceProjects: [],
      designSystem: {
        id: "design-system",
        name: "",
        description: "",
        longDescription: "",
        github: input.github ?? "",
        url: "",
        coverImage: "",
        requiresAccess: false,
      },
      research: [
        {
          id: "research-archive",
          field: input.researchField,
          title: "Archive as living interface",
          description: "A research thread about making public work easier to browse, trust, and return to.",
          collaborators: ["Atlas Studio", "Skaddosh Research"],
          status: "ongoing",
        },
        {
          id: "research-field-notes",
          field: "Field notes",
          title: "Small rituals before publication",
          description: "Observations about process, review, drafts, launch anxiety, and how creative teams keep momentum.",
          collaborators: [],
          status: "exploratory",
        },
      ],
      instagramConfig: {
        username: input.instagram?.split("/").filter(Boolean).pop() ?? input.firstName.toLowerCase(),
        profileUrl: input.instagram ?? "",
      },
      stories: [],
      galleryFolders: [],
      aboutStory: {
        whoAmI: {
          label: "01 - Who",
          title: `Hi, I am ${input.firstName}.`,
          body: input.tagline,
          location: input.location,
        },
        whatIDo: {
          label: "02 - What",
          title: "I make public work easier to understand.",
          body: "This demo section gives the portfolio renderer real narrative material to wrap, align, and search.",
          pillars: [
            { k: "Research synthesis", v: "Turn scattered notes into decisions people can trust" },
            { k: "Editorial systems", v: "Design repeatable workflows for publishing and review" },
            { k: "Multilingual storytelling", v: "Shape work so it travels across audiences and languages" },
          ],
        },
      },
      timeline: [
        {
          id: "timeline-2026",
          year: "2026",
          type: "work",
          title: "Published a story-led skaddosh portfolio",
          org: "skaddosh",
          description: "Organized public identity, writing, experience, education, skills, contact, and analytics into one navigable profile.",
          tags: ["Portfolio", "Story", "Identity"],
          image: "",
        },
        {
          id: "timeline-2025",
          year: "2025",
          type: "work",
          title: "Built a repeatable creative workflow",
          org: "Independent",
          description: "Combined research, writing, design, and implementation into a calmer delivery rhythm.",
          tags: ["Workflow", "Research"],
          image: "",
        },
        {
          id: "timeline-2024",
          year: "2024",
          type: "academic",
          title: "Deepened research practice",
          org: input.researchField,
          description: "Studied how archives, public notes, and structured writing help people understand complex work faster.",
          tags: ["Education", "Research", "Archive"],
          image: "",
        },
      ],
      hobbies: [
        { id: "hobby-walks", emoji: "W", title: "Long walks", description: "Thinking through structure away from the screen." },
        { id: "hobby-coffee", emoji: "C", title: "Coffee notes", description: "Tiny tasting journals and launch-day rituals." },
        { id: "hobby-archives", emoji: "A", title: "Archives", description: "Collecting old interfaces, tickets, stamps, and maps." },
        { id: "hobby-cameras", emoji: "P", title: "Pocket photos", description: "Low-pressure visual notes from ordinary days." },
      ],
    },
    inbox: [
      {
        id: `msg-${input.firstName.toLowerCase()}-access`,
        kind: "access_request",
        createdAt: demoDate(2).getTime(),
        read: false,
        subject: "Collaboration request",
        from: {
          name: "Demo Recruiter",
          email: "recruiter@example.com",
          company: "Signal Works",
        },
        body: "I liked the way your portfolio explains your practice. Are you open to a short collaboration conversation next week?",
        meta: { source: "seed" },
      },
      {
        id: `msg-${input.firstName.toLowerCase()}-hello`,
        kind: "contact",
        createdAt: demoDate(5).getTime(),
        read: true,
        subject: "Thoughtful portfolio",
        from: {
          name: "Curious Reader",
          email: "reader@example.com",
        },
        body: "The story, experience, and skills sections make the work easy to understand. Nicely done.",
      },
    ],
  };
}

const OWNER_EMAIL = "me@osas.cloud";
const OWNER_SEED_ID = "user_oussama_hichou";
const OWNER_USERNAME = "usmhic";
const OWNER_DISPLAY_NAME = "Oussama Hichou";
const OWNER_PROMPT =
  "Software engineer and applied researcher building platforms at the intersection of data, AI, and technical delivery. Six years across DevSecOps, full-stack, blockchain, and ML/AI.";

const OWNER_PORTFOLIO_METADATA: Record<string, unknown> = {
      customization: {
        themePreset: "ink",
        accentColor: "#18181b",
        headingFont: "Spectral",
        monoFont: "Geist Mono",
        heroAlignment: "left",
        sectionSpacing: "balanced",
        cardStyle: "outline",
        visibleSections: ["about", "articles", "projects", "gallery", "contact"],
        customDomainRequested: false,
        customDomain: "",
      },
      content: {
        siteConfig: {
          name: "Oussama Hichou",
          firstName: "Oussama",
          lastName: "Hichou",
          initials: "OH",
          tagline: "Software Engineer · Business Systems Analyst · Applied Researcher",
          location: "Tangier, Morocco",
          phone: "+212 691 533 903",
          email: "me@osas.cloud",
          avatar: "",
          social: {
            github: "https://github.com/usmhic",
            linkedin: "https://linkedin.com/in/usmhic",
            instagram: "",
          },
        },
        heroImage: { url: "", alt: "Oussama Hichou" },
        companyProjects: [
          {
            id: "compass-apm-terminals",
            company: "APM Terminals · Maersk",
            name: "Compass",
            description: "Global container-operations platform replacing local Power BI dashboards, rolled out across nearly all APM terminals worldwide.",
            longDescription: "Compass is APM Terminals' global OT & Analytics platform for container operations. As Business Systems Analyst and Platform Engineer (Feb 2024 — Present), I led MVP development and full global scale-up — collaborating with Maersk's Central Data Hub and Global Data & Analytics teams to deliver a unified operations dashboard aligned with APM Terminals' Way of Working. The platform replaced fragmented local Power BI reports with a centralized, globally consistent view across nearly all terminals. The role grew from an IT/OT internship graduation project: I designed and built the intelligent operations-monitoring platform in hybrid cloud with Active Directory integration that became the direct predecessor to Compass.",
            tech: ["Python", "Azure", "Power BI", "SQL Server", "Active Directory", "Docker", "OpenStack"],
            coverImage: "",
            screenshots: [],
            requiresAccess: true,
            url: "",
          },
          {
            id: "cordoba-l2c-platform",
            company: "Taliware Inc.",
            name: "Cordoba L2C Developer Platform",
            description: "Developer platform and SDK for Cordoba L2 — a US-patented biometric-identity Layer-2 blockchain for device-level digital provenance.",
            longDescription: "Led the Cordoba L2C developer platform (developer.taliware.com) as Project Lead Developer (Apr 2023 — May 2024) — shipped the public product, SDK and developer tooling. Stewarded the vision for Cordoba L2, a US-patented biometric-identity Layer-2 blockchain for device-level digital provenance and copyright authentication. Earlier as Backend & Blockchain Engineer Intern (Apr — Jun 2023), built core APIs for Cordoba L2 in .NET / C# WebAPI and designed an asset-issuance API for on-chain, biometrically-verifiable digital assets.",
            tech: [".NET", "C#", "WebAPI", "Blockchain", "Biometrics", "REST APIs", "Layer-2"],
            coverImage: "",
            screenshots: [],
            requiresAccess: false,
            url: "https://taliware.com",
          },
        ],
        openSourceProjects: [
          {
            id: "skaddosh-ink",
            name: "Skaddosh.ink",
            description: "Creative-work recognition platform with native Kudos currency, multilingual publishing, and portfolio pages for writers and creators.",
            longDescription: "Skaddosh.ink (formerly ProblemSolvers) is a multilingual publishing and creator portfolio platform started in 2022 with a four-student team.\n\nWriters publish stories, essays, poems, articles, journals, and scripts. Readers discover and support through Kudos — a native appreciation currency. Creators build public portfolios with analytics, custom domains, and rich content sections.\n\nTech stack: Next.js 16 · tRPC 11 · Drizzle ORM · PostgreSQL · Better Auth · Tailwind CSS 4 · Expo React Native · TypeScript 5 · Turbo · pnpm workspaces.\n\nArchitecture: monorepo with shared packages for API (tRPC), auth (Better Auth), database (Drizzle), UI (Tailwind CSS), and i18n (i18next supporting Arabic, English, French, Spanish). Web and mobile apps consume the shared API layer.\n\nFeatures: multilingual content (ar/en/fr/es) · AI translation · Kudos economy · portfolio builder with analytics · inbox for contact messages · custom domains · studio for content creation · gallery collections · project showcase.",
            github: "https://github.com/usmhic",
            url: "https://skaddosh",
            coverImage: "/brand/logo.png",
            requiresAccess: false,
          },
          {
            id: "apikee",
            name: "Apikee",
            description: "Open-source API management ecosystem: gateway, API catalogue, and developer tooling.",
            longDescription: "Apikee is an open-source API management ecosystem providing a gateway, API catalogue, and developer tooling. Maintained as an active open-source project at apikee.com.",
            github: "https://github.com/usmhic",
            url: "https://apikee.com",
            coverImage: "",
            requiresAccess: false,
          },
          {
            id: "kubeuron",
            name: "Kubeuron",
            description: "Platform simplifying the software-delivery lifecycle for business stakeholders — bridging business and engineering.",
            longDescription: "Kubeuron (kubeuron.com) is a platform simplifying the software-delivery lifecycle for business stakeholders. It bridges the gap between business teams and engineering, making delivery progress visible and actionable for non-technical stakeholders. Currently in progress (2026).",
            github: "",
            url: "https://kubeuron.com",
            coverImage: "",
            requiresAccess: false,
          },
        ],
        designSystem: {
          id: "design-system",
          name: "",
          description: "",
          longDescription: "",
          github: "",
          url: "",
          coverImage: "",
          requiresAccess: false,
        },
        research: [
          {
            id: "research-ecg-biometrics-kan",
            field: "Applied Machine Learning · Biometrics",
            title: "ECG-based biometric identity using Kolmogorov–Arnold neural networks",
            description: "Doctoral research exploring biometric identification from ECG signals using Kolmogorov–Arnold Networks (KAN) as an alternative to standard MLP architectures. Joint applied-research and product-advocacy track with Taliware Inc. Doctoral paper in writing (2026).",
            collaborators: ["ENSA Tangier", "Abdelmalek Essaâdi University", "Taliware Inc."],
            status: "ongoing",
          },
          {
            id: "research-hyperthyroid-ecg",
            field: "Biomedical Signal Processing",
            title: "Hyperthyroid disease detection from ECG signals",
            description: "Research communication presented at J2DI Doctoral Days (2026). Explores machine learning approaches for detecting hyperthyroid disease from electrocardiogram signal analysis.",
            collaborators: ["ENSA Tangier"],
            status: "published",
          },
        ],
        instagramConfig: { username: "usmhic", profileUrl: "" },
        stories: [],
        galleryFolders: [],
        aboutStory: {
          whoAmI: {
            label: "01 - Who",
            title: "Hi, I'm Oussama.",
            body: "Software engineer and applied researcher with six years of experience across DevSecOps & cloud, full-stack development, blockchain, and machine learning & AI. Currently scaling APM Terminals' container-operations platform globally while completing a PhD on ECG-based biometric identity at ENSA Tangier. I look for roles that combine data and ML/AI potential with high-end technical delivery and clever engineering for clear business value.",
            location: "Tangier, Morocco",
          },
          whatIDo: {
            label: "02 - What",
            title: "I build platforms where data meets business value.",
            body: "From containerized cloud infrastructure to ML pipelines, from blockchain identity systems to full-stack SaaS products — I ship end-to-end. Six years of polyglot engineering across TypeScript, Python, Java, and C#, deployed on Azure, AWS, GCP, and OpenStack.",
            pillars: [
              { k: "Platform Engineering", v: "Cloud infrastructure, OT analytics, and global-scale operations platforms" },
              { k: "Applied Research", v: "ECG biometrics, Kolmogorov–Arnold networks, and ML for healthcare" },
              { k: "Full-Stack Product", v: "End-to-end delivery from API design to polished user interfaces" },
            ],
          },
        },
        timeline: [
          {
            id: "tl-kubeuron-2026",
            year: "2026",
            type: "project",
            title: "Building Kubeuron",
            org: "Kubeuron",
            description: "Platform simplifying the software-delivery lifecycle for business stakeholders — bridging business and engineering. In progress.",
            tags: ["DevOps", "Platform", "Business-Engineering Bridge"],
            image: "",
          },
          {
            id: "tl-phd-2024",
            year: "2024",
            type: "academic",
            title: "PhD in Biotechnology — ECG-based Biometric Identity",
            org: "ENSA Tangier · Abdelmalek Essaâdi University",
            description: "Doctoral research on ECG-based biometric identity using Kolmogorov–Arnold neural networks. Joint applied-research and product-advocacy track with Taliware Inc. Currently in progress.",
            tags: ["PhD", "Machine Learning", "Biometrics", "KAN", "ECG"],
            image: "",
          },
          {
            id: "tl-apm-2024",
            year: "2024",
            type: "work",
            title: "Business Systems Analyst · Platform Engineer",
            org: "APM Terminals · Maersk",
            description: "Part of APM Terminals' global OT & Analytics organisation. Led MVP development and scale-up of Compass — a global container-operations platform replacing local Power BI dashboards, rolled out across nearly all APM terminals worldwide.",
            tags: ["Platform Engineering", "OT Analytics", "Azure", "Maersk", "Compass"],
            image: "",
          },
          {
            id: "tl-taliware-lead-2023",
            year: "2023",
            type: "work",
            title: "Project Lead Developer",
            org: "Taliware Inc.",
            description: "Led the Cordoba L2C developer platform — shipped the public product, SDK and dev tooling. Stewarded vision for Cordoba L2, a US-patented biometric-identity Layer-2 blockchain for device-level digital provenance and copyright authentication.",
            tags: ["Blockchain", "SDK", "Developer Platform", "Biometrics", "Leadership"],
            image: "",
          },
          {
            id: "tl-taliware-intern-2023",
            year: "2023",
            type: "work",
            title: "Backend & Blockchain Engineer Intern",
            org: "Taliware Inc.",
            description: "Built core APIs for Cordoba L2 in .NET / C# WebAPI; designed an asset-issuance API for on-chain, biometrically-verifiable digital assets.",
            tags: [".NET", "C#", "Blockchain", "API Design"],
            image: "",
          },
          {
            id: "tl-netcomdayz-2023",
            year: "2023",
            type: "award",
            title: "NetComDayz — Organiser",
            org: "ENSA Tangier",
            description: "Hosted the Tangier edition of NetComDayz with the ENSA Networks & Telecom department club.",
            tags: ["Community", "Networking", "Organiser"],
            image: "",
          },
          {
            id: "tl-lel-fellow-2022",
            year: "2022",
            type: "award",
            title: "LEL Fellow — Entrepreneurship & Leadership",
            org: "AFCD Foundation × U.S. Embassy Morocco",
            description: "Selected fellow in the AFCD Foundation and U.S. Embassy Morocco entrepreneurship and leadership programme.",
            tags: ["Leadership", "Entrepreneurship", "Fellowship"],
            image: "",
          },
          {
            id: "tl-skaddosh-2022",
            year: "2022",
            type: "project",
            title: "Co-founded Skaddosh.ink",
            org: "Skaddosh",
            description: "Creative-work recognition platform with native Kudos currency and portfolio pages for writers and creators. Started with a four-student team as ProblemSolvers, now skaddosh.",
            tags: ["SaaS", "Platform", "Portfolio", "Creative"],
            image: "",
          },
          {
            id: "tl-freelance-2021",
            year: "2021",
            type: "work",
            title: "Freelance Cloud Consultant & Full-stack Developer",
            org: "Independent",
            description: "Cloud-infrastructure setup, M365 training and migrations for Moroccan startups. Reference engagement with Futureroc (Morocco World News). Built end-to-end fleet-tracking for Astrolabe Technologies and a luxury social-networking app for Spahbox.",
            tags: ["Cloud", "Azure", "Full-stack", "Consulting", "Startups"],
            image: "",
          },
          {
            id: "tl-nasa-2021",
            year: "2021",
            type: "award",
            title: "NASA Space Apps — Global Finalist",
            org: "NASA",
            description: "Team Climate Hackers — Top 30 worldwide from thousands of teams; local winner, Tangier.",
            tags: ["NASA", "Space Apps", "Climate", "Global Finalist", "Top 30"],
            image: "",
          },
          {
            id: "tl-engineering-2018",
            year: "2018",
            type: "academic",
            title: "Engineering Degree · Networks & Telecommunications",
            org: "ENSA Tangier · Abdelmalek Essaâdi University",
            description: "Five-year engineering programme. Modules: Linux & systems, signal & image processing, networks & cybersecurity (CCNA), OpenStack & cloud, satellite & fiber optics. Graduated with honors.",
            tags: ["Telecom", "Networks", "CCNA", "Cloud", "Signal Processing", "Honors"],
            image: "",
          },
          {
            id: "tl-nasa-2019",
            year: "2019",
            type: "award",
            title: "NASA Space Apps — Global Nominee",
            org: "NASA",
            description: "Tangier local winner and NASA Global Nominee.",
            tags: ["NASA", "Space Apps", "Hackathon"],
            image: "",
          },
        ],
        hobbies: [
          { id: "hobby-running", emoji: "R", title: "Running", description: "Long-distance runs for focus and thinking away from the screen." },
          { id: "hobby-swimming", emoji: "S", title: "Swimming & Football", description: "Ocean swims, pool laps, and playing football." },
          { id: "hobby-photography", emoji: "P", title: "Photography & Filmmaking", description: "Documenting the ordinary — street photography and short visual stories." },
          { id: "hobby-astronomy", emoji: "A", title: "Astronomy & Space Science", description: "History of science, celestial mechanics, and space exploration." },
          { id: "hobby-theater", emoji: "T", title: "Theater & Music", description: "Attending performances, appreciating live art and music." },
          { id: "hobby-hiking", emoji: "H", title: "Hiking", description: "Exploring trails and the Moroccan landscape with a camera in hand." },
        ],
        highlighting: { workIds: [], projectIds: [], galleryIds: [] },
      },
      inbox: [
        {
          id: "msg-oussama-access",
          kind: "access_request",
          createdAt: demoDate(2).getTime(),
          read: false,
          subject: "Engineering collaboration",
          from: {
            name: "Demo Recruiter",
            email: "recruiter@example.com",
            company: "Tech Company",
          },
          body: "Your background in ML, cloud infrastructure, and full-stack delivery is exactly what we are looking for. Are you open to a short conversation?",
          meta: { source: "seed" },
        },
        {
          id: "msg-oussama-hello",
          kind: "contact",
          createdAt: demoDate(6).getTime(),
          read: true,
          subject: "Compass platform",
          from: {
            name: "Curious Reader",
            email: "reader@example.com",
          },
          body: "Impressive scope on the APM Terminals work — scaling an OT analytics platform globally is no small thing. Great portfolio.",
        },
      ],
};

const DEMO_PORTFOLIOS: PortfolioSeed[] = [
  {
    id: "portfolio_al_hishu",
    userId: "user_al_hishu",
    username: "al-hishu",
    displayName: "محمد الهيشو",
    prompt: "كاتب مغربي يجمع القصة، الرمز، والذاكرة المتوسطية في صفحة عامة واحدة.",
    published: true,
    theme: "ember",
    metadata: portfolioMetadata({
      accentColor: "#b45309",
      themePreset: "ember",
      firstName: "محمد",
      lastName: "الهيشو",
      initials: "MH",
      tagline: "كاتب مغربي يستكشف الهوية والانتماء والحياة بين ضفتي المتوسط.",
      location: "Tangier, Morocco",
      email: "mohammed@alhishu.com",
      projectNoun: "Literary",
      researchField: "Narrative identity",
    }),
  },
  {
    id: "portfolio_nora_vale",
    userId: "user_nora_vale",
    username: "nora-vale",
    displayName: "Nora Vale",
    prompt: "Product strategy, calm systems, research notes, and essays for thoughtful software teams.",
    published: true,
    theme: "forest",
    metadata: portfolioMetadata({
      accentColor: "#2f6f5e",
      themePreset: "forest",
      firstName: "Nora",
      lastName: "Vale",
      initials: "NV",
      tagline: "I help teams turn noisy product questions into calmer systems, useful writing, and shipped work.",
      location: "Lisbon, Portugal",
      email: "nora.vale@example.com",
      github: "https://github.com/noravale",
      linkedin: "https://linkedin.com/in/noravale",
      instagram: "https://instagram.com/noravale",
      projectNoun: "Signal",
      researchField: "Calm software",
      customDomain: "portfolio.nora.example.com",
      customDomainRequested: true,
    }),
  },
  {
    id: "portfolio_omar_haddad",
    userId: "user_omar_haddad",
    username: "omar-haddad",
    displayName: "Omar Haddad",
    prompt: "Frontend engineering, design systems, visual diaries, and quietly durable interfaces.",
    published: true,
    theme: "ocean",
    metadata: portfolioMetadata({
      accentColor: "#0f766e",
      themePreset: "ocean",
      firstName: "Omar",
      lastName: "Haddad",
      initials: "OH",
      tagline: "Frontend engineer building crisp product surfaces, documentation systems, and tools that survive real teams.",
      location: "Casablanca, Morocco",
      email: "omar.haddad@example.com",
      github: "https://github.com/omarhaddad",
      linkedin: "https://linkedin.com/in/omarhaddad",
      projectNoun: "Interface",
      researchField: "Design systems",
      customDomain: "omar.example.dev",
      customDomainRequested: true,
    }),
  },
  {
    id: "portfolio_laila_mansouri",
    userId: "user_laila_mansouri",
    username: "laila-mansouri",
    displayName: "Laila Mansouri",
    prompt: "Research design, city memory, archive interfaces, and visual field notes.",
    published: true,
    theme: "skaddosh",
    metadata: portfolioMetadata({
      accentColor: "#b45309",
      themePreset: "skaddosh",
      firstName: "Laila",
      lastName: "Mansouri",
      initials: "LM",
      tagline: "I document cities as living archives and design interfaces that make memory easier to revisit.",
      location: "Rabat, Morocco",
      email: "laila.mansouri@example.com",
      linkedin: "https://linkedin.com/in/lailamansouri",
      instagram: "https://instagram.com/lailamansouri",
      projectNoun: "Archive",
      researchField: "Urban memory",
    }),
  },
  {
    id: "portfolio_sam_rivera",
    userId: "user_sam_rivera",
    username: "sam-rivera",
    displayName: "Sam Rivera",
    prompt: "Poems, translation fragments, editorial projects, and travel notebooks.",
    published: true,
    theme: "ink",
    metadata: portfolioMetadata({
      accentColor: "#2563eb",
      themePreset: "ink",
      firstName: "Sam",
      lastName: "Rivera",
      initials: "SR",
      tagline: "Poet and translator building small bridges between languages, cities, and the quiet parts of travel.",
      location: "Madrid, Spain",
      email: "sam.rivera@example.com",
      instagram: "https://instagram.com/samrivera",
      projectNoun: "Translation",
      researchField: "Bilingual poetics",
    }),
  },
  {
    id: "portfolio_mina_park",
    userId: "user_mina_park",
    username: "mina-park",
    displayName: "Mina Park",
    prompt: "Independent publishing, speculative short fiction, and editorial systems.",
    published: true,
    theme: "ember",
    metadata: portfolioMetadata({
      accentColor: "#9333ea",
      themePreset: "ember",
      firstName: "Mina",
      lastName: "Park",
      initials: "MP",
      tagline: "Publisher and fiction editor shaping small magazines, strange stories, and generous reading rooms.",
      location: "Seoul, Korea",
      email: "mina.park@example.com",
      github: "https://github.com/minapark",
      linkedin: "https://linkedin.com/in/minapark",
      projectNoun: "Publishing",
      researchField: "Editorial systems",
      customDomain: "mina.example.pub",
      customDomainRequested: true,
    }),
  },
  {
    id: "portfolio_yanis_benali",
    userId: "user_yanis_benali",
    username: "yanis-benali",
    displayName: "Yanis Benali",
    prompt: "Scripts, satire, family folklore, and project notes from the edge of bureaucracy.",
    published: true,
    theme: "skaddosh",
    metadata: portfolioMetadata({
      accentColor: "#dc2626",
      themePreset: "skaddosh",
      firstName: "Yanis",
      lastName: "Benali",
      initials: "YB",
      tagline: "Screenwriter testing drafts, jokes, and civic absurdities in a public portfolio.",
      location: "Paris, France",
      email: "yanis.benali@example.com",
      projectNoun: "Script",
      researchField: "Satirical writing",
    }),
  },
];

const DEMO_BILLING: Array<typeof billingSubscriptions.$inferInsert> = [];

const DEMO_ANALYTICS = DEMO_PORTFOLIOS.flatMap((portfolio, portfolioIndex) =>
  Array.from({ length: portfolio.published ? 28 : 4 }, (_, eventIndex) => {
    const isClick = eventIndex % 4 === 0;
    return {
      id: `analytics_${portfolio.id}_${eventIndex + 1}`,
      portfolioProfileId: portfolio.id,
      eventType: isClick ? "click" : "view",
      eventName: isClick ? pick(["contact_email_click", "portfolio_search_result", "article_open", "domain_open"], eventIndex) : "portfolio_page_view",
      path: isClick
        ? `/portfolio/${portfolio.username}${eventIndex % 8 === 0 ? "#contact" : ""}`
        : `/portfolio/${portfolio.username}`,
      visitorId: `visitor_${portfolioIndex}_${eventIndex % 9}`,
      referrer: eventIndex % 3 === 0 ? "https://skaddosh/read" : null,
      metadata: isClick ? { seeded: true, demoIndex: eventIndex } : { seeded: true },
      createdAt: demoDate((eventIndex % 26) + portfolioIndex),
    };
  }),
);

async function insertDemoUsers() {
  for (const demoUser of DEMO_USERS) {
    const inserted = await db
      .insert(user)
      .values({
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        emailVerified: true,
        role: demoUser.role,
        username: demoUser.username,
        bio: demoUser.bio,
        website: demoUser.website ?? null,
        location: demoUser.location ?? null,
        onboardingCompleted: true,
        kudosBalance: demoUser.kudosBalance ?? 75,
        createdAt: demoDate(120),
        updatedAt: demoDate(1),
      })
      .onConflictDoNothing()
      .returning({ id: user.id });

    if (inserted.length === 0) continue;

    await db
      .insert(userSettings)
      .values({
        userId: demoUser.id,
        preferredLang: demoUser.username === "al-hishu" ? "ar" : "en",
        emailNotifications: true,
        marketingEmails: demoUser.role !== "reader",
        profilePublic: true,
        showKudosBalance: true,
        contentCategories: JSON.stringify(["fiction", "essay", "portfolio", "design"]),
        updatedAt: demoDate(1),
      })
      .onConflictDoNothing();
  }
}

async function insertDemoWorks() {
  for (const demoWork of DEMO_WORKS) {
    await db
      .insert(work)
      .values({
        id: demoWork.id,
        creatorId: demoWork.creatorId,
        type: demoWork.type,
        accentColor: demoWork.accentColor,
        image: demoWork.image ?? null,
        readingTime: demoWork.readingTime,
        published: demoWork.published,
        discoverable: true,
        kudosCount: countKudos(demoWork.id),
        commentsCount: countComments(demoWork.id),
        tagsJson: JSON.stringify(demoWork.tags),
        titleJson: JSON.stringify(demoWork.title),
        tagJson: JSON.stringify(demoWork.tag),
        summaryJson: JSON.stringify(demoWork.summary),
        bodyAr: demoWork.bodyAr,
        bodyEn: demoWork.bodyEn,
        bodyFr: demoWork.bodyFr,
        bodyEs: demoWork.bodyEs,
        createdAt: demoDate(90),
        updatedAt: demoDate(1),
      })
      .onConflictDoNothing();
  }
}

async function insertDemoEngagement() {
  for (const entry of DEMO_KUDOS) {
    await db.insert(kudos).values(entry).onConflictDoNothing();
  }

  for (const entry of DEMO_COMMENTS) {
    await db.insert(comment).values(entry).onConflictDoNothing();
  }
}

async function insertOwnerData() {
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(or(eq(user.email, OWNER_EMAIL), eq(user.username, OWNER_USERNAME)))
    .limit(1);

  let ownerId = existing[0]?.id;

  if (ownerId) {
    // A real account already exists under this username/email (e.g. created via
    // OAuth signup). Enrich its profile without touching auth-critical fields.
    await db
      .update(user)
      .set({
        name: OWNER_DISPLAY_NAME,
        bio: OWNER_PROMPT,
        location: "Tangier, Morocco",
        role: "creator",
        onboardingCompleted: true,
        updatedAt: demoDate(1),
      })
      .where(eq(user.id, ownerId));
  } else {
    const inserted = await db
      .insert(user)
      .values({
        id: OWNER_SEED_ID,
        name: OWNER_DISPLAY_NAME,
        email: OWNER_EMAIL,
        emailVerified: true,
        role: "creator",
        username: OWNER_USERNAME,
        bio: OWNER_PROMPT,
        location: "Tangier, Morocco",
        onboardingCompleted: true,
        kudosBalance: 100,
        createdAt: demoDate(120),
        updatedAt: demoDate(1),
      })
      .onConflictDoNothing()
      .returning({ id: user.id });

    ownerId = inserted[0]?.id ?? OWNER_SEED_ID;
  }

  await db
    .insert(userSettings)
    .values({
      userId: ownerId,
      preferredLang: "en",
      emailNotifications: true,
      marketingEmails: true,
      profilePublic: true,
      portfolioEnabled: true,
      showKudosBalance: true,
      contentCategories: JSON.stringify(["fiction", "essay", "portfolio", "design"]),
      updatedAt: demoDate(1),
    })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: {
        profilePublic: true,
        portfolioEnabled: true,
        updatedAt: demoDate(1),
      },
    });

  await db
    .insert(portfolioProfiles)
    .values({
      id: "portfolio_oussama_hichou",
      userId: ownerId,
      username: OWNER_USERNAME,
      displayName: OWNER_DISPLAY_NAME,
      prompt: OWNER_PROMPT,
      status: "published",
      published: true,
      theme: "ink",
      metadata: OWNER_PORTFOLIO_METADATA,
      createdAt: demoDate(45),
      updatedAt: demoDate(1),
    })
    .onConflictDoUpdate({
      target: portfolioProfiles.userId,
      set: {
        username: OWNER_USERNAME,
        displayName: OWNER_DISPLAY_NAME,
        prompt: OWNER_PROMPT,
        status: "published",
        published: true,
        theme: "ink",
        metadata: OWNER_PORTFOLIO_METADATA,
        updatedAt: demoDate(1),
      },
    });
}

async function insertDemoPortfolios() {
  for (const portfolio of DEMO_PORTFOLIOS) {
    await db
      .insert(portfolioProfiles)
      .values({
        id: portfolio.id,
        userId: portfolio.userId,
        username: portfolio.username,
        displayName: portfolio.displayName,
        prompt: portfolio.prompt,
        status: portfolio.published ? "published" : "draft",
        published: portfolio.published,
        theme: portfolio.theme,
        metadata: portfolio.metadata,
        createdAt: demoDate(45),
        updatedAt: demoDate(1),
      })
      .onConflictDoUpdate({
        target: portfolioProfiles.id,
        set: {
          username: portfolio.username,
          displayName: portfolio.displayName,
          prompt: portfolio.prompt,
          status: "published",
          published: true,
          theme: portfolio.theme,
          metadata: portfolio.metadata,
          updatedAt: demoDate(1),
        },
      });
  }

  for (const billing of DEMO_BILLING) {
    await db
      .insert(billingSubscriptions)
      .values({
        ...billing,
        createdAt: demoDate(36),
        updatedAt: demoDate(1),
      })
      .onConflictDoNothing();
  }

  for (const event of DEMO_ANALYTICS) {
    await db.insert(portfolioAnalyticsEvents).values(event).onConflictDoNothing();
  }
}

export async function runSeed() {
  console.log("[skaddosh] Preparing demo database seed...");
  console.log("[skaddosh] Existing demo rows are skipped, so repeated dev starts stay safe.");

  await insertDemoUsers();
  await insertOwnerData();
  await insertDemoWorks();
  await insertDemoEngagement();
  await insertDemoPortfolios();

  console.log(
    `[skaddosh] Demo seed ready: ${DEMO_USERS.length} users, ${DEMO_WORKS.length} works, ${DEMO_PORTFOLIOS.length} portfolios, ${DEMO_ANALYTICS.length} analytics events.`,
  );
}

// CLI entry point
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
