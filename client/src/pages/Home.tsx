import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Check,
  ChevronLeft,
  CircleHelp,
  Eraser,
  Grid2X2,
  Home as HomeIcon,
  Lightbulb,
  Lock,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { getLevel, getStage, LEVELS, STAGES_PER_LEVEL, totalStageCount } from "@/lib/content";
import { cellKey, createCrosswordBoard, type CrosswordBoard } from "@/lib/crosswordEngine";
import { adModeLabel, showInterstitialAd, showRewardedHintAd } from "@/lib/ads";
import {
  completedCount,
  completedLevelCount,
  isStageComplete,
  isStageUnlocked,
  loadProgress,
  markStageComplete,
  saveProgress,
  type SavedProgress,
} from "@/lib/storage";

const ARABIC_KEYS = "ابتثجحخدذرزسشصضطظعغفقكلمنهويءةأإآىؤئ".split("");
type Screen = "splash" | "home" | "levels" | "stages" | "game" | "result";

type RouteState = { level: number; stage: number };

function nextPlayable(progress: SavedProgress): RouteState {
  for (let level = 1; level <= LEVELS.length; level += 1) {
    for (let stage = 1; stage <= STAGES_PER_LEVEL; stage += 1) {
      if (isStageUnlocked(progress, level, stage) && !isStageComplete(progress, level, stage)) return { level, stage };
    }
  }
  return { level: 1, stage: 1 };
}

function BrandMark() {
  return <div className="brand-mark" aria-hidden="true"><span /><span /><span /><span /></div>;
}

function Brand({ onClick, compact = false }: { onClick?: () => void; compact?: boolean }) {
  return <button className={`brand ${compact ? "compact" : ""}`} onClick={onClick} aria-label="الرئيسية"><BrandMark /><span className="brand-copy"><strong>شَبَكة</strong><small>كلمات عربية</small></span></button>;
}

function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.max(0, Math.min(1, value)) * circumference;
  return <div className="progress-ring" style={{ width: size, height: size } as CSSProperties}><svg viewBox={`0 0 ${size} ${size}`}><circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} /><circle className="progress-ring-value" cx={size / 2} cy={size / 2} r={radius} style={{ strokeDasharray: `${dash} ${circumference}` }} /></svg><span>{Math.round(value * 100)}%</span></div>;
}

function ScreenHeader({ title, subtitle, onBack, onHome, progress, showSettings = false }: { title: string; subtitle?: string; onBack?: () => void; onHome?: () => void; progress: SavedProgress; showSettings?: boolean }) {
  return <header className="screen-header"><div className="screen-header-inner"><div className="screen-header-side"><button className="header-back" onClick={onBack ?? onHome} aria-label="رجوع"><ArrowRight size={19} /></button><div className="header-title"><strong>{title}</strong>{subtitle ? <small>{subtitle}</small> : null}</div></div><Brand compact /><div className="screen-header-side left"><span className="header-progress-label">{completedCount(progress)} / {totalStageCount()}</span><ProgressRing value={completedCount(progress) / totalStageCount()} size={42} />{showSettings ? <button className="icon-button" aria-label="الإعدادات"><Settings2 size={17} /></button> : null}</div></div></header>;
}

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onDone, 2400); return () => window.clearTimeout(timer); }, [onDone]);
  return <main className="splash-screen"><div className="splash-pattern" /><div className="splash-center"><div className="splash-logo"><BrandMark /></div><h1>شَبَكة</h1><p>كلمات متقاطعة عربية</p><div className="splash-divider" /><span>كل حرف يقودك إلى كلمة.</span></div><div className="splash-footer">تجربة عربية أصيلة · تعمل دون إنترنت</div></main>;
}

