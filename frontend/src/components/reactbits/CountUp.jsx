import React, { useEffect, useState } from 'react';

export default function CountUp({
  to = 0,
  from = 0,
  duration = 1.2,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = ''
}) {
  const [current, setCurrent] = useState(from);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      // Ease out quad
      const easeProgress = 1 - (1 - progress) * (1 - progress);
      const val = from + (to - from) * easeProgress;
      setCurrent(val);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCurrent(to);
      }
    };

    requestAnimationFrame(step);
  }, [to, from, duration]);

  return (
    <span className={`count-up ${className}`}>
      {prefix}
      {current.toFixed(decimals)}
      {suffix}
    </span>
  );
}
