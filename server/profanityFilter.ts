// Profanity filter for content moderation
// Uses a pattern-based approach with common profane words and their variations

const profanePatterns = [
  // Common explicit words and variations
  /\bf+u+c+k+\w*/gi,
  /\bs+h+[i1]+t+\w*/gi,
  /\bb+[i1]+t+c+h+\w*/gi,
  /\ba+s+s+(?:h+o+l+e+)?/gi,
  /\bd+[i1]+c+k+\w*/gi,
  /\bc+u+n+t+\w*/gi,
  /\bp+[i1]+s+s+\w*/gi,
  /\bd+a+m+n+\w*/gi,
  /\bh+e+l+l+\b/gi,
  /\bc+r+a+p+\w*/gi,
  /\bb+a+s+t+a+r+d+\w*/gi,
  /\bw+h+o+r+e+\w*/gi,
  /\bs+l+u+t+\w*/gi,
  
  // Slurs and hate speech (abbreviated patterns to avoid explicit content)
  /\bn+[i1]+g+(?:g+[ae3]+r?|a+h?)\w*/gi,
  /\bf+a+g+(?:g+[o0]+t+)?\w*/gi,
  /\br+e+t+a+r+d+\w*/gi,
  
  // Leetspeak variations
  /\b[s$]h[i1!]t\w*/gi,
  /\b[a@][$s][s$]\w*/gi,
  /\b[f][u][c][k]\w*/gi,
  
  // Threat patterns
  /\bk+[i1]+l+l+\s*(you|yourself|u|urself)/gi,
  /\b(go\s*)?d+[i1]+e+\b/gi,
  /\bsuicide\b/gi,
  /\bkill\s*myself/gi,
  
  // Sexual content
  /\bp+[o0]+r+n+\w*/gi,
  /\bs+e+x+y*\b/gi,
  /\bn+u+d+e+s?\b/gi,
  
  // Spam patterns
  /\b(buy|click|subscribe|follow)\s*(now|here|this)/gi,
  /(https?:\/\/[^\s]+){3,}/gi, // Multiple links
  /(.)\1{5,}/gi, // Character spam (aaaaaaa)
];

// Words that should trigger a warning but not block
const warningPatterns = [
  /\bidiot\w*/gi,
  /\bstupid\w*/gi,
  /\bdumb\w*/gi,
  /\bugly\w*/gi,
  /\bloser\w*/gi,
  /\bhate\s*(you|u)\b/gi,
];

export interface FilterResult {
  isClean: boolean;
  flagged: boolean;
  reason?: string;
  severity: 'clean' | 'warning' | 'blocked';
  filteredContent?: string;
}

export function checkProfanity(content: string): FilterResult {
  // Check for blocked content
  for (const pattern of profanePatterns) {
    if (pattern.test(content)) {
      return {
        isClean: false,
        flagged: true,
        reason: 'Contains prohibited content',
        severity: 'blocked',
      };
    }
  }
  
  // Check for warning-level content
  for (const pattern of warningPatterns) {
    if (pattern.test(content)) {
      return {
        isClean: true,
        flagged: true,
        reason: 'Contains potentially offensive content',
        severity: 'warning',
      };
    }
  }
  
  return {
    isClean: true,
    flagged: false,
    severity: 'clean',
  };
}

export function filterContent(content: string): string {
  let filtered = content;
  
  for (const pattern of profanePatterns) {
    filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
  }
  
  return filtered;
}

// Calculate a spam score based on content characteristics
export function getSpamScore(content: string): number {
  let score = 0;
  
  // Check for excessive caps
  const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (capsRatio > 0.7 && content.length > 10) score += 2;
  
  // Check for excessive repetition
  if (/(.)\1{4,}/.test(content)) score += 2;
  
  // Check for excessive punctuation
  if (/[!?]{3,}/.test(content)) score += 1;
  
  // Check for multiple links
  const linkCount = (content.match(/https?:\/\//g) || []).length;
  if (linkCount > 2) score += linkCount;
  
  // Check for common spam phrases
  if (/\b(free|win|winner|prize|claim|limited|urgent)\b/gi.test(content)) score += 1;
  
  return score;
}

export function isSpam(content: string): boolean {
  return getSpamScore(content) >= 3;
}