function HomeScreen({ progress, onContinue, onLevels, onStats, onSettings }: { progress: SavedProgress; onContinue: () => void; onLevels: () => void; onStats: () => void; onSettings: () => void }) {
  const done = completedCount(progress);
  const next = nextPlayable(progress);
  const level = getLevel(next.level);
  return <main className="screen home-screen"><section className="home-welcome"><div><div className="eyebrow-pill"><Sparkles size={14} /> تجربة عربية أصيلة</div><h1>كل حرف يقودك<br /><em>إلى كلمة.</em></h1><p>حلّ، تعلّم، وتقدّم في 500 مرحلة من الكلمات العربية المختارة بعناية.</p><button className="primary-button hero-button" onClick={onContinue}><Play size={18} fill="currentColor" /> {done ? "تابع اللعب" : "ابدأ رحلتك"}<ArrowLeft size={17} /></button></div><div className="home-illustration"><div className="art-label">مفردات عربية <span>01</span></div><div className="art-grid">{"لغةعلمحرفنورفكرقلمأملسؤالبيت".split("").map((char, index) => <span key={`${char}-${index}`} className={[1, 2, 7, 12, 17, 22, 27].includes(index) ? "art-active" : ""}>{char}</span>)}</div><div className="art-quote">«الكلمة<br />تفتح بابًا»</div><div className="art-stamp"><Trophy size={16} /><b>500<small>مرحلة</small></b></div></div></section><section className="home-stats"><div className="stat-card"><Grid2X2 size={19} /><b>{done}</b><span>مرحلة مكتملة</span></div><div className="stat-card"><Award size={19} /><b>{completedLevelCount(progress)}</b><span>مستويات مكتملة</span></div><div className="stat-card wide"><div><b>{Math.round((done / totalStageCount()) * 100)}%</b><span>نسبة التقدم الكلية</span></div><ProgressRing value={done / totalStageCount()} /></div></section><section className="quick-actions"><button onClick={onLevels}><BookOpen size={20} /><span><b>المستويات</b><small>اختر رحلتك</small></span><ChevronLeft size={17} /></button><button onClick={onStats}><BarChart3 size={20} /><span><b>الإحصائيات</b><small>راجع إنجازك</small></span><ChevronLeft size={17} /></button><button onClick={onSettings}><Settings2 size={20} /><span><b>الإعدادات</b><small>تفضيلات التطبيق</small></span><ChevronLeft size={17} /></button></section><p className="local-note"><Zap size={14} /> تقدمك محفوظ محليًا على هذا الجهاز فقط · {adModeLabel()}</p></main>;
}

function LevelCard({ level, progress, onSelect }: { level: (typeof LEVELS)[number]; progress: SavedProgress; onSelect: () => void }) {
  const completed = Array.from({ length: STAGES_PER_LEVEL }, (_, index) => index + 1).filter((stage) => isStageComplete(progress, level.number, stage)).length;
  const unlocked = isStageUnlocked(progress, level.number, 1);
  return <button className={`level-card ${unlocked ? "" : "is-locked"}`} onClick={onSelect} disabled={!unlocked} style={{ "--level-accent": level.accent } as CSSProperties}><div className="level-card-top"><span className="level-number">{String(level.number).padStart(2, "0")}</span>{unlocked ? <ChevronLeft size={17} /> : <Lock size={15} />}</div><div className="level-card-copy"><strong>{level.title}</strong><span>{level.subtitle}</span></div><div className="level-card-footer"><div className="mini-progress"><i style={{ width: `${(completed / STAGES_PER_LEVEL) * 100}%` }} /></div><small>{completed}/50</small></div></button>;
}

function LevelSelectionScreen({ progress, onBack, onSelect }: { progress: SavedProgress; onBack: () => void; onSelect: (level: number) => void }) {
  return <main className="screen selection-screen"><ScreenHeader title="اختر مستواك" subtitle="رحلة من 10 مستويات" onBack={onBack} progress={progress} /><div className="selection-content"><div className="selection-intro"><div><span className="eyebrow">رحلة التقدم</span><h1>اختر مستواك</h1><p>كل مستوى يفتح عالمًا جديدًا من المفردات، ومع كل خطوة يزداد التحدي.</p></div><span className="selection-count">10 مستويات · 50 مرحلة لكل مستوى</span></div><div className="levels-grid">{LEVELS.map((level) => <LevelCard key={level.number} level={level} progress={progress} onSelect={() => onSelect(level.number)} />)}</div></div></main>;
}

