// Reporting another player. There is no X Sword server to receive reports, so a report opens the player's mail app with a
// ready message to the developer's contact address (app/src/legal/config.json). Nothing is sent automatically. While the
// address is empty the report button is hidden (blocking still works).

import config from '../legal/config.json';

const contactEmail = config.contactEmail;

export const canReport = !!contactEmail;

export type ReportReason = 'name' | 'abuse' | 'cheating' | 'other';

export function reportLink(reason: ReportReason, name: string, roomCode?: string) {
  const lines = [
    'Report from X Sword',
    `Reason: ${reason}`,
    `Player name: ${name}`,
    roomCode ? `Room code: ${roomCode}` : '',
    `Time: ${new Date().toISOString()}`,
    '',
    'Add anything else that would help us here:',
  ].filter((l, i) => l || i > 3);
  return `mailto:${contactEmail}?subject=${encodeURIComponent('X Sword report')}&body=${encodeURIComponent(lines.join('\n'))}`;
}
