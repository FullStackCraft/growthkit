import { useEffect, useState } from 'react';

const deadlineFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

export function CouponCountdown({ expiresAt, endsOn }: { expiresAt: number; endsOn: Date }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, Math.ceil((expiresAt - performance.now()) / 1000)));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function tick() {
      const remaining = Math.max(0, expiresAt - performance.now());
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining > 0) timeout = setTimeout(tick, Math.ceil(remaining % 1000 || 1000));
    }
    tick();
    return () => clearTimeout(timeout);
  }, [expiresAt]);

  const fields = [
    ['Days', Math.floor(secondsLeft / 86_400)],
    ['Hours', Math.floor(secondsLeft / 3600) % 24],
    ['Min', Math.floor(secondsLeft / 60) % 60],
    ['Sec', secondsLeft % 60],
  ] as const;

  return (
    <div className="gk-coupon-countdown">
      <span className="gk-coupon-countdown-heading">Ends in</span>
      <div className="gk-coupon-countdown-cells" role="timer" aria-live="off" aria-label="Time remaining">
        {fields.map(([label, amount]) => (
          <div className="gk-coupon-countdown-cell" data-unit={label.toLowerCase()} key={label}>
            <strong>{String(amount).padStart(2, '0')}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <time className="gk-coupon-sr" dateTime={endsOn.toISOString()}>Offer ends {deadlineFormat.format(endsOn)}.</time>
    </div>
  );
}
