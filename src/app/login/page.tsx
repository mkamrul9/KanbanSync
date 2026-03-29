// src/app/login/page.tsx
import { loginWithGithub, loginWithGoogle } from '../../actions/authActions';

export default function LoginPage() {
    return (
        <div className="min-h-screen app-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full app-surface border border-slate-200/70 p-10 rounded-3xl shadow-xl anim-panel-in">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-cyan-700 mb-4">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="3" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                            <rect x="14" y="3" width="7" height="5" rx="1.5" fill="currentColor" />
                            <rect x="14" y="12" width="7" height="9" rx="1.5" fill="currentColor" opacity="0.9" />
                            <rect x="3" y="16" width="7" height="5" rx="1.5" fill="currentColor" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Welcome to KanbanSync
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Sign in to access boards, tasks, timelines, and team collaboration.
                    </p>
                </div>

                <div className="space-y-3.5">
                    <form action={loginWithGithub}>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                        >
                            {/* Simple GitHub SVG */}
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                            </svg>
                            Continue with GitHub
                        </button>
                    </form>

                    <form action={loginWithGoogle}>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            {/* Simple Google SVG */}
                            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">Secure OAuth login · no password stored by KanbanSync</p>
            </div>
        </div>
    );
}