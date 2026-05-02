export default function ContactPage() {
  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-gray-500 mb-8">We'd love to hear from you — suggestions, bug reports, or partnership enquiries.</p>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Your Name</label>
            <input type="text" placeholder="John Doe"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input type="email" placeholder="john@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
            <select className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors">
              <option>Suggest a scholarship/job source</option>
              <option>Report a broken link</option>
              <option>Partnership enquiry</option>
              <option>Advertise with us</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
            <textarea rows={5} placeholder="Tell us more..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none" />
          </div>
          <a href="mailto:hello@naijaopportunities.live?subject=Contact from website"
            className="block w-full bg-green-700 text-white text-center font-semibold py-3 rounded-xl hover:bg-green-800 transition-colors text-sm">
            Send Message →
          </a>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">🐦</div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Twitter / X</div>
            <a href="https://x.com" target="_blank" className="text-xs text-green-700 hover:underline">@naijaopps</a>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
            <div className="text-2xl mb-2">📧</div>
            <div className="text-sm font-semibold text-gray-900 mb-1">Email</div>
            <a href="mailto:hello@naijaopportunities.live" className="text-xs text-green-700 hover:underline">hello@naijaopportunities.live</a>
          </div>
        </div>
      </div>
    </div>
  )
}