export type JobsLineInput = {
  id: string;
  title: string;
  location: string;
};

const BANNED = /error|sorry|unable|failed|as an ai|exception|undefined/i;

export function acceptJobsLine(text: string, count: number): boolean {
  const line = text.replace(/\s+/g, " ").trim();
  if (!line || line.length > 180) return false;
  if (!line.includes(String(count))) return false;
  if (BANNED.test(line)) return false;
  return true;
}

export function jobsFallbackLine(jobs: JobsLineInput[]): string {
  const count = jobs.length;
  if (count === 0) return "Nothing on the list just now.";
  const sense = roleSense(jobs);
  const role = count === 1 ? "role" : "roles";
  const lines = [
    `${count} ${role} here. ${sense}`,
    `${count} ${role} worth opening. ${sense}`,
    `There ${count === 1 ? "is" : "are"} ${count} ${role} today. ${sense}`,
    `${count} ${role} from the latest look. ${sense}`,
    `${count} ${role} waiting. ${sense}`,
    `The list has ${count} ${role}. ${sense}`,
    `${count} ${role} made it through. ${sense}`,
    `${count} ${role} to sit with. ${sense}`,
    `You have ${count} ${role} to look at. ${sense}`,
    `${count} ${role} on this page. ${sense}`,
  ];
  return lines[hashJobs(jobs) % lines.length];
}

function roleSense(jobs: JobsLineInput[]): string {
  const dpo = jobs.filter((job) => /data protection officer|\bDPO\b/i.test(job.title)).length;
  const privacy = jobs.filter((job) => /privacy manager|data privacy/i.test(job.title)).length;
  const head = jobs.filter((job) => /head of privacy|head of data/i.test(job.title)).length;
  const london = jobs.filter((job) => /london/i.test(job.location)).length;
  const remote = jobs.filter((job) => /remote/i.test(job.location)).length;
  if (jobs.length === 1) {
    const place = london ? " It is in London." : remote ? " It can be remote." : "";
    return `${jobs[0].title}.${place}`;
  }
  if (dpo === jobs.length) return "All of them are data protection officer roles.";
  if (dpo > 0 && privacy > 0) return "Data protection officers and privacy managers, side by side.";
  if (dpo > 0) return dpo === 1 ? "One of them is a data protection officer role." : `${dpo} of them are data protection officer roles.`;
  if (privacy > 0 && head > 0) return "Privacy managers, and a head of privacy among them.";
  if (london === jobs.length) return "Every one of them is in London.";
  if (london > jobs.length / 2) return "Most of them are in London.";
  if (remote > 0) return "Some of them can be done remotely.";
  return "A varied set of privacy roles.";
}

function hashJobs(jobs: JobsLineInput[]): number {
  const value = jobs.map((job) => `${job.id}|${job.title}`).join("\n");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}
