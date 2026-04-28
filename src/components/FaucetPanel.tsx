import { Droplets, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { fmtTok, explorerTx } from '../lib/format';

export type FaucetStatus =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; hash: string }
  | { kind: 'error'; message: string };

interface Props {
  connected: boolean;
  claimed: boolean;
  status: FaucetStatus;
  onMint: () => void;
}

const FAUCET_AMOUNT = 10_000_000_000n; // 1,000 STK with 7 decimals

export function FaucetPanel({ connected, claimed, status, onMint }: Props) {
  const pending = status.kind === 'pending';

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
          <Droplets className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h2 className="font-bold text-lg">Token Faucet</h2>
          <p className="text-xs text-white/50">
            Get {fmtTok(FAUCET_AMOUNT)} to try staking — one claim per wallet
          </p>
        </div>
      </div>

      <button
        onClick={onMint}
        disabled={!connected || claimed || pending}
        className="btn btn-primary w-full"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Minting…
          </>
        ) : claimed ? (
          <>
            <CheckCircle2 className="w-4 h-4" /> Already claimed
          </>
        ) : !connected ? (
          'Connect wallet first'
        ) : (
          <>
            <Droplets className="w-4 h-4" /> Claim {fmtTok(FAUCET_AMOUNT)}
          </>
        )}
      </button>

      {status.kind === 'success' && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3 text-sm">
          <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4" /> {fmtTok(FAUCET_AMOUNT)} minted!
          </div>
          <a
            href={explorerTx(status.hash)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-teal-400/80 hover:underline inline-flex items-center gap-1"
          >
            View tx <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
      {status.kind === 'error' && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <AlertCircle className="w-4 h-4" /> Faucet failed
          </div>
          <div className="text-white/70 text-xs break-words">{status.message}</div>
        </div>
      )}
    </div>
  );
}
