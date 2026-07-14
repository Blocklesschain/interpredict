import { BackHomeButton } from '@/components/back-home-button'

export default function PrivacyPolicyPage() {
  // String definitions to protect the JSX compiler from raw syntax interpretation issues
  const logNamespace = "interpredict_logs_${walletAddress.toLowerCase()}";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="glass rounded-[2rem] border border-border bg-white/90 p-10 shadow-2xl dark:bg-[#120025]/90">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent">
              Privacy Policy
            </p>
            <h1 className="mt-4 text-4xl font-heading font-bold tracking-tight text-foreground sm:text-5xl">
              InterPredict Data Practices
            </h1>
          </div>

          <div className="mb-8">
            <BackHomeButton />
          </div>

          <section className="space-y-8 text-base leading-8 text-muted-foreground">
            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">1. Zero Personally Identifiable Information (PII) Collection</h2>
              <p className="mt-4">
                Because InterPredict is a non-custodial Web3 application, the protocol collects zero PII. We do not maintain traditional centralized databases, and we never collect, store, or transmit your name, email address, physical location, IP address, or private key coordinates. Your identity is strictly represented by your public Interlink wallet address.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">2. Browser LocalStorage Log Persistence</h2>
              <p className="mt-4">
                To provide a continuous user experience without introducing centralized databases, InterPredict uses your browser's local sandbox memory:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-2 text-sm pl-4">
                <li>
                  <strong>Wallet Mapping:</strong> Transaction success logs are written directly to your browser's local memory under the namespace: <code>{logNamespace}</code>.
                </li>
                <li>
                  <strong>Local Isolation:</strong> This data remains isolated entirely in your browser cache. It is never transmitted to, stored on, or shared with external servers, tracking services, or team-operated endpoints.
                </li>
                <li>
                  <strong>Session Clearing:</strong> Disconnecting your Web3 wallet immediately clears active logs from the active user interface, preserving client-side privacy.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">3. On-Chain Transparency & Public Ledgers</h2>
              <p className="mt-4">
                By interacting with our smart contracts, you acknowledge that all platform transactions are public-by-design. Your public wallet address, proposed market descriptions, curation votes, and share wagers are permanently recorded on the public Interlink L1 ledger. This public metadata is necessary to maintain an auditable, trustless, and fair forecasting venue.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">4. Localized Language Selections</h2>
              <p className="mt-4">
                The interface utilizes the browser's <code>localStorage</code> to store your selected application language preference (<code>interpredict_lang</code>). This preference is stored locally on your device to ensure the platform loads in your preferred language upon return.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-foreground font-mono">5. Third-Party Tracker Disclosures</h2>
              <p className="mt-4">
                Our interface is free from third-party advertising cookie configurations, promotional tracking pixels, and centralized analytic script integrations. We do not sell or monetize your session parameters or trading footprints.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}