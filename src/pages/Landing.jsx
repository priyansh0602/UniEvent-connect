// src/pages/Landing.jsx

import { Link } from 'react-router-dom'
import { GraduationCap, BarChart3, Globe, CheckCircle, ArrowRight, ShieldCheck, Crown } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-50 selection:bg-amber-500/30">

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-800/50">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2.5 rounded-xl shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
            <GraduationCap className="text-zinc-950 w-6 h-6" />
          </div>
          <span className="text-xl md:text-2xl font-black text-white tracking-tight">UniEvent <span className="text-zinc-500 font-medium">Connect</span></span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-zinc-400 font-medium hover:text-white transition-colors hidden md:block text-sm uppercase tracking-wider">Features</a>
          <a href="#pricing" className="text-zinc-400 font-medium hover:text-white transition-colors hidden md:block text-sm uppercase tracking-wider">Membership</a>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2.5 text-zinc-300 font-bold hover:text-white hover:bg-zinc-800 rounded-xl transition-all text-sm">
              Sign In
            </Link>
            <Link to="/signup" className="px-5 py-2.5 bg-zinc-100 text-zinc-950 font-extrabold rounded-xl hover:bg-white hover:scale-105 transition-all shadow-xl text-sm">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative pt-32 pb-40 px-6 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-700/50 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest text-amber-400 mb-8 shadow-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            THE NEW STANDARD FOR CAMPUS IT
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white mt-4 mb-8 leading-[1.1] tracking-tighter drop-shadow-2xl">
            The OS for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">University Culture</span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            Unify your campus events, skyrocket student engagement, and get real-time analytics with a platform built for modern universities.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link to="/signup" className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 text-lg font-black rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              Join Us<ArrowRight className="w-5 h-5" />
            </Link>

            <Link to="/demo-select" className="w-full sm:w-auto px-10 py-4 bg-zinc-900 text-white border border-zinc-800 text-lg font-bold rounded-2xl shadow-xl hover:bg-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-center">
              Explore Demo Roles
            </Link>
          </div>

          <p className="mt-12 text-sm font-semibold text-zinc-600 uppercase tracking-widest">
            Trusted by Elite Educational Institutions
          </p>
        </div>
      </div>

      {/* FEATURES SECTION (Dual Theme Highlight) */}
      <div id="features" className="py-32 bg-zinc-900/50 border-y border-zinc-800/50 relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">One Platform. <span className="text-zinc-500">Two Experiences.</span></h2>
            <p className="text-zinc-400 mt-4 text-xl">Tailored portals providing exactly what each user needs.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">

            {/* Student Feature Card (Black/Gold) */}
            <div className="card-student group p-10 flex flex-col items-start">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                <Crown className="text-zinc-950 w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-white">Student Portal</h3>
              <p className="text-zinc-400 text-lg leading-relaxed mb-6">A premium black & gold interface where students discover campus happenings, register instantly, and track their participation history.</p>
              <ul className="space-y-3 mt-auto">
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Instant QR Ticketing</li>
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Personalized Feed</li>
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Clean, Ad-free UI</li>
              </ul>
            </div>

            {/* Admin Feature Card (Red/White Concept shown in Dark UI) */}
            <div className="card-admin group p-10 flex flex-col items-start">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-600/20 transition-colors" />
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform relative z-10">
                <ShieldCheck className="text-white w-8 h-8" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-white relative z-10">Admin Console</h3>
              <p className="text-zinc-400 text-lg leading-relaxed mb-6 relative z-10">A commanding red & white workspace for faculty and club leads. Publish events, architect custom forms, and analyze engagement.</p>
              <ul className="space-y-3 mt-auto relative z-10">
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-red-500 mr-3" /> Drag & Drop Form Builder</li>
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-red-500 mr-3" /> 1-Click Publishing</li>
                <li className="flex items-center text-zinc-300 font-medium"><CheckCircle className="w-5 h-5 text-red-500 mr-3" /> Live Submission Tables</li>
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id="pricing" className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Ready to Digitize Your Campus?</h2>
          <p className="text-zinc-400 mb-12 text-xl max-w-2xl mx-auto">
            Join the network of modern universities. Get your own dedicated admin dashboard and branded student portal today.
          </p>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 max-w-lg mx-auto shadow-2xl relative overflow-hidden group hover:border-amber-500/50 transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
            <div className="absolute -top-5 -right-5">
              <div className="bg-amber-500 text-zinc-950 text-xs font-black px-6 py-2 uppercase tracking-widest transform rotate-45 translate-y-8 translate-x-4 shadow-lg shadow-amber-500/30">
                All Inclusive
              </div>
            </div>

            <h3 className="text-2xl font-black text-white text-left mt-2">University License</h3>
            <div className="text-6xl font-black text-white my-6 text-left flex items-baseline gap-2">
              ₹99<span className="text-xl text-zinc-500 font-medium">/mo</span>
            </div>

            <div className="w-full h-px bg-zinc-800 my-8" />

            <ul className="text-left space-y-4 mb-10 text-zinc-300 font-medium">
              <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Unlimited Student Accounts</li>
              <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Unlimited Admin Seats</li>
              <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Infinite Form Submissions</li>
              <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> 24/7 Priority Support</li>
            </ul>
            <Link to="/signup" className="w-full block py-4 bg-zinc-100 text-zinc-950 text-lg font-black rounded-xl hover:bg-white transition-all text-center shadow-xl group-hover:scale-[1.02]">
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-12 border-t border-zinc-800 text-center flex flex-col items-center justify-center gap-4 bg-zinc-950">
        <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
          <GraduationCap className="text-amber-500 w-5 h-5" />
          <span className="text-lg font-bold text-white">UniEvent Connect</span>
        </div>
        <p className="text-zinc-600 text-sm font-medium">
          © 2026 UniEvent Connect B2B Systems. All rights reserved.
        </p>
      </footer>
    </div>
  )
}