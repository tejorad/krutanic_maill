const Template = require('../models/Template');
const logger = require('./logger');

const SUBJECTS = [
  'Student Registration – Internship & Placement Opportunities 2026',
  'Important Update – Internship & Placement Registration Open',
  'Student Information Update for Internship & Placement Programs',
  'Registration Now Open – Internship & Placement Support 2026',
  'Student Career Opportunities – Registration Form Available',
  'Internship & Placement Assistance – Student Registration',
  'Update Your Details – Internship & Placement Programs 2026',
  'Student Opportunity Update – Internship & Placement Support',
  'Career Support Registration – Internship & Placement 2026',
  'Student Information Form – Internship & Placement Activities',
  'Internship & Placement Opportunity Update for Students',
  'Register Your Details – Internship & Placement Programs',
  'Student Career Registration – Internship & Placement 2026',
  'Important Student Update – Internship & Placement Support',
  'Student Opportunities Form – Internships & Placements',
  'Registration for Internship & Placement Assistance',
  'Student Career Support – Internship & Placement Registration',
  'Submit Your Details – Internship & Placement Opportunities',
  'Student Information Collection – Internship & Placement 2026',
  'Internship & Placement Programs – Student Registration'
];

const GREETINGS = [
  'Dear Student,',
  'Hello Student,',
  'Hi Student,',
  'Dear Learner,',
  'Greetings Student,',
  'Hello Future Professional,',
  'Dear Aspirant,',
  'Hi There Student,',
  'Dear Participant,',
  'Hello Future Leader,',
  'Dear Career Seeker,',
  'Hello Dear Student,',
  'Dear Campus Student,',
  'Hi Future Achiever,',
  'Dear Academic Participant,',
  'Hello Career Explorer,',
  'Dear Opportunity Seeker,',
  'Hi Ambitious Student,',
  'Dear Young Professional,',
  'Greetings Future Graduate,'
];

const BODY_PARAGRAPHS = [
  `This message is to inform you about the Adobe Internship, Training and Career Preparation Program 2026 conducted in collaboration with Krutanic. The program is designed with structured learning sessions, hands-on assignments, and guided project activities aimed at improving internship readiness and placement preparation.

Throughout the program, participants will take part in organized learning modules, complete evaluation-based tasks, and develop supervised projects that demonstrate practical skills. Attendance, assignment completion, and active participation will be monitored as part of the program guidelines. Completion records will be maintained for reference.

Students interested in participating should complete the registration through the Google Form link that will be shared separately. The last date to submit the registration form is 12 March 2026.

Apply Now : https://forms.gle/awPNSVweM79BvEfk6

Students who have already submitted their information earlier do not need to fill the form again.`,

  `We would like to notify you about the Adobe Internship, Training and Placement Support Program 2026 organized in association with Krutanic. The program includes guided training sessions, practical assignments, and project-based activities intended to help students prepare for internships and future placement opportunities.

During the program period, participants will attend structured learning sessions, complete assigned tasks, and work on supervised projects reflecting real-world applications. Attendance, assignment submissions, and participation will be considered as part of the program process. Program completion details will be recorded for documentation.

Students who wish to join the program must register through the Google Form link that will be provided separately. The final date for submitting the registration form is 12 March 2026.

Apply Now : https://forms.gle/awPNSVweM79BvEfk6

Students who have already submitted their details earlier are not required to submit the form again.`,

  `This email is to update you regarding the Adobe Internship, Training and Placement Preparation Initiative 2026 arranged in collaboration with Krutanic. The initiative includes scheduled training sessions, guided assignments, and project development activities aimed at strengthening internship exposure and placement readiness.

As part of the program, participants will go through organized learning modules, complete evaluation-based assignments, and build supervised projects demonstrating applied knowledge. Attendance records, assignment completion, and program engagement will be reviewed as part of the participation requirements. Completion records will be preserved for reference.

Students interested in enrolling should register using the Google Form link that will be shared separately. The deadline to submit the registration form is 12 March 2026.

Apply Now : https://forms.gle/awPNSVweM79BvEfk6

Students who have already provided their details previously do not need to complete the form again.`,

  `We are sharing information about the Adobe Internship, Training and Placement Readiness Program 2026 conducted together with Krutanic. The program framework includes planned training sessions, practical learning tasks, and guided project work designed to support internship exposure and placement preparation.

During the program timeline, students will participate in structured learning activities, complete assigned tasks, and work on supervised projects related to applied concepts. Attendance tracking, assignment submission, and overall engagement will be reviewed as part of the program process. Records of participation and completion will be maintained.

Students interested in participating should register through the Google Form link that will be shared separately. The last date for submitting the registration form is 12 March 2026.

Apply Now : https://forms.gle/awPNSVweM79BvEfk6

Students who have already submitted their details earlier do not need to register again.`,

  `This communication is to inform students about the Adobe Internship, Training and Placement Preparation Program 2026 organized in partnership with Krutanic. The program consists of scheduled training sessions, applied assignments, and guided project activities aimed at improving internship readiness and placement preparation.

Throughout the program, students will participate in organized learning modules, complete task-based evaluations, and work on supervised projects that demonstrate practical application of concepts. Attendance, assignment submissions, and participation will be reviewed as part of the program requirements. Completion records will be maintained for reference.

Students who would like to participate must register through the Google Form link that will be shared separately. The final date to submit the registration form is 12 March 2026.

Apply Now : https://forms.gle/awPNSVweM79BvEfk6

Students who have already submitted their details previously are not required to fill the form again.`
];

