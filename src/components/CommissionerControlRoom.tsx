import React, { useState } from 'react';
import { 
  CrownHostIcon, 
  GavelIcon, 
  TimerGaugeIcon, 
  CloseIcon, 
  FastForwardIcon, 
  PlayArrowIcon, 
  PauseIcon, 
  TrophyCupIcon,
  ShieldCrestIcon,
  BotsAiIcon,
  RoleBatterIcon,
  RoleBowlerIcon,
  RoleAllRounderIcon,
  RoleWicketKeeperIcon,
  PurseCoinsIcon
} from './GameIcons';
import GameButton from './GameButton';
import PlayerHeroCard from './PlayerHeroCard';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr } from '../lib/utils';
import { AlertCircle, Megaphone, ArrowRight, Check, X, ShieldAlert, Users, Layers, History, Volume2 } from 'lucide-react';
import { ServerHealthBadge } from './ServerHealthBadge';

interface Props {
  code: string;
  roomState: any;
  myUserId: string;
  myDisplayName: string;
  timeLeft: number;
  isPaused: boolean;
  activePlayerDetails: any;
  currentBid: number;
  currentBidder: string | null;
  hostAction: (action: 'pause' | 'resume' | 'skip' | 'mark_unsold' | 'relist_current') => void;
  deferCurrentPlayer: () => void;
  relistUnsoldPlayer: (playerId: string) => void;
  sendAnnouncement: (msg: string) => void;
  kickPlayer: (targetUserId: string) => void;
  updateAuctionSettings: (timer: number, unlimited: boolean) => void;
  announcements: any[];
  chatMessages: any[];
  sendChat: (msg: string, sender: string) => void;
  onNavigateResults: () => void;
}

