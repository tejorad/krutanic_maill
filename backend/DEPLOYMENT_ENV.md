# Vercel Deployment Environment Variables

Copy and paste these into your Vercel Dashboard under **Settings > Environment Variables**.

## 🖥️ Backend Variables (Server-side)

| Key | Value (Recommended) | Description |
| :--- | :--- | :--- |
| `MONGO_URI` | `mongodb+srv://tarun:tarunn@krutanic.10kcydn.mongodb.net/test?retryWrites=true&w=majority&appName=krutanic` | Your MongoDB Connection String |
| `JWT_SECRET` | `krutanic_mail_secure_secret_2024` | Create a strong random string for authentication |
| `NODE_ENV` | `production` | Tells Express to run in production mode |
| `REDIS_HOST` | `[YOUR_CLOUD_REDIS_HOST]` | Host from Upstash or other Cloud Redis |
| `REDIS_PORT` | `6379` | Port for Cloud Redis |
| `REDIS_PASSWORD` | `[YOUR_CLOUD_REDIS_PASSWORD]` | Password for Cloud Redis |
| `TRACKING_BASE_URL` | `https://krutanic-mail-kpsw.vercel.app` | Base URL for open/click tracking |
| `QUEUE_NAME` | `email-queue` | BullMQ queue name |
| `WORKER_CONCURRENCY` | `50` | Number of emails processed in parallel |
| `SMTP_MAX_RETRIES` | `3` | Number of times to retry failed emails |
| `LOG_LEVEL` | `info` | Logging verbosity (info, error, debug) |

---

## 🌐 Frontend Variables (Client-side)

> [!IMPORTANT]
> Frontend variables must start with `VITE_` for the React app to recognize them.

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://krutanic-mail-kpsw.vercel.app` | The URL where your backend is hosted |

---

### 📝 Next Steps:
1. **Cloud Redis**: Since Vercel is serverless, you cannot use `127.0.0.1`. Please ensure you have an account at [Upstash](https://upstash.com/) or similar to get your Redis credentials.
2. **Build**: After adding these, click **Redeploy** in Vercel to apply the changes.
