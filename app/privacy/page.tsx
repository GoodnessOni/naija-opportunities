export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-gray-600">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Who We Are</h2>
          <p>NaijaOpportunities (<strong>naijaopportunities.live</strong>) is a free platform that aggregates jobs and scholarships for Nigerian students and job seekers. We are based in Nigeria.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
          <p className="mb-3">We collect minimal information to operate this service:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><strong>Usage data:</strong> Pages visited, time spent, device type — collected anonymously via Google Analytics</li>
            <li><strong>Contact form:</strong> If you contact us, we collect your name and email address only</li>
            <li>We do NOT collect passwords, payment info, or sensitive personal data</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Information</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>To improve the platform and fix issues</li>
            <li>To respond to your messages</li>
            <li>To understand which opportunities are most useful to our users</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Advertising</h2>
          <p>We use <strong>Google AdSense</strong> to display advertisements. Google may use cookies to show relevant ads based on your browsing history. You can opt out at <a href="https://www.google.com/settings/ads" className="text-green-700 hover:underline">google.com/settings/ads</a>.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Third Party Links</h2>
          <p>Our platform links to external scholarship and job websites. We are not responsible for the privacy practices of those sites. Please read their privacy policies before submitting any personal information.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
          <p>We use cookies for analytics and advertising purposes. By using our site, you consent to our use of cookies. You can disable cookies in your browser settings.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Data Retention</h2>
          <p>We do not store personal data beyond what is necessary. Contact form submissions are deleted after 90 days.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
          <p>You have the right to request deletion of any personal data we hold about you. Contact us at the email below.</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
          <p>For privacy concerns: <a href="/contact" className="text-green-700 hover:underline font-semibold">Contact us here →</a></p>
        </div>
      </div>
    </div>
  )
}