function StageSelectionScreen({ levelNumber, progress, onBack, onSelect }: { levelNumber: number; progress: SavedProgress; onBack: () => void; onSelect: (stage: number) => void }) {
  const level = getLevel(levelNumber);
  return <main className="screen selection-screen"><ScreenHeader title={`المستوى ${levelNumber}`} subtitle={level.title} onBack={onBack} progress={progress} /><div className="selection-content stage-selection"><div className="stage-hero" style={{ "--level-accent": level.accent } as CSSProperties}><div><span className="eyebrow">{level.theme}</span><h1>{level.title}</h1><p>{level.subtitle} · خمسون مرحلة بتدرج واضح.</p></div><div className="stage-level-number">{String(levelNumber).padStart(2, "0")}</div></div><div className="stage-selection-heading"><div><span className="eyebrow">التقدم في المستوى</span><h2>اختر المرحلة</h2></div><span>{Array.from({ length: STAGES_PER_LEVEL }, (_, index) => index + 1).filter((stage) => isStageComplete(progress, levelNumber, stage)).length} / 50 مكتملة</span></div><div className="stage-grid">{level.stages.map((stage) => { const complete = isStageComplete(progress, levelNumber, stage.number); const unlocked = isStageUnlocked(progress, levelNumber, stage.number); return <button key={stage.id} className={`stage-chip ${complete ? "is-complete" : ""} ${!unlocked ? "is-locked" : ""}`} disabled={!unlocked} onClick={() => onSelect(stage.number)}>{complete ? <Check size={15} strokeWidth={3} /> : !unlocked ? <Lock size={12} /> : String(stage.number).padStart(2, "0")}</button>; })}</div></div></main>;
}

function CrosswordBoardView({ board, answers, selectedKey, checked, onSelectCell }: { board: CrosswordBoard; answers: Record<string, string>; selectedKey: string; checked: boolean; onSelectCell: (key: string) => void }) {
  const map = new Map(board.cells.map((cell) => [cellKey(cell.x, cell.y), cell]));
  return <div className="board-shell"><div className="crossword-board" style={{ gridTemplateColumns: `repeat(${board.width}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${board.height}, minmax(0, 1fr))`, "--board-ratio": `${board.width} / ${board.height}` } as CSSProperties}>{Array.from({ length: board.width * board.height }, (_, index) => { const x = index % board.width; const y = Math.floor(index / board.width); const key = cellKey(x, y); const cell = map.get(key); if (!cell) return <span className="board-blank" key={key} />; const value = answers[key] ?? ""; const correct = value && value === cell.char; return <button key={key} className={`board-cell ${selectedKey === key ? "is-selected" : ""} ${checked && value && !correct ? "is-wrong" : ""} ${checked && correct ? "is-correct" : ""}`} onClick={() => onSelectCell(key)}>{cell.number ? <small>{cell.number}</small> : null}<b>{value}</b></button>; })}</div></div>;
}

