const UNSUPPORTED_TOOLS = ["Collibra", "BigID", "TrustArc", "Securiti", "OneTrust Privacy Management"];

export function factCheck(letter: string, profileText: string): string[] {
  const issues: string[] = [];
  const profile = profileText.toLowerCase();
  if (/current role/i.test(letter)) issues.push('The letter says "current role". He left MullenLowe in July 2026.');
  if (/\bi am a (qualified )?(solicitor|lawyer)\b/i.test(letter)) {
    issues.push("The letter claims he is a solicitor or lawyer.");
  }
  if (/fellow of information privacy/i.test(letter) && !/pending|application|awaiting|in progress/i.test(letter)) {
    issues.push("The letter treats Fellow of Information Privacy as granted. The application is still pending.");
  }
  for (const tool of UNSUPPORTED_TOOLS) {
    if (letter.toLowerCase().includes(tool.toLowerCase()) && !profile.includes(tool.toLowerCase())) {
      issues.push(`Mentions ${tool}, which is not in his documents.`);
    }
  }
  if (/\bfluent in\b/i.test(letter) && !/fluent in english/i.test(letter)) {
    issues.push("Claims a language that is not in his documents.");
  }
  const employers = ["Google", "Meta", "Amazon", "Deloitte", "PwC", "KPMG"];
  for (const employer of employers) {
    const claim = new RegExp(`\\b(at|for|with) ${employer}\\b`, "i");
    if (claim.test(letter) && !profile.includes(employer.toLowerCase())) {
      issues.push(`Mentions ${employer}, which is not an employer in his documents.`);
    }
  }
  return issues;
}
