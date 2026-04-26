import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, ExternalLink, AlertCircle } from 'lucide-react';
import { WalletBar } from './components/WalletBar';
import { Stats } from './components/Stats';
import { StakePanel, type TxStatus } from './components/StakePanel';
import {
  openWalletPicker,
  restoreWallet,
  disconnect as walletDisconnect,
} from './lib/wallet';
import {
  tokenBalance,
  staked as fetchStaked,
  pendingPoints,
  totalStaked,
  stake,
  unstake,
  claim,
} from './lib/stellar';
import { TOKEN_ID, STAKING_ID, TOKEN_SYMBOL } from './lib/config';
import { explorerContract } from './lib/format';

export default function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState<bigint>(0n);
  const [stakedAmt, setStakedAmt] = useState<bigint>(0n);
  const [points, setPoints] = useState<bigint>(0n);
  const [tvl, setTvl] = useState<bigint>(0n);
  const [status, setStatus] = useState<TxStatus>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const livePollRef = useRef<number | null>(null);

  const refreshAll = useCallback(async (addr: string | null) => {
    if (!TOKEN_ID || !STAKING_ID) return;
    try {
      const total = await totalStaked();
      setTvl(total);
      if (addr) {
        const [bal, st, pts] = await Promise.all([
          tokenBalance(addr),
          fetchStaked(addr),
          pendingPoints(addr),
        ]);
        setBalance(bal);
        setStakedAmt(st);
        setPoints(pts);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load on-chain data');
    }
  }, []);

  // Initial load + restore wallet
  useEffect(() => {
    refreshAll(null);
    (async () => {
      const a = await restoreWallet();
      if (a) {
        setAddress(a);
        refreshAll(a);
      }
    })();
  }, [refreshAll]);

  // Live points ticker (refresh every 4s while wallet connected)
  useEffect(() => {
    if (!address) return;
    if (livePollRef.current) window.clearInterval(livePollRef.current);
    livePollRef.current = window.setInterval(() => refreshAll(address), 4000);
    return () => {
      if (livePollRef.current) window.clearInterval(livePollRef.current);
    };
  }, [address, refreshAll]);

  const handleConnect = async () => {
    setError(null);
    setConnecting(true);
    try {
      const a = await openWalletPicker();
      setAddress(a);
      refreshAll(a);
    } catch (e: any) {
      if (!String(e?.message ?? '').includes('cancelled')) {
        setError(e.message ?? String(e));
      }
    } finally {
      setConnecting(false);
    }
  };

  const prettyError = (msg: string): string => {
    if (msg.includes('Error(Contract, #4)')) return 'Insufficient balance / stake.';
    if (msg.includes('Error(Contract, #5)')) return 'Amount must be positive.';
    if (msg.includes('Error(Contract, #3)')) return 'Nothing staked yet.';
    if (msg.toLowerCase().includes('user reject') || msg.toLowerCase().includes('declined'))
      return 'Transaction rejected in wallet.';
    return msg;
  };

  const wrapTx = (label: string, fn: () => Promise<{ hash: string }>) => async () => {
    if (!address) return;
    setStatus({ kind: 'pending', step: 'Awaiting signature…' });
    try {
      const { hash } = await fn();
      setStatus({ kind: 'success', hash, label });
      await refreshAll(address);
    } catch (e: any) {
      setStatus({ kind: 'error', message: prettyError(String(e?.message || e)) });
    }
  };

  const handleStake = async (amount: bigint) =>
    wrapTx(`Staked successfully`, () => stake(address!, amount))();
  const handleUnstake = async (amount: bigint) =>
    wrapTx(`Unstaked successfully`, () => unstake(address!, amount))();
  const handleClaim = async () =>
    wrapTx(`Points claimed`, () => claim(address!))();

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5 sticky top-0 backdrop-blur z-10 bg-ink/70">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-mint/10 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5 text-mint" />
            </div>
            <div className="min-w-0">
              <div className="font-bold tracking-tight truncate">{TOKEN_SYMBOL} Staking</div>
              <div className="text-xs text-white/50 truncate">Green Belt · Inter-contract demo</div>
            </div>
          </div>
          <WalletBar
            address={address}
            onConnect={handleConnect}
            onDisconnect={() => {
              walletDisconnect();
              setAddress(null);
              setBalance(0n);
              setStakedAmt(0n);
              setPoints(0n);
              setStatus({ kind: 'idle' });
            }}
            loading={connecting}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {(!TOKEN_ID || !STAKING_ID) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-200 mb-1">
              <AlertCircle className="w-4 h-4" /> Contracts not configured
            </div>
            <span className="text-amber-200/80">
              Set <code>VITE_TOKEN_ID</code> and <code>VITE_STAKING_ID</code> in <code>.env.local</code>.
            </span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-red-200 break-words">{error}</div>
          </div>
        )}

        <Stats balance={balance} staked={stakedAmt} points={points} total={tvl} />

        <div className="grid lg:grid-cols-2 gap-6">
          <StakePanel
            connected={!!address}
            balance={balance}
            staked={stakedAmt}
            status={status}
            onStake={handleStake}
            onUnstake={handleUnstake}
            onClaim={handleClaim}
          />

          <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-lg">How it works</h2>
            <ol className="space-y-3 text-sm text-white/70">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-mint/15 text-mint flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span><b>Stake</b> — your wallet signs a tx that calls the staking contract, which makes an <b>inter-contract call</b> to the token contract&apos;s <code>transfer</code> to lock your tokens into the pool.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-mint/15 text-mint flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span><b>Earn</b> — points accrue at <b>100 pts per token-second</b> (scaled). The Your Points stat updates live every 4 s.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-mint/15 text-mint flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span><b>Claim</b> settles pending points into your stored balance. <b>Unstake</b> reverses the transfer.</span>
              </li>
            </ol>
            <div className="border-t border-white/5 pt-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/40">Token</span>
                {TOKEN_ID && (
                  <a href={explorerContract(TOKEN_ID)} target="_blank" rel="noreferrer" className="font-mono text-mint hover:underline inline-flex items-center gap-1">
                    {TOKEN_ID.slice(0, 6)}…{TOKEN_ID.slice(-4)} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-white/40">Staking pool</span>
                {STAKING_ID && (
                  <a href={explorerContract(STAKING_ID)} target="_blank" rel="noreferrer" className="font-mono text-mint hover:underline inline-flex items-center gap-1">
                    {STAKING_ID.slice(0, 6)}…{STAKING_ID.slice(-4)} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-white/30 px-4">
        Soroban + StellarWalletsKit · Green Belt submission · 2 contracts, 13 tests passing
      </footer>
    </div>
  );
}
