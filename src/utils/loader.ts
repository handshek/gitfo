export type LoaderStyle = "commit" | "hash" | "diff";

interface Loader {
  start: () => void;
  stop: (message?: string) => void;
}

export function createLoader(
  text: string,
  style: LoaderStyle = "diff",
): Loader {
  let i = 0;
  let interval: ReturnType<typeof setInterval>;

  // Define frames for each loader style
  const frames: Record<LoaderStyle, string[]> = {
    commit: ["○ ○ ○", "● ○ ○", "● ● ○", "● ● ●", "○ ● ●", "○ ○ ●", "○ ○ ○"],
    hash: (() => {
      const hexChars = "0123456789abcdef";
      return Array.from({ length: 16 }, (_, idx) => {
        const h1 = hexChars[(idx * 3) % 16];
        const h2 = hexChars[(idx * 7) % 16];
        const h3 = hexChars[(idx * 11) % 16];
        return `[${h1}${h2}${h3}]`;
      });
    })(),
    diff: ["++", "+-", "--", "-+"],
  };

  const selectedFrames = frames[style];

  return {
    start() {
      interval = setInterval(() => {
        process.stdout.write(
          `\r${selectedFrames[i % selectedFrames.length]} ${text}`,
        );
        i++;
      }, 120);
    },
    stop(message?: string) {
      clearInterval(interval);
      const finalMsg = message ?? "✔  Done";
      process.stdout.write(`\r${finalMsg}${" ".repeat(50)}\n`);
    },
  };
}
