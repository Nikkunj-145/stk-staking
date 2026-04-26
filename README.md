# 🟢 STK Staking — Green Belt

A two-contract DeFi mini-dApp on Stellar Soroban demonstrating **inter-contract calls**, real-time on-chain data, mobile-responsive UI, and a CI/CD pipeline.

> **Stellar Frontend Challenge — Level 4 (Green Belt) submission.**

---

## 🎯 What it does

Users connect a wallet, **stake** an SEP-41-style fungible token (`STK`) into a pool, earn **points** that accrue linearly per token-second, and **claim** or **unstake** any time. The staking contract performs **inter-contract calls** to the token contract's `transfer` function to actually move tokens in and out of the pool.

---

## 🚀 Live deployment (testnet)

| Contract        | Address |
| --------------- | ------- |
| **Token (STK)** | [`CBKQT6J6SFPSNJSK62U4OVVRT3U2UTKVHAKSBGH6SEA4SVV2A67RKQKR`](https://stellar.expert/explorer/testnet/contract/CBKQT6J6SFPSNJSK62U4OVVRT3U2UTKVHAKSBGH6SEA4SVV2A67RKQKR) |
| **Staking pool**| [`CAZIVT4MISKI5FNDGGJ6PO24DM73UTUQ6HTVWUPCG3QSTQ4ZBQGY3ONO`](https://stellar.expert/explorer/testnet/contract/CAZIVT4MISKI5FNDGGJ6PO24DM73UTUQ6HTVWUPCG3QSTQ4ZBQGY3ONO) |

Reward formula: `points = staked_amount × seconds_elapsed × 100 / 1e9`

---

## ✨ Features

- 🔗 **Inter-contract calls** — staking pool invokes token's `transfer` & `balance`
- 🪪 **Multi-wallet** via StellarWalletsKit (Freighter, xBull, Albedo, Lobstr, Hana)
- 📱 **Mobile responsive** — works edge-to-edge on phones
- ⏱️ **Live points ticker** — auto-refresh every 4 s while connected
- 🎚️ Stake / Unstake / Claim with **Max** quick-fill
- 🧮 Bigint-safe amount math (7-decimal token)
- 📊 4 live stats: wallet · staked · pending points · pool TVL
- 🛡️ **5 contract error variants** mapped to friendly UI:
  - `NotInitialized`, `AlreadyInitialized`, `NothingStaked`, `InsufficientStake`, `NegativeAmount`
- ✅ **13 unit tests** (5 token + 8 staking) all passing
- 🤖 **GitHub Actions CI** — runs `cargo test --workspace` + `npm run build` on every push

---

## 🧪 Tests

```bash
cargo test --workspace
```

```
running 5 tests (token)
test test::init_sets_metadata      ok
test test::mint_and_balance        ok
test test::transfer_moves_balance  ok
test test::transfer_insufficient_fails  ok
test test::negative_amount_rejected  ok
test result: ok. 5 passed

running 8 tests (staking)
test test::stake_locks_tokens_into_pool      ok
test test::unstake_returns_tokens            ok
test test::rewards_accrue_over_time          ok
test test::double_init_rejected              ok
test test::unstake_without_stake_fails       ok
test test::cannot_unstake_more_than_staked   ok
test test::negative_amount_rejected          ok
test test::claim_settles_pending_into_points ok
test result: ok. 8 passed
```

---

## 🧰 Tech stack

| Layer       | Tech |
| ----------- | ---- |
| Contracts   | Rust + `soroban-sdk` 22 (workspace, 2 members) |
| Frontend    | React 18 + Vite + TypeScript |
| Styling     | TailwindCSS (mobile-first) + Lucide |
| Wallets     | StellarWalletsKit |
| Stellar SDK | `@stellar/stellar-sdk` 13 |
| CI          | GitHub Actions (Rust + Node matrix) |

---

## 📁 Structure

```
green-belt/
├── contracts/
│   ├── token/           # SEP-41-style fungible token (5 tests)
│   └── staking/         # Pool with inter-contract calls (8 tests)
├── src/
│   ├── components/      # WalletBar, Stats, StakePanel
│   ├── lib/             # config, wallet, stellar (RPC), format
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/workflows/ci.yml
├── deployment.json
├── .env.example
└── README.md
```

---

## 🛠️ Setup

### Prerequisites
- Node 18+
- Rust + `wasm32v1-none` target
- Stellar CLI ≥22
- Wallet extension (Freighter recommended) on **testnet**

### Run
```bash
git clone https://github.com/Nikkunj-145/Greenbelt.git
cd Greenbelt
npm install
cp .env.example .env.local   # already pre-filled with deployed contracts
npm run dev
```
Open http://localhost:5176

### Re-deploy
```bash
stellar contract build
stellar contract deploy --wasm target/wasm32v1-none/release/token.wasm --source <id> --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/staking.wasm --source <id> --network testnet
# Init token (admin, decimals, name, symbol):
stellar contract invoke --id <TOKEN_ID> --source <id> --network testnet -- init \
  --admin <YOUR_ADDR> --decimal 7 --name '"Stellar Stake Token"' --symbol '"STK"'
# Init staking with token addr:
stellar contract invoke --id <STAKING_ID> --source <id> --network testnet -- init \
  --token <TOKEN_ID>
# Mint test tokens to a user:
stellar contract invoke --id <TOKEN_ID> --source <id> --network testnet -- mint \
  --to <USER_ADDR> --amount 10000000
```

> **Tip**: To grant test tokens to your demo wallet, the token admin (deployer key) must call `mint`. The frontend keeps minting admin-only for security; an open faucet would defeat the access-control demo.

---

## 🧠 Architecture: inter-contract calls

The staking contract defines a minimal `TokenInterface` trait via `#[contractclient]` so the Soroban host can invoke any SEP-41-style token from inside `stake()` / `unstake()`:

```rust
#[contractclient(name = "TokenClient")]
pub trait TokenInterface {
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn balance(env: Env, id: Address) -> i128;
}

// Inside `stake`:
let token_client = TokenClient::new(&env, &token_addr);
token_client.transfer(&user, &pool, &amount);  // <-- inter-contract call
```

The user signs a single tx that authorizes both:
1. The outer `staking::stake` call.
2. The inner `token::transfer(user → pool)` invoked sub-call.

Soroban's auth framework propagates the `require_auth()` automatically through the call stack.

---

## ✅ Submission checklist (Green Belt)

- [x] **2 deployed contracts** demonstrating inter-contract calls
- [x] **13 unit tests passing** (≥ required)
- [x] **5 contract error variants** mapped to UI
- [x] Multi-wallet support
- [x] **Mobile-responsive UI** (Tailwind, edge-to-edge on small screens)
- [x] **Live data ticker** (4 s polling)
- [x] Comprehensive README
- [x] **GitHub Actions CI** (cargo test + frontend build)
- [x] **8+ commits** in repo history
- [ ] Demo video URL (record + add link)
- [ ] Live deploy URL (Vercel/Netlify)

---

## 📜 License

MIT © Nikkunj
