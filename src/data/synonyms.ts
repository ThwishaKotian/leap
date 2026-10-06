/**
 * Alias tables used to normalise free-text input and profile data.
 * Every alias is compared after normalizeKey() (lowercase, punctuation stripped),
 * so "M.Sc." and "msc" are written once as "m sc" / "msc" here.
 */

interface StreamDef {
  label: string
  aliases: string[]
  /** Streams close enough to offer as clearly labelled fallback matches. */
  related: string[]
}

/** Keyed by canonical stream id. Degree prefixes ("MS in", "M.Sc.", "Master of") are stripped before lookup. */
export const STREAMS: Record<string, StreamDef> = {
  'data-science': {
    label: 'Data Science',
    aliases: ['data science', 'ds', 'applied data science', 'data science and ai', 'data science and artificial intelligence'],
    related: ['business-analytics', 'computer-science'],
  },
  'computer-science': {
    label: 'Computer Science',
    aliases: [
      'computer science',
      'cs',
      'cse',
      'computer science and engineering',
      'computing',
      'software engineering',
      'informatics',
      'informatics computer science',
    ],
    related: ['data-science'],
  },
  mba: {
    label: 'MBA',
    aliases: ['mba', 'business administration', 'master of business administration'],
    related: ['business-analytics'],
  },
  'business-analytics': {
    label: 'Business Analytics',
    aliases: ['business analytics', 'msba', 'analytics', 'data analytics'],
    related: ['data-science', 'mba'],
  },
  'mechanical-engineering': {
    label: 'Mechanical Engineering',
    aliases: ['mechanical engineering', 'mechanical', 'mech'],
    related: [],
  },
}

/** Leading degree words removed from a stream before alias lookup. Longest first. */
export const DEGREE_PREFIXES = [
  'master of science in',
  'master of science',
  'master of engineering in',
  'master of mathematics in',
  'master of mathematics',
  'master of engineering',
  'masters in',
  'master s in',
  'masters of',
  'master in',
  'masters',
  'master s',
  'master',
  'ms in',
  'msc in',
  'm sc in',
  'm s in',
  'meng in',
  'mmath in',
  'm tech in',
  'mtech in',
  'ms',
  'msc',
  'm sc',
  'm s',
  'meng',
  'mmath',
  'm tech',
  'mtech',
]

export const COUNTRIES: Record<string, { label: string; aliases: string[] }> = {
  germany: { label: 'Germany', aliases: ['germany', 'deutschland', 'de'] },
  'united-states': {
    label: 'United States',
    aliases: ['united states', 'united states of america', 'usa', 'us', 'u s a', 'u s', 'america'],
  },
  'united-kingdom': {
    label: 'United Kingdom',
    aliases: ['united kingdom', 'uk', 'u k', 'great britain', 'britain', 'england', 'scotland'],
  },
  canada: { label: 'Canada', aliases: ['canada', 'ca'] },
  ireland: { label: 'Ireland', aliases: ['ireland', 'republic of ireland', 'ie'] },
  india: { label: 'India', aliases: ['india', 'in', 'bharat'] },
}

/** Candidate home cities. `country` lets two different cities still score as "same country". */
export const CITIES: Record<string, { label: string; country: string; aliases: string[] }> = {
  bangalore: { label: 'Bangalore', country: 'india', aliases: ['bangalore', 'bengaluru', 'blr'] },
  mumbai: { label: 'Mumbai', country: 'india', aliases: ['mumbai', 'bombay', 'navi mumbai', 'thane'] },
  delhi: { label: 'Delhi', country: 'india', aliases: ['delhi', 'new delhi'] },
  gurgaon: { label: 'Gurgaon', country: 'india', aliases: ['gurgaon', 'gurugram'] },
  noida: { label: 'Noida', country: 'india', aliases: ['noida', 'greater noida'] },
  hyderabad: { label: 'Hyderabad', country: 'india', aliases: ['hyderabad', 'secunderabad'] },
  pune: { label: 'Pune', country: 'india', aliases: ['pune', 'pimpri chinchwad'] },
  chennai: { label: 'Chennai', country: 'india', aliases: ['chennai', 'madras'] },
  kolkata: { label: 'Kolkata', country: 'india', aliases: ['kolkata', 'calcutta'] },
  ahmedabad: { label: 'Ahmedabad', country: 'india', aliases: ['ahmedabad', 'amdavad'] },
  kochi: { label: 'Kochi', country: 'india', aliases: ['kochi', 'cochin', 'ernakulam'] },
  jaipur: { label: 'Jaipur', country: 'india', aliases: ['jaipur'] },
  lucknow: { label: 'Lucknow', country: 'india', aliases: ['lucknow'] },
}

