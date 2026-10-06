/**
 * SYNTHETIC DATA. Fictional students standing in for a real LinkedIn lookup,
 * which isn't possible without scraping (against LinkedIn's terms) or a paid enrichment API.
 * Each URL maps to one profile; the URL handles are invented and end in "demo".
 */
import type { DemoProfile, StudentProfile } from '../types'

export const DEMO_PROFILES: DemoProfile[] = [
  {
    linkedinUrl: 'https://www.linkedin.com/in/riya-deshpande-demo',
    profile: {
      name: 'Riya Deshpande',
      headline: 'Data Analyst at a Bangalore fintech',
      skills: ['Python', 'SQL', 'Tableau', 'Machine Learning', 'Statistics', 'Excel'],
      industry: 'Fintech',
      yearsExp: 3,
      city: 'Bangalore',
      extracurriculars: ['Kaggle', 'Hackathons', 'Toastmasters'],
    },
    suggestedSearch: { stream: 'MS in Data Science', country: 'Germany', city: 'Bangalore' },
  },
  {
    linkedinUrl: 'https://www.linkedin.com/in/tejas-rao-demo',
    profile: {
      name: 'Tejas Rao',
      headline: 'Software Engineer at a Hyderabad product company',
      skills: ['Java', 'Spring Boot', 'React', 'AWS', 'SQL', 'Data Structures & Algorithms'],
      industry: 'Software',
      yearsExp: 2,
      city: 'Hyderabad',
      extracurriculars: ['Open source', 'Hackathons', 'Competitive programming'],
    },
    suggestedSearch: { stream: 'MS in Computer Science', country: 'United States', city: 'Hyderabad' },
  },
  {
    linkedinUrl: 'https://www.linkedin.com/in/nisha-fernandes-demo',
    profile: {
      name: 'Nisha Fernandes',
      headline: 'Senior Consultant at a Mumbai management consultancy',
      skills: ['Financial Modelling', 'Stakeholder Management', 'Excel', 'Market Research', 'Strategy'],
      industry: 'Consulting',
      yearsExp: 5,
      city: 'Mumbai',
      extracurriculars: ['Case competitions', 'Debate', 'Volunteering'],
    },
    suggestedSearch: { stream: 'MBA', country: 'United Kingdom', city: 'Mumbai' },
  },
  {
    linkedinUrl: 'https://www.linkedin.com/in/megha-arora-demo',
    profile: {
      name: 'Megha Arora',
      headline: 'Marketing Analyst at a Delhi e-commerce startup',
      skills: ['Excel', 'SQL', 'Google Analytics', 'Power BI', 'Python'],
      industry: 'E-commerce',
      yearsExp: 1,
      city: 'Delhi',
      extracurriculars: ['College fest organiser', 'Debate', 'Content creation'],
    },
    suggestedSearch: { stream: 'MSc Business Analytics', country: 'Ireland', city: 'Delhi' },
  },
  {
    // Only 2 exact matches exist for this search: demonstrates the "limited matches" state.
    linkedinUrl: 'https://www.linkedin.com/in/aniket-jadhav-demo',
    profile: {
      name: 'Aniket Jadhav',
      headline: 'Design Engineer at a Pune automotive company',
      skills: ['CAD', 'FEA', 'MATLAB', 'Lean Manufacturing'],
      industry: 'Automotive',
      yearsExp: 2,
      city: 'Pune',
      extracurriculars: ['Formula Student', 'Robotics club'],
    },
    suggestedSearch: { stream: 'MS in Mechanical Engineering', country: 'Germany', city: 'Pune' },
  },
]

/** The LinkedIn handle from a profile URL, e.g. ".../in/Riya-Deshpande-Demo/?utm=x" → "riya-deshpande-demo". */
export function linkedinHandle(url: string): string | undefined {
  const match = url.trim().match(/linkedin\.com\/in\/([^/?#\s]+)/i)
  if (!match) return undefined
  try {
    return decodeURIComponent(match[1]).toLowerCase()
  } catch {
    return match[1].toLowerCase()
  }
}

export function findDemoProfile(url: string): StudentProfile | undefined {
  const handle = linkedinHandle(url)
  if (!handle) return undefined
  return DEMO_PROFILES.find((demo) => linkedinHandle(demo.linkedinUrl) === handle)?.profile
}
