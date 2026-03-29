import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Tank Battle',
  description: 'Privacy Policy for Tank Battle multiplayer game.',
  robots: { index: true, follow: true },
}

export default function PrivacyPolicyPage() {
  return (
    <div className="landing-container">
      <div className="landing-background" />
      <Link href="/" className="back-button">BACK</Link>
      <div className="legal-page">
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: March 27, 2026</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            Tank Battle (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Tank Battle multiplayer
            game platform. This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our service.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul>
            <li><strong>Account Information:</strong> Username, email address, and password (stored hashed) when you create an account.</li>
            <li><strong>Profile Data:</strong> Avatar image, tank name, and tank color preferences.</li>
            <li><strong>Game Data:</strong> Match history, scores, wins, losses, and leaderboard rankings.</li>
            <li><strong>Communication Data:</strong> Private messages sent through our chat system.</li>
            <li><strong>Connection Data:</strong> Online status and last seen timestamps.</li>
            <li><strong>API Usage Data:</strong> API key activity logs if you use our public API.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To create and manage your account.</li>
            <li>To provide real-time multiplayer gameplay and matchmaking.</li>
            <li>To display your profile and game statistics on leaderboards.</li>
            <li>To enable private messaging between users.</li>
            <li>To manage friend lists and friend requests.</li>
            <li>To send notifications about game events and social interactions.</li>
            <li>To maintain platform security and prevent abuse.</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>
          <p>
            Your data is stored in a PostgreSQL database on our secure servers. Passwords are
            hashed using bcrypt before storage. We use HTTPS encryption for all communications
            and API key authentication for external access. Session management uses JSON Web
            Tokens (JWT) with secure, short-lived credentials.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. Your
            profile information (username, avatar, game stats) is visible to other users as
            part of the multiplayer experience. Private messages are only accessible to the
            sender and recipient.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <ul>
            <li>You can update your profile information at any time through your account settings.</li>
            <li>You can sign out of your account, which sets your status to offline.</li>
            <li>You can manage your friend list and block unwanted interactions.</li>
          </ul>
        </section>

        <section>
          <h2>7. Cookies and Tracking</h2>
          <p>
            We use session cookies solely for authentication purposes. These cookies are
            necessary for the functioning of the application and are not used for tracking
            or advertising purposes.
          </p>
        </section>

        <section>
          <h2>8. Children&apos;s Privacy</h2>
          <p>
            Our service is not directed to individuals under the age of 13. We do not
            knowingly collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify users of any
            material changes by updating the &quot;Last updated&quot; date at the top of this page.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through
            the application support channels.
          </p>
        </section>
      </div>
    </div>
  )
}
