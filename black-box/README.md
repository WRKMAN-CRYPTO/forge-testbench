# WRKMAN BLACK BOX

**Read-only Solana wallet incident reconstruction.**

When crypto disappears, the hardest first question is often not recovery. It is: **what actually happened?**

BLACK BOX takes a public Solana address and reconstructs recent on-chain evidence into an incident timeline.

## What it looks for

- Fee-only activity
- Wallet-signed value outflow
- SPL token delegate approvals and revocations
- Delegate-authorized token outflow where the wallet itself did not sign
- SPL token authority changes
- System account reassignment
- Token-account closure and burns
- Small SOL gas top-ups followed by suspicious outbound activity
- A likely "first domino" in the selected history window

## Safety model

BLACK BOX is deliberately walletless:

- No wallet connection
- No signatures
- No custody
- No seed phrases or private keys
- Public Solana RPC reads only

Never paste secret material into this or any other wallet-forensics page.

## Epistemic rule

The classifier separates **what the chain proves** from inference.

A valid signature proves that the private key authorized a transaction. It does **not** prove who physically held the key, whether the owner intended the transaction, or whether the signature was obtained through deception.

## Data

The prototype uses Solana JSON-RPC:

- \`getSignaturesForAddress\`
- \`getTransaction\` with \`jsonParsed\`
- outer and inner parsed instructions
- pre/post SOL balances
- pre/post token balances
- signer metadata

## Limits

Public RPC endpoints may rate-limit deeper scans. \`jsonParsed\` cannot decode every custom program. Relevant causal events may be older than the selected history window. Token-2022 extensions and custom programs can create behavior that this prototype does not yet understand.

When evidence is incomplete, BLACK BOX should say **inconclusive**, not invent a cause.

---

**WRKMAN**  
*Clock In. Find the Failure.*
