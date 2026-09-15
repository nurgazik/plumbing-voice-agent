# Fixtures

- `sink-under-cabinet.jpg`: Ray's kitchen sink, texted to the Twilio number on 2026-09-13. Shows the double-sink drain assembly and P-trap with no visible leak. Sonnet's first read: is_plumbing true, job_type unknown, confidence 0.3, "I don't see any leaking or damage". Useful precisely because it is ambiguous: the agent has to combine the caller's words with the photo.
- `sink-under-cabinet.analysis.json`: the stored vision result for that photo, as returned by the get_photo_analysis tool. Eval cases feed this as the simulated tool result.
- `p-trap-leak.analysis.json`: synthetic, written by hand on 2026-09-14 in the same shape the tool returns. A confident read (p_trap_leak, 0.85) so evals can grade the "photo findings used in the next turn" beat against a clear finding as well as the ambiguous real one. No photo file behind it.
- `supply-line-leak.analysis.json`: the stored vision result from Ray's second real call, 2026-09-15 (photo of the under-sink shutoff valves and copper supply lines with a towel and pooled water). supply_line_leak at 0.72. Used by the re-triage cases: a supply-side leak is the fact the caller's words could not give.
