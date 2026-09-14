# Fixtures

- `sink-under-cabinet.jpg`: Ray's kitchen sink, texted to the Twilio number on 2026-09-13. Shows the double-sink drain assembly and P-trap with no visible leak. Sonnet's first read: is_plumbing true, job_type unknown, confidence 0.3, "I don't see any leaking or damage". Useful precisely because it is ambiguous: the agent has to combine the caller's words with the photo.
- `sink-under-cabinet.analysis.json`: the stored vision result for that photo, as returned by the get_photo_analysis tool. Eval cases feed this as the simulated tool result.
