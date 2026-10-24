export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isChristmasDay: boolean;
  targetYear: number;
}

export function getNextChristmasDate(currentDate: Date = new Date()): { targetDate: Date; isChristmasDay: boolean; targetYear: number } {
  const year = currentDate.getFullYear();
  // Christmas Day begins at 00:00:00 on Dec 25
  const christmasThisYear = new Date(year, 11, 25, 0, 0, 0, 0); // Month is 0-indexed (11 = Dec)
  const boxingDayThisYear = new Date(year, 11, 26, 0, 0, 0, 0);

  // If today is Dec 25
  if (currentDate >= christmasThisYear && currentDate < boxingDayThisYear) {
    return {
      targetDate: christmasThisYear,
      isChristmasDay: true,
      targetYear: year,
    };
  }

  // If already past Dec 25 of this year, count down to next year's Christmas!
  if (currentDate >= boxingDayThisYear) {
    return {
      targetDate: new Date(year + 1, 11, 25, 0, 0, 0, 0),
      isChristmasDay: false,
      targetYear: year + 1,
    };
  }

  // Otherwise, Christmas is upcoming this year
  return {
    targetDate: christmasThisYear,
    isChristmasDay: false,
    targetYear: year,
  };
}

export function calculateChristmasCountdown(now: Date = new Date()): CountdownResult {
  const { targetDate, isChristmasDay, targetYear } = getNextChristmasDate(now);

  if (isChristmasDay) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isChristmasDay: true,
      targetYear,
    };
  }

  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isChristmasDay: false,
    targetYear,
  };
}
