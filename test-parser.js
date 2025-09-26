// Simple test script to check resume parsing
const sampleResumeText = `
John Smith
Software Engineer
john.smith@email.com
+1 (555) 123-4567
San Francisco, CA

EXPERIENCE
Senior Software Engineer at Google
2020 - Present
• Led development of search algorithms
• Managed team of 5 developers
• Improved system performance by 40%

Software Engineer at Microsoft
2018 - 2020
• Developed web applications using React
• Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science
Stanford University
2014 - 2018
GPA: 3.8

SKILLS
JavaScript, Python, React, Node.js, AWS, Docker

INTERESTS
Rock climbing, Photography, Volunteer teaching
`;

// Test the parsing logic
console.log('Testing resume parsing with sample data...');
console.log('Sample text length:', sampleResumeText.length);
console.log('First 200 characters:', sampleResumeText.substring(0, 200));

// Test email extraction
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const emails = sampleResumeText.match(emailRegex) || [];
console.log('Found emails:', emails);

// Test phone extraction
const phoneRegex = /(\+?1?[\s-]?\(?[0-9]{3}\)?[\s-]?[0-9]{3}[\s-]?[0-9]{4})/g;
const phones = sampleResumeText.match(phoneRegex)?.map(p => p.trim()) || [];
console.log('Found phones:', phones);

// Test name extraction from first line
const lines = sampleResumeText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
console.log('First few lines:', lines.slice(0, 5));

// Test experience section detection
const experienceKeywords = ['EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'PROFESSIONAL EXPERIENCE'];
let foundExperienceSection = false;
for (let i = 0; i < lines.length; i++) {
  const upperLine = lines[i].toUpperCase();
  if (experienceKeywords.some(keyword => upperLine.includes(keyword))) {
    console.log('Found experience section at line', i, ':', lines[i]);
    foundExperienceSection = true;
    break;
  }
}

if (!foundExperienceSection) {
  console.log('No experience section found');
}

// Test job pattern matching
const jobPattern = /^(.+?)\s+(?:at|@)\s+(.+?)(?:\s*[\|,]\s*(.+))?$/i;
const datePattern = /(\d{4}|\w+\s+\d{4}|\d{1,2}\/\d{4})[\s-]+(?:to\s+)?(\d{4}|\w+\s+\d{4}|present|current|\d{1,2}\/\d{4})/i;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // More restrictive pattern matching
  if (jobPattern.test(line) && !datePattern.test(line) && !line.includes('@') &&
      (line.toLowerCase().includes(' at ') || line.includes('@')) &&
      !line.match(/^\d+/) && line.length > 10) {
    const match = line.match(jobPattern);
    console.log('Found job pattern at line', i, ':', {
      position: match[1]?.trim(),
      company: match[2]?.trim(),
      location: match[3]?.trim()
    });
  }
}