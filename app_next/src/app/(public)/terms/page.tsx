import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Tank Battle',
  description: 'Terms of Service for Tank Battle multiplayer game.',
  robots: { index: true, follow: true },
}

export default function TermsOfServicePage() {
  return (
    <div className="landing-container">
      <div className="landing-background" />
      <Link href="/" className="back-button">BACK</Link>
      <div className="legal-page">
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: March 27, 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account or using Tank Battle, you agree to be bound by these
            Terms of Service. If you do not agree to these terms, you must not use our
            service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Tank Battle is a multiplayer online game platform that provides real-time tank
            battles, user profiles, friend management, private messaging, leaderboards,
            and a public API for developers.
          </p>
        </section>

        <section>
          <h2>3. User Accounts</h2>
          <ul>
            <li>You must provide a valid email address and create a unique username to register.</li>
            <li>You are responsible for maintaining the confidentiality of your password.</li>
            <li>You may not share your account credentials with others.</li>
            <li>Only one active session per account is permitted at a time.</li>
            <li>You must be at least 13 years old to create an account.</li>
            <li>You may not impersonate another person or create accounts for others.</li>
          </ul>
        </section>

        <section>
          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose.</li>
            <li>Harass, threaten, or abuse other users through the chat system or any other means.</li>
            <li>Attempt to gain unauthorized access to other accounts or the platform infrastructure.</li>
            <li>Use automated scripts, bots, or exploits to gain unfair advantages in gameplay.</li>
            <li>Interfere with or disrupt the service or servers.</li>
            <li>Upload malicious content or viruses.</li>
            <li>Spam or flood the chat system with unwanted messages.</li>
          </ul>
        </section>

        <section>
          <h2>5. User Content</h2>
          <p>
            You retain ownership of content you create, including messages, profile
            information, and game-related data. By using our service, you grant us a
            license to store, display, and transmit your content as necessary to provide
            the service. You are solely responsible for the content you share.
          </p>
        </section>

        <section>
          <h2>6. Game Rules</h2>
          <ul>
            <li>Matches are played in real-time with 2, 3, or 4 players.</li>
            <li>Each match has a time limit. The player with the highest score wins.</li>
            <li>Unsportsmanlike behavior, including intentional disconnections to avoid losses, is prohibited.</li>
            <li>The leaderboard reflects cumulative performance across all matches played.</li>
          </ul>
        </section>

        <section>
          <h2>7. API Usage</h2>
          <p>
            If you use our public API, you agree to:
          </p>
          <ul>
            <li>Use API keys only for their intended purpose.</li>
            <li>Respect rate limits (100 requests per minute per API key).</li>
            <li>Not attempt to bypass authentication or security measures.</li>
            <li>Not redistribute API data without permission.</li>
          </ul>
        </section>

        <section>
          <h2>8. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at our discretion
            if you violate these terms. Upon termination, your access to the service will
            cease immediately. You may also delete your account by contacting support.
          </p>
        </section>

        <section>
          <h2>9. Limitation of Liability</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for any damages arising from your use of the service, including but not
            limited to loss of data, game progress, or interruption of service.
          </p>
        </section>

        <section>
          <h2>10. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the
            service after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2>11. Governing Law</h2>
          <p>
            These terms are governed by applicable local laws. Any disputes arising from
            these terms or the use of the service shall be resolved in the appropriate
            jurisdiction.
          </p>
        </section>

        <section>
          <h2>12. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us through
            the application support channels.
          </p>
        </section>
      </div>
    </div>
  )
}
