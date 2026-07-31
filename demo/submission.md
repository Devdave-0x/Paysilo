# Submission checklist + X post draft

Submission per the hackathon page = a public X post with description, demo video,
public GitHub link, tagging @iEx_ec. Plus: joined the iExec Discord WTF channel,
and (since it's hosted on DoraHacks) submit the BUIDL there too.

## Checklist

- [ ] Joined iExec Discord, said hello in the WTF hackathon channel
- [ ] Registered as Hacker on the DoraHacks page
- [ ] PaySilo deployed on ETH Sepolia, source VERIFIED on Etherscan
- [ ] MockUSDC deployed, Safe created (1/1) on Sepolia, funded
- [ ] Full flow exercised live: Safe batch tx, recipient decrypt, denied third-party
      decrypt, auditor grant + decrypt
- [ ] Local test suite passing against the Docker Nox stack
- [ ] README + docs/SETUP.md accurate against the actual deployed addresses
- [ ] docs/feedback.md filled with REAL friction notes, versions, suggestions
- [ ] Demo video recorded, under 4:00, uploaded (YouTube unlisted or public)
- [ ] Repo public, license file present, no secrets in history, no .env committed
- [ ] X post published, @iEx_ec tagged
- [ ] BUIDL submitted on DoraHacks with the X post linked
- [ ] Claims-vs-code audit done (read every README claim against the code, per the
      standing rule that caught the Mantle draft error)

## X post draft (edit before posting)

---

Payroll on-chain doxxes everyone's salary. So teams keep it off-chain.

PaySilo fixes that: confidential payroll for any Gnosis Safe, built on @iEx_ec Nox.

One Safe tx pays the whole team. Total is public. Individual amounts are encrypted,
computed in Intel TDX TEEs, decryptable only by each recipient's own wallet.

Need compliance? Recipients grant an auditor view access to their own balance with
one tx. Selective disclosure, not surveillance.

Live on Sepolia, Safe unmodified, plain MetaMask, open source.

Demo: [VIDEO LINK]
Code: [REPO LINK]
Contract: [ETHERSCAN LINK]

Built for the WTF!! Hackathon Summer Edition #WTFHackathon

---

Notes:
- Keep the video link as a native upload or YouTube link so the preview embeds.
- Reply to your own post with the architecture diagram image for a second surface.
- After posting, drop the post link in the Discord channel.
