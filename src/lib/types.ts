export type UserRole =
  | "student"
  | "phd"
  | "pm"
  | "researcher";

export const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  phd: "PhD candidate",
  pm: "Product manager",
  researcher: "Researcher",
};

export type Session = {
  name: string;
  email: string;
  createdAt: number;
  onboarded: boolean;
  interests?: string[];
  role?: UserRole;
};

export type Paper = {
  id: string;
  title: string;
  filename: string;
  uploadedAt: number;
  pageCount: number;
  fullText: string;
  chunks: string[];
  // AI analysis (optional — populated after analyzePaper runs)
  tags?: string[];
  relevanceScore?: number; // 0–100
  excerpt?: string;
  /**
   * Keywords extracted from the paper that match the user's research
   * topic/context. Lowercased, short phrases — designed to be fed into a
   * keyword index or hybrid RAG retriever later on.
   */
  keywords?: string[];
  analyzing?: boolean;
  sourceUrl?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};
