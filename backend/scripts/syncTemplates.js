'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('../models/Template');
const templateEngine = require('../utils/templateEngine');
const logger = require('../utils/logger');

async function sync() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/email-system');
    console.log('Connected.');

    // We get the defaults from the file (which I just updated)
    // Actually, I can just import them or the engine's current state
    // But since the engine's refresh() might have already run with old data if called elsewhere,
    // I will explicitly use the hardcoded ones if I can, or just wait for the engine to load.
    
    const templates = {
      name: 'Default Template',
      subjects: [
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
      ],
      greetings: [
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
      ],
      body_paragraphs: [
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
      ],
      closings: [
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
      ],
      signatures: [
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
      ]
    };

    const mapItems = (arr) => arr.map(item => ({ content: item, enabled: true }));

    console.log('Saving templates to database...');
    await Template.findOneAndUpdate(
      { name: 'Default Template' },
      { 
        $set: {
          name: 'Default Template',
          subjects: mapItems(templates.subjects),
          greetings: mapItems(templates.greetings),
          body_paragraphs: mapItems(templates.body_paragraphs),
          closings: mapItems(templates.closings),
          signatures: mapItems(templates.signatures)
        }
      },
      { upsert: true, new: true }
    );
    console.log('Templates synced successfully!');

    // Trigger refresh in the engine if it's already instantiated
    // But in this standalone script, it's enough to disconnect
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

sync();
