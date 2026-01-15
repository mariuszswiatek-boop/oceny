import { redirect } from "next/navigation"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { writeFileSync } from "fs"
import { join } from "path"

export default async function Home() {
  // #region agent log
  try { const logPath = join(process.cwd(), '.cursor', 'debug.log'); writeFileSync(logPath, JSON.stringify({location:'app/page.tsx:5',message:'Home page called, calling auth()',data:{timestamp:Date.now()},sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n', {flag:'a'}); } catch(e){console.error('LOG ERROR:',e);}
  // #endregion
  
  let session;
  try {
    session = await auth()
    // #region agent log
    try { const logPath = join(process.cwd(), '.cursor', 'debug.log'); writeFileSync(logPath, JSON.stringify({location:'app/page.tsx:10',message:'auth() completed',data:{hasSession:!!session,timestamp:Date.now()},sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n', {flag:'a'}); } catch(e){console.error('LOG ERROR:',e);}
    // #endregion
  } catch (error: any) {
    // #region agent log
    try { const logPath = join(process.cwd(), '.cursor', 'debug.log'); writeFileSync(logPath, JSON.stringify({location:'app/page.tsx:14',message:'auth() error',data:{error:error?.message,stack:error?.stack?.substring(0,500),timestamp:Date.now()},sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n', {flag:'a'}); } catch(e){console.error('LOG ERROR:',e);}
    // #endregion
    console.error('AUTH ERROR:', error);
    throw error;
  }

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