const CLOSINGS = [
  'Best regards,',
  'Kind regards,',
  'Warm regards,',
  'With best wishes,',
  'Thank you,',
  'Sincerely,',
  'Regards,',
  'All the best,',
  'Best wishes for your success,',
  'Wishing you the best,',
  'Looking forward to your response,',
  'With appreciation,',
  'Best wishes,',
  'Warm wishes,',
  'Thank you for your time,',
  'With regards,',
  'Stay motivated,',
  'Wishing you success in your journey,',
  'Best wishes for your career,',
  'Thank you and regards,'
];

const SIGNATURES = [
  'Program Coordination Team',
  'Student Support Team',
  'Internship & Placement Team',
  'Student Opportunity Desk',
  'Career Support Team',
  'Academic Coordination Team',
  'Student Development Cell',
  'Internship Program Team',
  'Placement Support Team',
  'Student Engagement Team',
  'Campus Opportunity Team',
  'Career Guidance Team',
  'Student Services Team',
  'Academic Support Desk',
  'Student Success Team',
  'Campus Coordination Team',
  'Opportunity Programs Team',
  'Student Affairs Team',
  'Education Support Team',
  'Program Management Team'
];

/**
 * Global cache of user templates
 */
const userTemplatesMap = new Map();

/**
 * Default structure if no template loaded
 */
const getDefaults = () => ({
  subjects: SUBJECTS,
  greetings: GREETINGS,
  body_paragraphs: BODY_PARAGRAPHS,
  closings: CLOSINGS,
  signatures: SIGNATURES,
  enabled: {
    subjects: true,
    greetings: true,
    body_paragraphs: true,
    closings: true,
    signatures: true,
  }
});

/**
 * Helper to pick a random item from an array
 */
function pickRandom(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Helper to replace {placeholder} with data
 */
function replacePlaceholders(str, data) {
  if (!str) return '';
  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Refresh template components from the database for ALL users or a specific user.
 */
async function refresh(userId = null) {
  try {
    const query = { name: 'Default Template' };
    if (userId) query.userId = userId;

    const templates = await Template.find(query);
    
    templates.forEach(template => {
      if (!template.userId) return; // Safety: skip legacy templates without a user
      const uId = template.userId.toString();
      const enabledMap = template.enabled ? Object.fromEntries(template.enabled) : {};
      
      const filterItems = (items) => {
        if (!items || !items.length) return null;
        return items.filter(item => item.enabled !== false).map(item => item.content);
      };

      userTemplatesMap.set(uId, {
        subjects: filterItems(template.subjects) || SUBJECTS,
        greetings: filterItems(template.greetings) || GREETINGS,
        body_paragraphs: filterItems(template.body_paragraphs) || BODY_PARAGRAPHS,
        closings: filterItems(template.closings) || CLOSINGS,
        signatures: filterItems(template.signatures) || SIGNATURES,
        enabled: {
          subjects:      enabledMap.subjects      !== false,
          greetings:     enabledMap.greetings     !== false,
          body_paragraphs: enabledMap.body_paragraphs !== false,
          closings:      enabledMap.closings      !== false,
          signatures:    enabledMap.signatures    !== false,
        }
      });
    });
    
    logger.info(`[templateEngine] Refreshed templates for ${templates.length} users.`);
  } catch (err) {
    logger.error(`[templateEngine] Refresh failed: ${err.message}`);
  }
}

/**
 * Generate a dynamic email payload for a specific user.
 */
function generate(userId, data = {}) {
  const uId = typeof userId === 'string' ? userId : userId?.toString();
  const currentTemplates = userTemplatesMap.get(uId) || getDefaults();

  const context = {
    name: data.name || 'Student',
    ctaUrl: data.ctaUrl || 'https://forms.gle/tePTM6fVj4rZdqC1A',
    ...data
  };

  const en = currentTemplates.enabled;

  const subject = replacePlaceholders(
    pickRandom(en.subjects ? currentTemplates.subjects : ['']), context
  );

  const parts = [
    en.greetings     ? replacePlaceholders(pickRandom(currentTemplates.greetings), context)     : null,
    '',
    en.body_paragraphs ? replacePlaceholders(pickRandom(currentTemplates.body_paragraphs), context) : null,
    '',
    en.closings      ? replacePlaceholders(pickRandom(currentTemplates.closings), context)      : null,
    en.signatures    ? replacePlaceholders(pickRandom(currentTemplates.signatures), context)    : null,
  ].filter(p => p !== null);

  return { subject, body: parts.join('\n') };
}

/**
 * Legacy render support
 */
function render(template, data = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    data[key] !== undefined ? String(data[key]) : ''
  );
}

module.exports = { generate, render, refresh, getDefaults };
