# Krutanic Mail

An advanced, high-volume email marketing application designed for targeted campaigns with automated SMTP rotation, dynamic templating (spintax), and real-time open/click tracking.

## Features

- **SMTP Pool Rotation:** Add multiple Gmail/Custom SMTP accounts with daily limits. The system automatically rotates through healthy accounts to distribute sending volume evenly and avoid rate limits.
- **Dynamic Templates (Spintax):** Define arrays of Subjects, Greetings, Body Paragraphs, and Signatures. The engine randomly selects combinations for each recipient to create highly unique emails, reducing spam filtering.
- **Campaign Management:** Group imported leads into specific campaigns. View stats and launch targeted sends exclusively to leads within an active campaign.
- **Audience Import:** Drag-and-drop CSV uploads or copy/paste raw text containing email addresses. The system automatically extracts valid emails and removes duplicates.
- **Real-time Tracking:** Invisible tracking pixels and dynamic redirect URLs measure absolute open rates and click rates for campaigns.
- **Interactive Dashboard:** Premium dark-themed React SPA displaying live metrics, delivery logs, charts (via Recharts), and system health.

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Email Engine:** Nodemailer
- **Frontend:** React.js, Vite (assuming standard Vite React setup), Recharts, Lucide React (Icons)
- **Styling:** Custom CSS with Glassmorphism / Dark Theme UI

## Prerequisites

- Node.js (v18+)
- MongoDB (Local instance or Atlas URI)
- Cloudflare Tunnel (optional, `cloudflared` for tracking webhooks if running locally)

## Installation & Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone <repo-url>
   cd email_marketing
   \`\`\`

2. **Backend Setup:**
   \`\`\`bash
   npm install
   \`\`\`
   - Create a `.env` file in the root directory:
     \`\`\`env
     PORT=3000
     MONGO_URI=mongodb://127.0.0.1:27017/krutanic_mail
     // Add TRACKING_BASE_URL if hosting, e.g., https://yourdomain.com
     \`\`\`

3. **Frontend Setup:**
   \`\`\`bash
   cd client
   npm install
   \`\`\`

## Running the Application

**Development Mode:**

1. **Start the backend server:**
   \`\`\`bash
   npm run dev
   \`\`\`
   _Runs on `http://localhost:3000`_

2. **Start the frontend application:**
   \`\`\`bash
   cd client
   npm run dev
   \`\`\`
   _Usually runs on `http://localhost:5173`_

3. *(Optional)* **Start a Cloudflare Tunnel** for local email tracking:
   \`\`\`bash
   npx cloudflared tunnel --url http://127.0.0.1:3000
   \`\`\`
   _Update `TRACKING_BASE_URL` in `.env` with the generated URL for real-world tracking tests._

## Usage Guide

1. **Settings / SMTP:** Go to the SMTP tab. Add App Passwords from Gmail accounts and specify their daily limits. Enable accounts for the sending pool.
2. **Templates:** Go to the Template tab. Import arrays of subjects, greetings, etc., to power your dynamic email content.
3. **Leads:** Go to the Leads tab or Overview. Import a CSV or paste a block of text. Select or create a Campaign Name (e.g., "Tech Leads 2026") before importing.
4. **Sending:** Select your active campaign from the top dropdown. Click **"Launch Campaign"**. The backend will process the batch asynchronously through the SMTP pool.
5. **Analytics:** View total sent, open rates, and click rates on the Overview tab relative to the active campaign.

## License

Private/Proprietary Project. Do not distribute without permission.
