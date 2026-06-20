'use client'

import { useState } from 'react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'Suggest a scholarship/job source', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) return
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setStatus('success')
        setForm({ name: '', email: '', subject: 'Suggest a scholarship/job source', message: '' })
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>Contact Us</h1>
      <p className="mb-8 text-sm" style={{ color: 'var(--muted-text)' }}>We'd love to hear from you — suggestions, bug reports, or partnership enquiries.</p>

      <div className="space-y-4">
        <div className="card border border-gray-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Your Name</label>
            <input type="text" placeholder="John Doe" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Email Address</label>
            <input type="email" placeholder="john@example.com" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Subject</label>
            <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors">
              <option>Suggest a scholarship/job source</option>
              <option>Report a broken link</option>
              <option>Partnership enquiry</option>
              <option>Advertise with us</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Message</label>
            <textarea rows={5} placeholder="Tell us more..." value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none" />
          </div>

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
              ✅ Message sent! We'll get back to you soon.
            </div>
          )}
          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              ❌ Something went wrong. Please try again or email us directly.
            </div>
          )}

          <button onClick={handleSubmit} disabled={status === 'loading'}
            className="block w-full bg-green-700 text-white text-center font-semibold py-3 rounded-xl hover:bg-green-800 transition-colors text-sm disabled:opacity-60">
            {status === 'loading' ? 'Sending...' : 'Send Message →'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">🐦</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Twitter / X</div>
            <a href="https://x.com/naijaopps" target="_blank" className="text-xs text-green-700 hover:underline">@naijaopps</a>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">📧</div>
            <div className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Email</div>
            <a href="mailto:ogverse17@gmail.com" className="text-xs text-green-700 hover:underline">ogverse17@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  )
}