function GameScreen({ levelNumber, stageNumber, progress, onBack, onProgress, onResult }: { levelNumber: number; stageNumber: number; progress: SavedProgress; onBack: () => void; onProgress: (progress: SavedProgress) => void; onResult: () => void }) {
  const stage = getStage(levelNumber, stageNumber);
  const level = getLevel(levelNumber);
  const board = useMemo(() => createCrosswordBoard(stage.entries), [stage.id]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = useState(() => board.cells[0] ? cellKey(board.cells[0].x, board.cells[0].y) : "");
  const [selectedEntryId, setSelectedEntryId] = useState(board.entries[0]?.id ?? "");
  const [checked, setChecked] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const activeEntry = board.entries.find((entry) => entry.id === selectedEntryId) ?? board.entries[0];

  useEffect(() => { setAnswers({}); setChecked(false); setHintsUsed(0); setSelectedKey(board.cells[0] ? cellKey(board.cells[0].x, board.cells[0].y) : ""); setSelectedEntryId(board.entries[0]?.id ?? ""); }, [board, stage.id]);
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(null), 2800); return () => window.clearTimeout(timer); }, [notice]);

  const selectCell = (key: string) => { const cell = board.cells.find((candidate) => cellKey(candidate.x, candidate.y) === key); if (!cell) return; const currentIndex = cell.entryIds.indexOf(selectedEntryId); const id = currentIndex >= 0 && cell.entryIds.length > 1 ? cell.entryIds[(currentIndex + 1) % cell.entryIds.length] : cell.entryIds[0]; setSelectedKey(key); setSelectedEntryId(id); };
  const moveNext = () => { if (!activeEntry) return; const index = activeEntry.cells.findIndex((cell) => cellKey(cell.x, cell.y) === selectedKey); const next = activeEntry.cells[(index + 1) % activeEntry.cells.length]; setSelectedKey(cellKey(next.x, next.y)); };
  const enterLetter = (letter: string) => { if (!selectedKey) return; setAnswers((previous) => ({ ...previous, [selectedKey]: letter })); setChecked(false); moveNext(); };
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Backspace" || event.key === "Delete") setAnswers((previous) => ({ ...previous, [selectedKey]: "" })); else if (event.key.length === 1 && ARABIC_KEYS.includes(event.key)) enterLetter(event.key); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); });

  const checkStage = async () => { const solved = board.cells.every((cell) => answers[cellKey(cell.x, cell.y)] === cell.char); setChecked(true); if (!solved) { setNotice("بعض الحروف تحتاج إلى مراجعة."); return; } const updated = markStageComplete(progress, levelNumber, stageNumber, hintsUsed); onProgress(updated); await showInterstitialAd(); onResult(); };
  const useHint = async () => { const target = activeEntry?.cells.find((cell) => answers[cellKey(cell.x, cell.y)] !== cell.char); if (!target) { setNotice("الكلمة الحالية مكتملة."); return; } if (progress.hints > 0) { onProgress({ ...progress, hints: progress.hints - 1 }); setAnswers((previous) => ({ ...previous, [cellKey(target.x, target.y)]: target.char })); setHintsUsed((value) => value + 1); setSelectedKey(cellKey(target.x, target.y)); return; } const rewarded = await showRewardedHintAd(); if (rewarded) setAnswers((previous) => ({ ...previous, [cellKey(target.x, target.y)]: target.char })); else setNotice("لا توجد تلميحات مجانية حاليًا."); };
  const reset = () => { setAnswers({}); setChecked(false); setHintsUsed(0); setNotice("بدأت المحاولة من جديد."); };
  const filled = Object.values(answers).filter(Boolean).length;
  const progressPercent = board.cells.length ? Math.round((filled / board.cells.length) * 100) : 0;

  return <main className="game-screen"><div className="game-topbar"><button className="header-back" onClick={onBack} aria-label="رجوع"><ArrowRight size={19} /></button><div className="game-title"><strong>{stage.title}</strong><small>المستوى {levelNumber} · {level.title}</small></div><div className="game-topbar-meta"><span>{progressPercent}%</span><div className="game-progress"><i style={{ width: `${progressPercent}%` }} /></div><span className="hint-balance"><Lightbulb size={15} fill="currentColor" /> {progress.hints}</span></div></div><div className="game-content"><section className="clue-card"><span className="eyebrow">تعريف الكلمة</span><strong>{activeEntry?.clue ?? "اختر كلمة من الشبكة"}</strong><span className="clue-length">{activeEntry?.word.length ?? 0} أحرف · {activeEntry?.category ?? ""}</span></section><div className="game-board-area"><CrosswordBoardView board={board} answers={answers} selectedKey={selectedKey} checked={checked} onSelectCell={selectCell} /></div><div className="game-keyboard-area"><div className="arabic-keyboard">{ARABIC_KEYS.map((key) => <button key={key} onClick={() => enterLetter(key)}>{key}</button>)}<button className="keyboard-delete" onClick={() => setAnswers((previous) => ({ ...previous, [selectedKey]: "" }))}><Eraser size={18} /></button></div><div className="game-controls"><button className="secondary-button" onClick={reset}><RotateCcw size={16} /> إعادة المحاولة</button><button className="hint-button" onClick={useHint}><Lightbulb size={16} /> تلميح <small>{progress.hints}</small></button><button className="primary-button" onClick={checkStage}><Check size={17} strokeWidth={3} /> إكمال المرحلة</button></div></div></div>{notice ? <div className="notice error" role="status"><CircleHelp size={17} /> {notice}<button onClick={() => setNotice(null)} aria-label="إغلاق"><X size={15} /></button></div> : null}</main>;
}

