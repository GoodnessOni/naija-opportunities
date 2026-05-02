export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">About NaijaOpportunities</h1>
      
      <div className="prose text-gray-600 space-y-6">
        <p className="text-lg">NaijaOpportunities is a free platform built by a Nigerian student, for Nigerian students and job seekers.</p>
        
        <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Our Mission</h2>
          <p>To make sure no Nigerian student misses a life-changing scholarship or job opportunity because they didn't know it existed. We aggregate opportunities from across the web and update them daily — completely free.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">What We Do</h2>
          <ul className="space-y-3">
            {[
              '📚 Aggregate scholarships for Nigerian and African students daily',
              '💼 List the latest job vacancies across Nigeria',
              '🤖 Partner with PathSync AI to help students find opportunities they qualify for',
              '🔄 Auto-update listings every 6 hours so you never miss a deadline',
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-gray-600">{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Built by a Nigerian Student</h2>
          <p>This platform was built by a Nigerian university student who got tired of missing scholarship deadlines and job opportunities scattered across the internet. If it helps even one student get a scholarship or land a job, it was worth building.</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Our Partner — PathSync AI</h2>
          <p className="mb-3">We partner with <a href="https://pathsync-ai.vercel.app" className="text-green-700 font-semibold hover:underline">PathSync AI</a> — an AI platform that analyses your profile and matches you to scholarships and jobs you actually qualify for, then writes your application letter automatically.</p>
          <a href="https://pathsync-ai.vercel.app" target="_blank" className="inline-block bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors">Try PathSync AI free →</a>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
          <p>Have a suggestion, found a broken link, or want to partner with us? <a href="/contact" className="text-green-700 hover:underline font-semibold">Get in touch →</a></p>
        </div>
      </div>
    </div>
  )
}