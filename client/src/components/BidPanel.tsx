import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Plus, Zap } from 'lucide-react';
import { formatPoints } from '../utils/formatting';

interface BidPanelProps {
  currentBid: number;
  myPurse: number;
  canBid: boolean;
  isWinning: boolean;
  isAuctionActive: boolean;
  onBid: (amount: number) => void;
}

const QUICK_INCREMENTS = [10, 25, 50];

export default function BidPanel({
  currentBid,
  myPurse,
  canBid,
  isWinning,
  isAuctionActive,
  onBid,
}: BidPanelProps) {
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleQuickBid = (increment: number) => {
    const amount = currentBid + increment;
    if (amount <= myPurse) {
      onBid(amount);
    }
  };

  const handleCustomBid = () => {
    const amount = parseInt(customAmount, 10);
    if (!isNaN(amount) && amount > currentBid && amount <= myPurse) {
      onBid(amount);
      setCustomAmount('');
      setShowCustom(false);
    }
  };

  const isDisabled = !canBid || !isAuctionActive;

  return (
    <div className="space-y-3">
      {/* Status banner */}
      {isAuctionActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={clsx(
            'text-center py-2 px-4 rounded-xl text-sm font-bold',
            isWinning
              ? 'bg-cricket-green/20 text-cricket-green border border-cricket-green/30'
              : !canBid && myPurse < currentBid + 10
              ? 'bg-danger/20 text-danger border border-danger/30'
              : 'bg-white/5 text-white/60 border border-white/10'
          )}
        >
          {isWinning
            ? '🏆 You are WINNING this bid!'
            : !canBid && myPurse < currentBid + 10
            ? '❌ Insufficient purse'
            : !isAuctionActive
            ? '⏸ Bidding not active'
            : '💰 Place your bid!'}
        </motion.div>
      )}

      {/* My purse display */}
      <div className="flex justify-between items-center px-1">
        <span className="text-white/50 text-sm">My Purse</span>
        <span className={clsx(
          'font-bold text-lg',
          myPurse < 100 ? 'text-danger' : myPurse < 300 ? 'text-yellow-400' : 'text-cricket-green'
        )}>
          {formatPoints(myPurse)}
        </span>
      </div>

      {/* Quick bid buttons */}
      <div className="grid grid-cols-3 gap-2">
        {QUICK_INCREMENTS.map(increment => {
          const bidAmount = currentBid + increment;
          const affordable = bidAmount <= myPurse;
          return (
            <motion.button
              key={increment}
              whileHover={!isDisabled && affordable ? { scale: 1.05 } : {}}
              whileTap={!isDisabled && affordable ? { scale: 0.95 } : {}}
              onClick={() => handleQuickBid(increment)}
              disabled={isDisabled || !affordable}
              className={clsx(
                'flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 font-bold transition-all text-center',
                !isDisabled && affordable
                  ? 'border-gold/50 bg-gold/10 text-gold hover:bg-gold/20 hover:border-gold cursor-pointer'
                  : 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
              )}
            >
              <Zap size={14} className="mb-1" />
              <span className="text-xs">+{increment}L</span>
              <span className="text-[10px] text-white/50">{formatPoints(bidAmount)}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Custom bid */}
      {showCustom ? (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-2"
        >
          <input
            type="number"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder={`Min ${currentBid + 10}L`}
            className="input-field text-sm"
            min={currentBid + 10}
            max={myPurse}
            onKeyDown={e => e.key === 'Enter' && handleCustomBid()}
            autoFocus
          />
          <button
            onClick={handleCustomBid}
            disabled={isDisabled}
            className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
          >
            BID
          </button>
          <button
            onClick={() => setShowCustom(false)}
            className="px-3 py-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 text-sm"
          >
            ✕
          </button>
        </motion.div>
      ) : (
        <button
          onClick={() => setShowCustom(true)}
          disabled={isDisabled}
          className={clsx(
            'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 text-white/60 text-sm font-medium transition-all',
            !isDisabled ? 'hover:border-white/40 hover:text-white hover:bg-white/5 cursor-pointer' : 'cursor-not-allowed opacity-40'
          )}
        >
          <Plus size={14} />
          Custom Amount
        </button>
      )}
    </div>
  );
}