function ResultScreen({ levelNumber, stageNumber, progress, onHome, onStages, onNext }: { levelNumber: number; stageNumber: number; progress: SavedProgress; onHome: () => void; onStages: () => void; onNext: () => void }) {
  const level = getLevel(levelNumber);
  const isLast = levelNumber === LEVELS.length && stageNumber === STAGES_PER_LEVEL;
  return <main className="result-screen"><div className="result-card"><div className="result-confetti"><span /><span /><span /><span /><span /></div><div className="result-icon"><Trophy size={30} /></div><span className="eyebrow">أحسنت، إجابة صحيحة</span><h1>أكملت المرحلة!</h1><p>المرحلة {stageNumber} من {level.title} أُضيفت إلى تقدمك المحفوظ.</p><div className="result-stats"><div><b>{completedCount(progress)}</b><span>مرحلة مكتملة</span></div><div><b>{completedLevelCount(progress)}</b><span>مستويات مكتملة</span></div><div><b>{progress.hints}</b><span>تلميح متبقٍ</span></div></div><div className="result-actions"><button className="primary-button" onClick={onNext} disabled={isLast}>{isLast ? "أنهيت كل المراحل" : "المرحلة التالية"}<ArrowLeft size={17} /></button><button className="secondary-button" onClick={onStages}>اختر مرحلة أخرى</button><button className="text-button" onClick={onHome}><HomeIcon size={16} /> الرئيسية</button></div></div></main>;
}

export default function Home() {
  const [progress, setProgress] = useState<SavedProgress>(() => loadProgress());
  const [screen, setScreen] = useState<Screen>("splash");
  const [route, setRoute] = useState<RouteState>(() => nextPlayable(loadProgress()));
  const updateProgress = (next: SavedProgress) => { setProgress(next); saveProgress(next); };
  const openGame = (level: number, stage: number) => { setRoute({ level, stage }); setScreen("game"); };
  const nextStage = () => { if (route.stage < STAGES_PER_LEVEL) openGame(route.level, route.stage + 1); else if (route.level < LEVELS.length) openGame(route.level + 1, 1); else setScreen("home"); };
  const goHome = () => setScreen("home");
  const goLevels = () => setScreen("levels");
  const refresh = () => setProgress(loadProgress());
  useEffect(() => { window.addEventListener("crosswords-progress-updated", refresh); return () => window.removeEventListener("crosswords-progress-updated", refresh); }, []);

  if (screen === "splash") return <div dir="rtl"><SplashScreen onDone={() => setScreen("home")} /></div>;
  if (screen === "home") return <div className="app-shell" dir="rtl"><HomeScreen progress={progress} onContinue={() => openGame(route.level, route.stage)} onLevels={goLevels} onStats={goLevels} onSettings={goLevels} /></div>;
  if (screen === "levels") return <div className="app-shell" dir="rtl"><LevelSelectionScreen progress={progress} onBack={goHome} onSelect={(level) => { setRoute({ level, stage: 1 }); setScreen("stages"); }} /></div>;
  if (screen === "stages") return <div className="app-shell" dir="rtl"><StageSelectionScreen levelNumber={route.level} progress={progress} onBack={goLevels} onSelect={(stage) => openGame(route.level, stage)} /></div>;
  if (screen === "result") return <div className="app-shell" dir="rtl"><ResultScreen levelNumber={route.level} stageNumber={route.stage} progress={progress} onHome={goHome} onStages={() => setScreen("stages")} onNext={nextStage} /></div>;
  return <div className="app-shell" dir="rtl"><GameScreen levelNumber={route.level} stageNumber={route.stage} progress={progress} onBack={() => setScreen("stages")} onProgress={updateProgress} onResult={() => setScreen("result")} /></div>;
}
