# Public compliance pages

Twilio A2P campaign registration requires publicly reachable privacy policy and terms
URLs. They live in the portfolio site repo, not here, because the brand registered with
Twilio is Ray personally and the domain should match the registrant.

- Privacy policy: https://www.nurgazy.com/dryrunplumbing/privacy (apex redirects to www)
  Source: `~/Developer/portfolio_site/src/app/(main)/dryrunplumbing/privacy/page.tsx`
- Terms and conditions: https://nurgazy.com/dryrunplumbing/terms
  Source: `~/Developer/portfolio_site/src/app/(main)/dryrunplumbing/terms/page.tsx`
- SMS opt-in: https://www.nurgazy.com/dryrunplumbing/sms
  Source: `~/Developer/portfolio_site/src/app/(main)/dryrunplumbing/sms/page.tsx`
  Carries the consent script verbatim. A2P vetting asked for a publicly reachable
  page showing where the opt-in call-to-action lives; the policy pages mention the
  SMS program but neither reads as one. Keep this page and
  `compliance.sms_consent_ask` in the rules file identical, word for word.

Both pages state, because the A2P reviewer checks for them specifically: mobile numbers
are never sold or shared with third parties for marketing, message frequency, "message
and data rates may apply", and STOP and HELP instructions.

If these URLs ever move, Twilio re-vets the campaign. Redirect the old paths rather than
replacing them.

Retention promised on the pages is 90 days. Nothing enforces that yet; a deletion job
belongs in the n8n layer once Supabase is live.