/** Industries sharing a group count as related (half credit). */
export const INDUSTRIES: Record<string, { label: string; groups: string[]; aliases: string[] }> = {
  software: {
    label: 'Software',
    groups: ['tech'],
    aliases: ['software', 'software development', 'saas', 'internet', 'computer software'],
  },
  'it-services': {
    label: 'IT Services',
    groups: ['tech'],
    aliases: ['it services', 'it services and it consulting', 'it consulting', 'information technology'],
  },
  fintech: { label: 'Fintech', groups: ['tech', 'finance'], aliases: ['fintech', 'payments', 'insurtech'] },
  banking: {
    label: 'Banking & Financial Services',
    groups: ['finance'],
    aliases: ['banking', 'financial services', 'investment banking', 'bfsi', 'banking and financial services'],
  },
  consulting: {
    label: 'Consulting',
    groups: ['business'],
    aliases: ['consulting', 'management consulting', 'strategy consulting'],
  },
  'e-commerce': {
    label: 'E-commerce',
    groups: ['tech', 'retail'],
    aliases: ['e commerce', 'ecommerce', 'online retail', 'retail'],
  },
  edtech: { label: 'Edtech', groups: ['tech'], aliases: ['edtech', 'education technology', 'e learning'] },
  telecom: { label: 'Telecom', groups: ['tech'], aliases: ['telecom', 'telecommunications'] },
  healthcare: {
    label: 'Healthcare',
    groups: ['health'],
    aliases: ['healthcare', 'hospitals', 'pharma', 'pharmaceuticals'],
  },
  healthtech: { label: 'Healthtech', groups: ['tech', 'health'], aliases: ['healthtech', 'health tech', 'medtech'] },
  manufacturing: {
    label: 'Manufacturing',
    groups: ['engineering'],
    aliases: ['manufacturing', 'industrial machinery', 'heavy engineering'],
  },
  automotive: { label: 'Automotive', groups: ['engineering'], aliases: ['automotive', 'auto', 'automobile'] },
  energy: { label: 'Energy', groups: ['engineering'], aliases: ['energy', 'oil and gas', 'renewables'] },
  fmcg: {
    label: 'FMCG',
    groups: ['business', 'retail'],
    aliases: ['fmcg', 'cpg', 'consumer goods', 'consumer packaged goods'],
  },
  marketing: {
    label: 'Marketing & Advertising',
    groups: ['business'],
    aliases: ['marketing', 'advertising', 'digital marketing', 'marketing and advertising', 'ad tech'],
  },
}

/** Keyed by display label. Unknown skills fall back to their own normalised text. */
export const SKILL_ALIASES: Record<string, string[]> = {
  Python: ['python', 'python3', 'py'],
  SQL: ['sql', 'mysql', 'postgresql', 'postgres', 't sql', 'pl sql'],
  R: ['r', 'r programming'],
  Excel: ['excel', 'ms excel', 'advanced excel', 'microsoft excel'],
  Tableau: ['tableau'],
  'Power BI': ['power bi', 'powerbi'],
  Statistics: ['statistics', 'stats', 'statistical analysis'],
  'Machine Learning': ['machine learning', 'ml'],
  'Deep Learning': ['deep learning', 'dl', 'neural networks'],
  NLP: ['nlp', 'natural language processing'],
  Spark: ['spark', 'pyspark', 'apache spark'],
  dbt: ['dbt'],
  AWS: ['aws', 'amazon web services'],
  Docker: ['docker'],
  Kubernetes: ['kubernetes', 'k8s'],
  Java: ['java'],
  'Spring Boot': ['spring boot', 'springboot', 'spring'],
  Microservices: ['microservices', 'microservice architecture'],
  React: ['react', 'reactjs', 'react js'],
  JavaScript: ['javascript', 'js', 'es6'],
  TypeScript: ['typescript', 'ts'],
  'Node.js': ['node js', 'nodejs', 'node'],
  Go: ['go', 'golang'],
  'C++': ['c++', 'cpp'],
  Linux: ['linux'],
  Django: ['django'],
  'Data Structures & Algorithms': ['data structures algorithms', 'data structures and algorithms', 'dsa', 'algorithms'],
  'A/B Testing': ['a b testing', 'ab testing', 'experimentation'],
  'Google Analytics': ['google analytics', 'ga4'],
  'Financial Modelling': ['financial modelling', 'financial modeling'],
  Valuation: ['valuation'],
  Accounting: ['accounting'],
  Strategy: ['strategy', 'business strategy', 'corporate strategy'],
  'Market Research': ['market research'],
  'Stakeholder Management': ['stakeholder management'],
  'Product Management': ['product management'],
  'Brand Management': ['brand management'],
  CAD: ['cad', 'autocad', 'solidworks', 'catia'],
  FEA: ['fea', 'finite element analysis', 'ansys'],
  CFD: ['cfd', 'computational fluid dynamics'],
  MATLAB: ['matlab'],
  'Lean Manufacturing': ['lean manufacturing', 'lean'],
  'Six Sigma': ['six sigma'],
}

/** Keyed by display label. */
export const EXTRACURRICULAR_ALIASES: Record<string, string[]> = {
  Kaggle: ['kaggle', 'kaggle competitions'],
  Hackathons: ['hackathons', 'hackathon'],
  Toastmasters: ['toastmasters', 'public speaking'],
  Volunteering: ['volunteering', 'nss volunteering', 'ngo volunteering', 'social work'],
  'Open source': ['open source', 'open source contributions', 'oss'],
  'Tech blogging': ['tech blogging', 'technical blogging', 'blogging'],
  'Competitive programming': ['competitive programming', 'competitive coding', 'cp'],
  'College fest organiser': ['college fest organiser', 'college fest organizer', 'fest organiser', 'event management'],
  'Case competitions': ['case competitions', 'case competition'],
  Debate: ['debate', 'debating'],
  Quizzing: ['quizzing', 'quiz', 'quiz club'],
  'Robotics club': ['robotics club', 'robotics'],
  'Formula Student': ['formula student', 'fsae', 'sae baja', 'baja'],
  'Startup / side project': ['startup side project', 'side project', 'startup'],
  'Content creation': ['content creation', 'youtube', 'social media'],
  Music: ['music', 'classical music', 'singing', 'band'],
  Dance: ['dance', 'classical dance', 'bhangra'],
  Theatre: ['theatre', 'theater', 'drama'],
  Cricket: ['cricket'],
  Chess: ['chess'],
  Golf: ['golf'],
  Running: ['running', 'marathon'],
  Trekking: ['trekking', 'hiking'],
}
