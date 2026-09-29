# WRKMAN BLACK BOX

Read-only Solana wallet incident reconstruction.

## Problem

When funds disappear, users often cannot tell whether they paid fees, signed a malicious transaction, left a token delegate active, changed an authority, or had a signing key compromised. The chain contains pieces of the answer, but transaction explorers are optimized for inspection one transaction at a time rather than causal reconstruction.

## Approach

BLACK BOX accepts only a public Solana address. It uses `getSignaturesForAddress` and `getTransaction` with `jsonParsed` encoding to reconstruct a recent timeline, including inner instructions, SOL changes, token balance changes, signer status, delegates, revocations, authority changes, burns, closes, and network fees.

The classifier intentionally separates **what the chain proves** from inference. A valid wallet signature proves the key authorized the transaction, but it does not prove whether the owner intended it, was tricked, or whether another party controlled the key.

## Current classifiers

- Fee-only activity
- Wallet-signed value outflow
- Token delegate approvals/revocations
- Delegate-authorized token outflow without the wallet signing
- System account reassignment
- SPL token authority changes
- Token account closure and burns
- Small SOL gas top-up followed by rapid outflow
- Basic address-poisoning lookalike heuristic

## Safety model

- No wallet connection
- No signatures
- No custody
- No secret material
- Public RPC reads only

Never paste a seed phrase or private key into this or any other wallet-forensics page.

## Limits

Public RPC endpoints may rate-limit deeper scans. `jsonParsed` cannot decode every custom program. Some causal instructions may be older than the selected history depth. Token-2022 extensions can create authority behavior that differs from classic SPL Token. BLACK BOX should report uncertainty rather than inventing a cause.