export default function CommissionerControlRoom({
  code,
  roomState,
  myUserId,
  myDisplayName,
  timeLeft,
  isPaused,
  activePlayerDetails,
  currentBid,
  currentBidder,
  hostAction,
  deferCurrentPlayer,
  relistUnsoldPlayer,
  sendAnnouncement,
  kickPlayer,
  updateAuctionSettings,
  announcements,
  chatMessages,
  sendChat,
  onNavigateResults
}: Props) {
  const [activeBoardTab, setActiveBoardTab] = useState<'queue' | 'relisted' | 'unsold' | 'teams' | 'sold'>('queue');
  const [announcementText, setAnnouncementText] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(roomState?.bid_timer_seconds || 10);
  const [unlimitedTimer, setUnlimitedTimer] = useState(Boolean(roomState?.is_unlimited_timer));

  // Modal confirmations for destructive commissioner actions
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'unsold' | 'kick' | 'end';
    targetId?: string;
    targetName?: string;
    message?: string;
  }>({ open: false, type: 'unsold' });

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    sendAnnouncement(announcementText.trim());
    setAnnouncementText('');
  };

  const executeConfirmedAction = () => {
    if (confirmModal.type === 'unsold') {
      hostAction('mark_unsold');
    } else if (confirmModal.type === 'kick' && confirmModal.targetId) {
      kickPlayer(confirmModal.targetId);
    } else if (confirmModal.type === 'end') {
      onNavigateResults();
    }
    setConfirmModal({ open: false, type: 'unsold' });
  };

  const upcomingList = roomState?.upcoming_list || [];
  const unsoldList = roomState?.unsold_list || [];
  const relistedList = upcomingList.filter((p: any) => p.status === 'RELISTED');
  const pendingList = upcomingList.filter((p: any) => p.status === 'PENDING');
  const soldList = roomState?.sold_list || [];

  return (
    <div className="w-full flex flex-col font-sans relative">
      {/* ── Confirmation Modal ── */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-[#F59E0B]/50 rounded-[8px] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#FFB95F]">
              <ShieldAlert size={24} />
              <h3 className="font-display font-black text-lg text-white uppercase tracking-tight">
                {confirmModal.type === 'unsold' && 'Confirm Mark Unsold'}
                {confirmModal.type === 'kick' && 'Confirm Player Removal'}
                {confirmModal.type === 'end' && 'Confirm End Tournament'}
              </h3>
            </div>
            <p className="text-xs text-[#86948A] leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#1F2937]">
              <button
                type="button"
                onClick={() => setConfirmModal({ open: false, type: 'unsold' })}
                className="px-4 py-2 rounded-[4px] bg-[#1C1F29] hover:bg-[#262A34] text-xs font-mono font-bold text-[#86948A] hover:text-white transition"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={executeConfirmedAction}
                className="px-5 py-2 rounded-[4px] bg-[#EF4444] hover:bg-[#DC2626] text-xs font-display font-black text-white uppercase tracking-wider transition shadow-lg"
              >
                CONFIRM ACTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Commissioner Command Header ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#111827] border border-[#F59E0B]/30 rounded-[8px] p-4 mb-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[6px] bg-[#F59E0B]/15 border border-[#F59E0B]/40 flex items-center justify-center shadow-[inset_0_0_12px_rgba(245,158,11,0.2)]">
            <CrownHostIcon size={22} color="#F59E0B" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-[4px] bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#FFB95F] text-[10px] font-mono font-bold uppercase tracking-wider">
                AUCTION COMMISSIONER DESK
              </span>
              <span className="text-[10px] text-[#86948A] font-mono font-bold">ARENA #{code}</span>
            </div>
            <h2 className="font-display font-black text-base sm:text-lg text-white mt-0.5">
              {roomState?.room_name || `Tournament #${code}`} · <span className="text-[#10B981] font-mono text-sm">{roomState?.participants?.length || 0}/10 Franchises Active</span>
            </h2>
          </div>
        </div>

        {/* Global Timer & Settings Control Strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <ServerHealthBadge compact />
          <div className="flex items-center gap-2 bg-[#0F131C] px-3 py-1.5 rounded-[6px] border border-[#1F2937]">
            <TimerGaugeIcon size={16} color={timeLeft <= 3 && timeLeft > 0 ? '#EF4444' : '#10B981'} />
            <span className="text-[10px] text-[#86948A] font-mono uppercase font-bold">CLOCK</span>
            <span className={`text-lg font-mono font-bold ${timeLeft <= 3 && timeLeft > 0 ? 'text-[#EF4444] animate-pulse' : 'text-[#10B981]'}`}>
              {isPaused ? 'PAUSED' : timeLeft > 0 ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '--'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => hostAction(isPaused ? 'resume' : 'pause')}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-display font-bold uppercase tracking-wider border flex items-center gap-1.5 transition ${
              isPaused 
                ? 'bg-[#10B981] text-[#090D16] border-[#10B981] hover:bg-[#6FFBBE]' 
                : 'bg-[#1C1F29] text-[#DFE2EF] border-[#1F2937] hover:border-[#10B981]'
            }`}
          >
            {isPaused ? <PlayArrowIcon size={14} color="#090D16" /> : <PauseIcon size={14} color="#DFE2EF" />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmModal({
              open: true,
              type: 'end',
              message: 'Conclude this auction and finalize all franchise rosters now? Completed squads and final leaderboards will be minted.'
            })}
            className="px-3 py-1.5 rounded-[4px] bg-[#F59E0B]/15 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/30 text-[#FFB95F] text-xs font-display font-bold uppercase tracking-wider transition flex items-center gap-1"
          >
            <TrophyCupIcon size={13} color="#F59E0B" />
            <span>RESULTS</span>
          </button>
        </div>
      </div>

      {/* ── Official Commissioner Announcement Megaphone ── */}
      <form onSubmit={handleSendAnnouncement} className="mb-4 bg-[#181B25] border border-[#F59E0B]/30 rounded-[6px] p-2.5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-[4px] bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0">
          <Megaphone size={14} className="text-[#FFB95F]" />
        </div>
        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="Broadcast official commissioner bulletin to all player screens (e.g. 'Final relist round begins in 30 seconds')..."
          className="flex-1 bg-transparent border-0 text-xs text-white placeholder-[#86948A] focus:outline-none font-medium"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-[4px] bg-[#F59E0B] text-[#090D16] font-display font-black text-xs uppercase tracking-wider hover:bg-[#FFB95F] transition flex-shrink-0"
        >
          BROADCAST
        </button>
      </form>

      {/* ── Main Stage Grid: Lot Console (Left) + Queue Board & Franchises (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Live Card Stage & Decisions (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[8px] flex flex-col items-center">
            <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase tracking-wider mb-2 self-start flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" /> CURRENT LOT UNDER HAMMER
            </span>

            <PlayerHeroCard
              player={activePlayerDetails}
              statusText={
                currentBidder
                  ? `${currentBidder} AT ${formatCr(currentBid)}`
                  : (activePlayerDetails ? 'ACCEPTING BIDS' : 'WAITING FOR NEXT LOT...')
              }
            />

            {/* Leading Bidder Indicator */}
            {currentBid > 0 && currentBidder && (
              <div className="w-full mt-3 p-3 bg-[#0F131C] border border-[#1F2937] rounded-[6px] flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[#111827] border border-[#1F2937] flex items-center justify-center p-1">
                    {FRANCHISE_MAP[currentBidder]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[currentBidder].logoUrl} alt={currentBidder} className="max-h-full object-contain" />
                    ) : (
                      <span>{FRANCHISE_MAP[currentBidder]?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-[#86948A] font-mono uppercase tracking-widest block">LEADING BIDDER</span>
                    <span className="font-display font-black text-sm" style={{ color: FRANCHISE_MAP[currentBidder]?.primary }}>
                      {currentBidder}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-[#86948A] font-mono uppercase tracking-widest block">LATEST AMOUNT</span>
                  <span className="font-mono font-black text-lg text-[#10B981]">{formatCr(currentBid)}</span>
                </div>
              </div>
            )}

            {/* Commissioner Lot Decision Gavel Deck */}
            <div className="w-full mt-4 pt-3 border-t border-[#1F2937] space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#FFB95F] uppercase tracking-wider block">
                COMMISSIONER DECISION CONTROLS
              </span>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Unsold (Permanent) */}
                <button
                  type="button"
                  onClick={() => setConfirmModal({
                    open: true,
                    type: 'unsold',
                    message: `Mark ${activePlayerDetails?.player_name || 'this player'} as permanently Unsold? This player will be archived in the Unsold Pool and will not return during this tournament.`
                  })}
                  disabled={!activePlayerDetails}
                  className="p-2.5 rounded-[4px] bg-[#EF4444]/15 hover:bg-[#EF4444]/25 border border-[#EF4444]/40 text-[#FFB4AB] text-xs font-display font-bold flex flex-col items-center gap-1 transition active:scale-95 disabled:opacity-40"
                  title="Archive permanently as unsold"
                >
                  <CloseIcon size={16} color="#EF4444" />
                  <span>UNSOLD</span>
                </button>

                {/* 2. Defer (Skip 5 positions) */}
                <button
                  type="button"
                  onClick={deferCurrentPlayer}
                  disabled={!activePlayerDetails || currentBid > 0}
                  className="p-2.5 rounded-[4px] bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 border border-[#06B6D4]/40 text-[#8BE9FD] text-xs font-display font-bold flex flex-col items-center gap-1 transition active:scale-95 disabled:opacity-40"
                  title="Move card 5 positions down active queue"
                >
                  <FastForwardIcon size={16} color="#06B6D4" />
                  <span>DEFER (5x)</span>
                </button>

                {/* 3. Relist (Final Round) */}
                <button
                  type="button"
                  onClick={() => hostAction('relist_current')}
                  disabled={!activePlayerDetails || currentBid > 0}
                  className="p-2.5 rounded-[4px] bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 border border-[#F59E0B]/40 text-[#FFB95F] text-xs font-display font-bold flex flex-col items-center gap-1 transition active:scale-95 disabled:opacity-40"
                  title="Move player to accelerated final round"
                >
                  <CrownHostIcon size={16} color="#F59E0B" />
                  <span>RELIST (END)</span>
                </button>
              </div>

              {/* Timer Quick Adjustment */}
              <div className="pt-2 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#86948A] text-[10px]">TIMER:</span>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={timerSeconds}
                    onChange={(e) => setTimerSeconds(Number(e.target.value))}
                    disabled={unlimitedTimer}
                    className="w-14 bg-[#0F131C] border border-[#1F2937] rounded px-1.5 py-0.5 text-xs text-white"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-[#86948A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedTimer}
                      onChange={(e) => setUnlimitedTimer(e.target.checked)}
                    />
                    <span>Unlimited</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => updateAuctionSettings(timerSeconds, unlimitedTimer)}
                  className="px-2 py-0.5 rounded bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/30 text-[10px] font-bold"
                >
                  APPLY
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Queue Board & Franchise Management (7 cols) */}
        <div className="lg:col-span-7 bg-[#111827] border border-[#1F2937] rounded-[8px] p-4 flex flex-col justify-between">
          <div>
            {/* Board Navigation Tabs */}
            <div className="flex border-b border-[#1F2937] pb-2 mb-3 gap-2 overflow-x-auto text-xs font-display font-bold">
              {[
                { id: 'queue', label: `Next 5 in Queue (${pendingList.length})` },
                { id: 'relisted', label: `Final Round (${relistedList.length})` },
                { id: 'unsold', label: `Unsold Pool (${unsoldList.length})` },
                { id: 'teams', label: 'Franchise Balance' },
                { id: 'sold', label: `Sold Ledger (${soldList.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveBoardTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-[4px] whitespace-nowrap uppercase tracking-wider transition ${
                    activeBoardTab === tab.id
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40'
                      : 'text-[#86948A] hover:text-white bg-[#0F131C]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Next in Queue */}
            {activeBoardTab === 'queue' && (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {pendingList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#86948A] italic">
                    No regular pending cards remaining. Active lot is moving to final relisted round!
                  </div>
                ) : (
                  pendingList.slice(0, 8).map((p: any, idx: number) => (
                    <div key={p.player_id} className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-[3px] bg-[#1C1F29] text-[10px] font-mono font-bold text-[#86948A] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-display font-bold text-xs text-white">{p.player_name}</div>
                          <div className="text-[10px] text-[#86948A] font-mono">
                            {p.primary_role} · {p.country} · {p.player_status} · {p.game_points} PTS
                          </div>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-xs text-[#10B981]">
                        {formatCr(p.base_price_lakhs)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: Final Relisted Round */}
            {activeBoardTab === 'relisted' && (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                <p className="text-[11px] text-[#86948A] mb-2 italic">
                  Players deferred to the accelerated final round. They will come under hammer after all pending cards finish.
                </p>
                {relistedList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#86948A] italic">
                    No players in final relist pool.
                  </div>
                ) : (
                  relistedList.map((p: any, idx: number) => (
                    <div key={p.player_id} className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#F59E0B]/30 flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-xs text-white">{p.player_name}</div>
                        <div className="text-[10px] text-[#FFB95F] font-mono">
                          Final Round · Base: {formatCr(p.base_price_lakhs)}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#F59E0B]/15 text-[#FFB95F] text-[9px] font-mono font-bold">
                        FINAL LOT
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: Unsold Archive Pool */}
            {activeBoardTab === 'unsold' && (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                <p className="text-[11px] text-[#86948A] mb-2 italic">
                  Permanently unsold cards. Commissioner can optionally resurrect any player into the final round.
                </p>
                {unsoldList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#86948A] italic">
                    No unsold players yet.
                  </div>
                ) : (
                  unsoldList.map((p: any) => (
                    <div key={p.player_id} className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-xs text-[#FFB4AB]">{p.player_name}</div>
                        <div className="text-[10px] text-[#86948A] font-mono">
                          {p.primary_role} · {p.country} · Base: {formatCr(p.base_price_lakhs)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => relistUnsoldPlayer(p.player_id)}
                        className="px-2.5 py-1 rounded-[3px] bg-[#06B6D4]/15 hover:bg-[#06B6D4]/30 border border-[#06B6D4]/40 text-[#8BE9FD] text-[10px] font-mono font-bold transition"
                        title="Resurrect into Final Round"
                      >
                        + RELIST TO FINAL
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: Franchise Balance & Team Management */}
            {activeBoardTab === 'teams' && (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {ALL_FRANCHISES.map(team => {
                  const participant = roomState?.participants?.find((p: any) => p.franchise_id === team.id);
                  const squad = participant?.squad || [];
                  const osCount = squad.filter((s: any) => s.status === 'OS').length;
                  const batters = squad.filter((s: any) => s.primary_role === 'Batter').length;
                  const bowlers = squad.filter((s: any) => s.primary_role === 'Bowler').length;
                  const allRounders = squad.filter((s: any) => s.primary_role === 'All-Rounder').length;
                  const wks = squad.filter((s: any) => s.primary_role === 'Wicket-Keeper').length;

                  return (
                    <div key={team.id} className="p-3 rounded-[6px] bg-[#0F131C] border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[4px] bg-[#111827] border border-[#1F2937] flex items-center justify-center p-1">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.id} className="max-h-full object-contain" />
                          ) : (
                            <span>{team.emoji}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-black text-sm" style={{ color: team.primary }}>{team.id}</span>
                            <span className="text-[10px] text-[#86948A]">
                              {participant ? (participant.is_ai ? '🤖 Arena Bot' : participant.display_name) : 'Vacant Slot'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#86948A] font-mono mt-0.5">
                            Roster: <b className="text-white">{squad.length}/{roomState?.max_squad_size || 10}</b> · OS: <b className="text-[#FFB95F]">{osCount}/4</b> · Bat:{batters} Bowl:{bowlers} AR:{allRounders} WK:{wks}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="font-mono text-xs font-bold text-[#10B981]">
                            {formatCr(participant?.purse_remaining_lakhs ?? roomState?.starting_purse_lakhs ?? 12000)}
                          </div>
                          <div className="text-[9px] text-[#86948A] font-mono">Purse Left</div>
                        </div>

                        {participant && !participant.is_ai && (
                          <button
                            type="button"
                            onClick={() => setConfirmModal({
                              open: true,
                              type: 'kick',
                              targetId: participant.user_id,
                              targetName: participant.display_name,
                              message: `Remove ${participant.display_name} from ${team.id}? An AI bot will immediately assume control of this franchise, preserving its acquired squad and budget.`
                            })}
                            className="px-2 py-1 rounded-[3px] border border-[#EF4444]/40 hover:bg-[#EF4444]/20 text-[#FFB4AB] text-[9px] font-mono font-bold transition"
                          >
                            KICK
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 5: Sold Ledger */}
            {activeBoardTab === 'sold' && (
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {soldList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#86948A] italic">
                    No players sold yet.
                  </div>
                ) : (
                  soldList.map((s: any) => (
                    <div key={s.id} className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-between">
                      <div>
                        <div className="font-display font-bold text-xs text-white">{s.player_name}</div>
                        <div className="text-[10px] text-[#86948A] font-mono">
                          {s.primary_role} · Sold to <b style={{ color: FRANCHISE_MAP[s.franchise_id]?.primary }}>{s.franchise_id}</b>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-xs text-[#10B981]">
                        {formatCr(s.sold_price_lakhs)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
