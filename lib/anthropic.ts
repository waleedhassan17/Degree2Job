import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ParsedProfile, Job, JobMatch } from "./types";
import { safeJsonFromText, scoreToVerdict } from "./utils";

export const GEMINI_MODEL = "gemini-2.5-flash";

let client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!client) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

// Keep Anthropic export for backward compatibility
export function getAnthropic() {
  throw new Error("Anthropic has been replaced with Gemini. Use getGemini() instead.");
}

function textFromResponse(response: { text: () => string }): string {
  return response.text();
}

const RESUME_SYSTEM =
  "You are a resume parser. Extract information and return ONLY valid JSON with no markdown, no explanation. JSON shape: { name, email, phone, degree, university, graduationYear, skills, experienceYears, preferredRole, preferredCity, experienceLevel, summary }";

export async function parseResume(rawText: string): Promise<ParsedProfile> {
  const gemini = getGemini();
  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: RESUME_SYSTEM,
  });
  const response = await model.generateContent(
    `Parse this resume:\n\n${rawText.slice(0, 12000)}`
  );

  const parsed = safeJsonFromText<Partial<ParsedProfile>>(
    textFromResponse(response.response)
  );
  if (!parsed) {
    throw new Error("Could not parse resume into a profile");
  }

  // Normalize / guard against missing fields.
  return {
    name: parsed.name || "Candidate",
    email: parsed.email,
    phone: parsed.phone,
    degree: parsed.degree || "Not specified",
    university: parsed.university || "Not specified",
    graduationYear: parsed.graduationYear,
    skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 30) : [],
    experienceYears:
      typeof parsed.experienceYears === "number" ? parsed.experienceYears : 0,
    preferredRole: parsed.preferredRole || "Software Engineer",
    preferredCity: parsed.preferredCity || "Lahore",
    experienceLevel:
      parsed.experienceLevel === "junior" ||
      parsed.experienceLevel === "mid" ||
      parsed.experienceLevel === "senior"
        ? parsed.experienceLevel
        : "fresher",
    summary: parsed.summary || "",
  };
}

const MATCH_SYSTEM =
  "You are a job-resume matcher. Return ONLY valid JSON. No markdown.";

export async function matchJob(
  profile: ParsedProfile,
  job: Pick<Job, "title" | "company" | "requirements" | "description">
): Promise<Omit<JobMatch, "jobId">> {
  const gemini = getGemini();
  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: MATCH_SYSTEM,
  });
  const user = `Candidate profile: ${JSON.stringify(profile)}\n\nJob: Title: ${
    job.title
  }\nCompany: ${job.company}\nRequirements: ${(job.requirements || []).join(
    ", "
  )}\nDescription: ${(job.description || "").slice(0, 800)}\n\nReturn JSON: { score: 0-100, verdict: excellent|good|fair|poor, matchReasons: string[3 max], missingSkills: string[3 max], highlight: string }`;

  const response = await model.generateContent(user);
  const parsed = safeJsonFromText<Partial<JobMatch>>(
    textFromResponse(response.response)
  );
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed?.score ?? 0))));

  return {
    score,
    verdict: parsed?.verdict ?? scoreToVerdict(score),
    matchReasons: Array.isArray(parsed?.matchReasons)
      ? parsed!.matchReasons.slice(0, 3)
      : [],
    missingSkills: Array.isArray(parsed?.missingSkills)
      ? parsed!.missingSkills.slice(0, 3)
      : [],
    highlight: parsed?.highlight ?? "",
  };
}

export const COVER_LETTER_SYSTEM =
  "You are an expert career coach writing cover letters for Pakistani university students. Write professionally but authentically. Never generic.";

export function buildCoverLetterPrompt(
  profile: ParsedProfile,
  job: Pick<Job, "title" | "company" | "description">
): string {
  return `Write a cover letter.\n\nStudent: ${profile.name}, ${
    profile.degree
  } from ${profile.university}, skills: ${profile.skills.join(
    ", "
  )}\n\nApplying for: ${job.title} at ${
    job.company
  }\n\nJob description: ${(job.description || "").slice(
    0,
    600
  )}\n\nInstructions: 3 paragraphs max. First: genuine interest + relevant qualification. Second: specific skill match with 1-2 concrete examples. Third: strong close. Formal but warm. Pakistani context.`;
}
